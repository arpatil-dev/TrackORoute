import React, { useState, useRef, useEffect } from 'react';
import { Platform, AppState, View, Text, Button, Switch, StyleSheet, Alert, Modal, TextInput, TouchableOpacity, Dimensions, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { requestLocationPermissions, startLocationUpdates, stopLocationUpdates } from '../utils/location';
import { requestBackgroundLocationPermissions, startBackgroundLocationUpdates ,stopBackgroundLocationUpdates} from '../utils/backgroundLocation';
import api from '../utils/api';
import { storeTripId, insertLocation, getUnsentLocations, markLocationsAsSent, initDB, clearLocations, setTrackingMode, getTrackingMode } from '../utils/storage';

export default function TripTrackingScreen({ token }) {
  // Track app state for foreground/background transitions
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      // When app comes to foreground and trip is active, fetch all locations from backend
      if (nextAppState === 'active' && tracking && tripId) {
        try {
          const res = await api.get(`/trips/${tripId}/locations`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          // Assuming backend returns array of locations [{ latitude, longitude, timestamp }]
          setLiveLocations(res.data.locations.map(loc => ({ latitude: loc.latitude, longitude: loc.longitude })));
          setLocationLogs(res.data.locations.map(loc => ({ latitude: loc.latitude, longitude: loc.longitude, timestamp: loc.timestamp, sent: true })));
        } catch (err) {
          console.error('Failed to fetch trip locations:', err);
        }
      }
    });
    return () => subscription.remove();
  }, [tracking, tripId, token]);
  
  /* State for trip tracking */
  const [tracking, setTracking] = useState(false);

  /* State for trip details */
  const [tripName, setTripName] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [inputTripName, setInputTripName] = useState('');

  /* State for location data */
  const locationSubscription = useRef(null);
  const [locationLogs, setLocationLogs] = useState([]);
  const [liveLocations, setLiveLocations] = useState([]);
  const [tripId, setTripId] = useState(null);
  
  /* Loading states */
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  /* Modal handlers */
  const handleCheckIn = () => {
    setModalVisible(true);
  };

  // State to manage tracking mode: 'live', 'batch', 'sendOnCheckout', 'robustBatch'
  const [trackingMode, setTrackingModeState] = useState('live');

  // On mount, load tracking mode from AsyncStorage
  useEffect(() => {
    (async () => {
      const mode = await getTrackingMode();
      setTrackingModeState(mode);
    })();
  }, []);

  // When user selects a mode, update both local state and AsyncStorage
  const handleModeChange = async (mode) => {
    setTrackingModeState(mode);
    await setTrackingMode(mode);
  };

  /* Start trip with given name */
  const startTripWithName = async () => {
    if (!inputTripName.trim()) {
      Alert.alert('Error', 'Trip name cannot be empty');
      return;
    }
    setModalVisible(false);
    setTripName(inputTripName.trim());
    setInputTripName('');
    setCheckingIn(true);
    try {
      // Platform-specific location permission and tracking logic
      if (Platform.OS === 'android') {
        await requestLocationPermissions();
        await requestBackgroundLocationPermissions();
      } else {
        await requestLocationPermissions();
      }

      // Start trip in backend with Bearer token and tripName
      const res = await api.post('/trips/start', { "tripName": inputTripName.trim() }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Trip started successfully, save tripId
      setTripId(res.data.data.tripId);
      storeTripId(res.data.data.tripId);

      // Start tracking based on selected mode
      if (trackingMode === 'batch') {
        console.log('Batch mode selected');
        locationSubscription.current = await startLocationUpdates(async (location) => {
          try {
            await insertLocation(location.latitude, location.longitude, location.timestamp);
            setLocationLogs((prev) => [
              { ...location, sent: false },
              ...prev
            ]);
            setLiveLocations((prev) => [...prev, { latitude: location.latitude, longitude: location.longitude }]);
            // Batch upload logic as before
            const batch = await getUnsentLocations(10);
            if (batch && batch.length === 10) {
              try {
                await api.post(`/trips/${res.data.data.tripId}/locations/batch`, { locations: batch }, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                await markLocationsAsSent(batch.map(loc => loc.id));
                setLocationLogs((prev) => prev.map(log => batch.find(b => b.id === log.id) ? { ...log, sent: true } : log));
                console.log('Batch sent and marked as sent');
              } catch (err) {
                setLocationLogs((prev) => prev.map(log => batch.find(b => b.id === log.id) ? { ...log, error: err.message } : log));
              }
            }
          } catch (err) {
            console.error('Error in batch mode callback:', err);
          }
        });
      } else if (trackingMode === 'robustBatch') {
        // Robust batch mode: only collect points locally, sending/retry handled in backgroundLocation.js
        console.log('Robust Batch mode selected');
        locationSubscription.current = await startLocationUpdates(async (location) => {
          try {
            await insertLocation(location.latitude, location.longitude, location.timestamp);
            setLocationLogs((prev) => [
              { ...location, sent: false },
              ...prev
            ]);
            setLiveLocations((prev) => [...prev, { latitude: location.latitude, longitude: location.longitude }]);
            // No batch sending here; handled by backgroundLocation.js robustBatchSendLoop
          } catch (err) {
            setLocationLogs((prev) => [
              { ...location, sent: false, error: err.message },
              ...prev
            ]);
          }
        });
      } else if (trackingMode === 'sendOnCheckout') {
        // Save all points locally, send only on checkout
        locationSubscription.current = await startLocationUpdates(async (location) => {
          try {
            await insertLocation(location.latitude, location.longitude, location.timestamp);
            setLocationLogs((prev) => [
              { ...location, sent: false },
              ...prev
            ]);
            setLiveLocations((prev) => [...prev, { latitude: location.latitude, longitude: location.longitude }]);
          } catch (err) {
            setLocationLogs((prev) => [
              { ...location, sent: false, error: err.message },
              ...prev
            ]);
          }
        });
      } else {
        console.log('Live mode selected');
        locationSubscription.current = await startLocationUpdates(async (location) => {
          try {
            await api.post(`/trips/${res.data.data.tripId}/locations`, { locations: [location] }, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setLocationLogs((prev) => [
              { ...location, sent: true },
              ...prev
            ]);
            setLiveLocations((prev) => [...prev, { latitude: location.latitude, longitude: location.longitude }]);
          } catch (err) {
            setLocationLogs((prev) => [
              { ...location, sent: false, error: err.message },
              ...prev
            ]);
          }
        });
      }

      // Only start background location updates on Android
      if (Platform.OS === 'android') {
        await startBackgroundLocationUpdates();
        console.log('Background location updates started on Android');
      }

      setTracking(true);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not start trip or get location permission');
    } finally {
      setCheckingIn(false);
    }
  };

  /* Handle trip checkout */
  const handleCheckOut = async () => {
    setCheckingOut(true);
    try {
      // Stop foreground location updates
      if (locationSubscription.current) {
        await stopLocationUpdates(locationSubscription.current);
        locationSubscription.current = null;
      }

      // Only stop background location updates on Android
      if (Platform.OS === 'android') {
        await stopBackgroundLocationUpdates();
      }

      // Flush any remaining batch in batch mode or sendOnCheckout mode
      if ((trackingMode === 'batch' || trackingMode === 'sendOnCheckout') && tripId) {
        // For batch mode, flush any remaining batch
        let batch = await getUnsentLocations(10);
        while (batch.length > 0) {
          try {
            await api.post(`/trips/${tripId}/locations/batch`, { locations: batch }, {
              headers: { Authorization: `Bearer ${token}` }
            });
            await markLocationsAsSent(batch.map(loc => loc.id));
            setLocationLogs((prev) => prev.map(log => batch.find(b => b.id === log.id) ? { ...log, sent: true } : log));
          } catch (err) {
            setLocationLogs((prev) => prev.map(log => batch.find(b => b.id === log.id) ? { ...log, error: err.message } : log));
          }
          batch = await getUnsentLocations(10);
        }
      }

      // Clear local SQLite points after checkout
      await clearLocations();

      if (tripId) {
        try {
          await api.post(`/trips/${tripId}/stop`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (err) {
          Alert.alert('Error', err.message || 'Could not stop trip');
          return;
        }
      }

      /* Reset state */
      setTracking(false);
      setTripId(null);
      setLiveLocations([]);
      setLocationLogs([]);

      /* Notify user that trip has ended*/
      Alert.alert('Trip Ended', 'Your trip has been checked out.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not end trip');
    } finally {
      setCheckingOut(false);
    }
  };

  // Initialize SQLite DB on mount
  useEffect(() => {
    initDB();
  }, []);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={styles.statusBar.backgroundColor} />
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          {/* Header Section */}
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Trip Tracking</Text>
            <Text style={styles.subtitle}>
              {tracking 
                ? `Tracking: ${tripName}` 
                : 'Ready to start your journey'
              }
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[
                styles.actionButton, 
                styles.checkInButton, 
                (tracking || checkingIn) && styles.disabledButton
              ]} 
              onPress={handleCheckIn} 
              disabled={tracking || checkingIn}
              activeOpacity={0.8}
            >
              <View style={styles.buttonContent}>
                {checkingIn ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="log-in-outline" size={20} color="#ffffff" />
                )}
                <Text style={[
                  styles.actionButtonText, 
                  (!tracking || checkingOut) && styles.disabledButtonText
                ]}>
                  {checkingIn ? 'Checking In...' : 'Check In'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.actionButton, 
                styles.checkOutButton, 
                (!tracking || checkingOut) && styles.disabledButton
              ]} 
              onPress={handleCheckOut} 
              disabled={!tracking || checkingOut}
              activeOpacity={0.8}
            >
              <View style={styles.buttonContent}>
                {checkingOut ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="log-out-outline" size={20} color="#ffffff" />
                )}
                <Text style={[
                  styles.actionButtonText, 
                  (!tracking || checkingOut) && styles.disabledButtonText
                ]}>
                  {checkingOut ? 'Checking Out...' : 'Check Out'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Map Section */}
          {tracking && (
            <View style={styles.mapSection}>
              <View style={styles.mapHeader}>
                <Text style={styles.mapTitle}>Live Tracking</Text>
                <Text style={styles.mapSubtitle}>{liveLocations.length} points recorded</Text>
              </View>
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  initialRegion={liveLocations.length > 0 ? {
                    latitude: liveLocations[0].latitude,
                    longitude: liveLocations[0].longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  } : {
                    latitude: 20,
                    longitude: 78,
                    latitudeDelta: 10,
                    longitudeDelta: 10,
                  }}
                >
                  {liveLocations.length > 0 && (
                    <Polyline
                      coordinates={liveLocations}
                      strokeColor="#3b82f6"
                      strokeWidth={4}
                    />
                  )}
                  {liveLocations.length > 0 && (
                    <Marker coordinate={liveLocations[0]} title="Start" />
                  )}
                  {liveLocations.length > 1 && (
                    <Marker coordinate={liveLocations[liveLocations.length - 1]} title="Current" />
                  )}
                </MapView>
              </View>
            </View>
          )}

          {/* Location Logs Section */}
          <View style={styles.logsSection}>
            <View style={styles.logsHeaderRow}>
              <Text style={styles.logsTitle}>Location Logs</Text>
            </View>
            {/* Segmented control for tracking mode */}
            <View style={styles.segmentedControlContainer}>
              <TouchableOpacity
                style={[styles.segmentButton, trackingMode === 'live' && styles.segmentButtonActive]}
                onPress={() => handleModeChange('live')}
                activeOpacity={0.85}
              >
                <Ionicons name="flash" size={18} color={trackingMode === 'live' ? '#fff' : '#3b82f6'} style={styles.segmentIcon} />
                <Text style={[styles.segmentLabel, trackingMode === 'live' && styles.segmentLabelActive]}>Live</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentButton, trackingMode === 'batch' && styles.segmentButtonActive]}
                onPress={() => handleModeChange('batch')}
                activeOpacity={0.85}
              >
                <Ionicons name="layers" size={18} color={trackingMode === 'batch' ? '#fff' : '#3b82f6'} style={styles.segmentIcon} />
                <Text style={[styles.segmentLabel, trackingMode === 'batch' && styles.segmentLabelActive]}>Batch</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentButton, trackingMode === 'sendOnCheckout' && styles.segmentButtonActive]}
                onPress={() => handleModeChange('sendOnCheckout')}
                activeOpacity={0.85}
              >
                <Ionicons name="cloud-upload" size={18} color={trackingMode === 'sendOnCheckout' ? '#fff' : '#ea580c'} style={styles.segmentIcon} />
                <Text style={[styles.segmentLabel, trackingMode === 'sendOnCheckout' && styles.segmentLabelActive]}>Checkout</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentButton, trackingMode === 'robustBatch' && styles.segmentButtonActive]}
                onPress={() => handleModeChange('robustBatch')}
                activeOpacity={0.85}
              >
                <Ionicons name="reload" size={18} color={trackingMode === 'robustBatch' ? '#fff' : '#0ea5e9'} style={styles.segmentIcon} />
                <Text style={[styles.segmentLabel, trackingMode === 'robustBatch' && styles.segmentLabelActive]}>Robust Batch</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modeText}>
              Current Mode: {
                trackingMode === 'live' ? 'Live (send as you go)' :
                trackingMode === 'batch' ? 'Batch (store & send in chunks)' :
                trackingMode === 'sendOnCheckout' ? 'Checkout (save locally, send all at end)' :
                'Robust Batch (store, send in batches, retry on failure)'
              }
            </Text>
            <View style={styles.logsContainer}>
              {locationLogs.length === 0 ? (
                <View style={styles.noLogsContainer}>
                  <View style={styles.noLogsIconText}>
                    <Ionicons name="location-outline" size={20} color="#64748b" />
                    <Text style={styles.noLogsText}>No locations recorded yet</Text>
                  </View>
                  <Text style={styles.noLogsSubtext}>Start tracking to see location data</Text>
                </View>
              ) : (
                locationLogs.slice(0, 10).map((log, idx) => {
                  let timeString = '';
                  if (log.timestamp) {
                    const ts = log.timestamp > 1e12 ? log.timestamp : log.timestamp * 1000;
                    const dateObj = new Date(ts);
                    timeString = dateObj.toLocaleTimeString();
                  } else {
                    timeString = 'No timestamp';
                  }
                  return (
                    <View key={idx} style={styles.logItem}>
                      <View style={[styles.logStatus, { backgroundColor: log.sent ? '#10b981' : '#ef4444' }]} />
                      <View style={styles.logContent}>
                        <Text style={styles.logCoordinates}>
                          {`${log.latitude.toFixed(6)}, ${log.longitude.toFixed(6)}`}
                        </Text>
                        <Text style={styles.logTime}>{timeString}</Text>
                        {!log.sent && log.error && (
                          <Text style={styles.logError}>Error: {log.error}</Text>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modal */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Start New Trip</Text>
            <Text style={styles.modalSubtitle}>Enter a name for your trip</Text>
            
            <View style={styles.modalInputContainer}>
              <Text style={styles.modalInputLabel}>Trip Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., Morning Commute"
                placeholderTextColor={styles.placeholderText.color}
                value={inputTripName}
                onChangeText={setInputTripName}
                autoFocus
              />
            </View>
            
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity 
                onPress={() => { setModalVisible(false); setInputTripName(''); }} 
                style={[styles.modalButton, styles.cancelButton, checkingIn && styles.disabledButton]}
                activeOpacity={0.8}
                disabled={checkingIn}
              >
                <Text style={[styles.cancelButtonText, checkingIn && styles.disabledButtonText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={startTripWithName} 
                style={[styles.modalButton, styles.startButton, checkingIn && styles.disabledButton]}
                activeOpacity={0.8}
                disabled={checkingIn}
              >
                <View style={styles.buttonContent}>
                  {checkingIn && (
                    <ActivityIndicator size="small" color="#ffffff" style={styles.modalButtonSpinner} />
                  )}
                  <Text style={[styles.startButtonText, checkingIn && styles.disabledButtonText]}>
                    {checkingIn ? 'Starting...' : 'Start Trip'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Layout Styles
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  statusBar: {
    backgroundColor: '#1e293b',
  },

  // Header Styles
  headerContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '400',
    textAlign: 'center',
  },

  // Button Styles
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  checkInButton: {
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
  },
  checkOutButton: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  disabledButton: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0.1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  disabledButtonText: {
    color: '#e2e8f0',
  },

  // Map Styles
  mapSection: {
    marginBottom: 24,
  },
  mapHeader: {
    marginBottom: 16,
    alignItems: 'center',
  },
  mapTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  mapSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  mapContainer: {
    height: 300,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  map: {
    flex: 1,
  },

  // Logs Styles
  logsSection: {
    flex: 1,
  },
  logsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 0,
  },
  logsContainer: {
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  noLogsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noLogsIconText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  noLogsText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b',
  },
  noLogsSubtext: {
    fontSize: 14,
    color: '#94a3b8',
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  logStatus: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  logContent: {
    flex: 1,
  },
  logCoordinates: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  logTime: {
    fontSize: 12,
    color: '#64748b',
  },
  logError: {
    fontSize: 12,
    color: '#ef4444',
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
  },
  modalInputContainer: {
    marginBottom: 32,
  },
  modalInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginLeft: 4,
  },
  modalInput: {
    height: 56,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  placeholderText: {
    color: '#94a3b8',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  startButton: {
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalButtonSpinner: {
    marginRight: 8,
  },
  logsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  segmentedControlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
    borderRadius: 24,
    padding: 4,
    marginVertical: 8,
    justifyContent: 'center',
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    borderWidth: 0,
    elevation: 0,
    transition: 'background-color 0.2s',
  },
  segmentButtonActive: {
    backgroundColor: '#3b82f6',
    elevation: 2,
  },
  segmentIcon: {
    marginRight: 6,
  },
  segmentLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  segmentLabelActive: {
    color: '#fff',
  },
  activeLabel: {
    color: '#3b82f6',
    fontWeight: '700',
  },
  inactiveLabel: {
    color: '#64748b',
    fontWeight: '500',
  },
  modeIcon: {
    marginRight: 4,
  },
});