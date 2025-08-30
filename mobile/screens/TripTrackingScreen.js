
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Modal, TextInput, TouchableOpacity, Dimensions, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { requestLocationPermissions, startLocationUpdates, stopLocationUpdates } from '../utils/location';
import api from '../utils/api';
import MapView, { Polyline, Marker } from 'react-native-maps';

export default function TripTrackingScreen({ token }) {
  // State for trip tracking
  const [tracking, setTracking] = useState(false);
  const [tripName, setTripName] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [inputTripName, setInputTripName] = useState('');
  const locationSubscription = useRef(null);
  const [locationLogs, setLocationLogs] = useState([]);
  const [liveLocations, setLiveLocations] = useState([]);
  const [tripId, setTripId] = useState(null);

  const handleCheckIn = () => {
    setModalVisible(true);
  };

  const startTripWithName = async () => {
    if (!inputTripName.trim()) {
      Alert.alert('Error', 'Trip name cannot be empty');
      return;
    }
    setModalVisible(false);
    setTripName(inputTripName.trim());
    setInputTripName('');
    try {
      await requestLocationPermissions();
      // Start trip in backend with Bearer token
      const res = await api.post('/trips/start', { "tripName": inputTripName.trim() }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Trip started with ID:', res.data.data.tripId);
      setTripId(res.data.data.tripId);
      // Start location updates
      locationSubscription.current = await startLocationUpdates(async (location) => {
        // Send location to backend with Bearer token
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
      setTracking(true);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not start trip or get location permission');
    }
  };

  const handleCheckOut = async () => {
    // Stop GPS tracking and notify backend
    if (locationSubscription.current) {
      await stopLocationUpdates(locationSubscription.current);
      locationSubscription.current = null;
    }
    if (tripId) {
        console.log('Trip ended with ID:', token);
      try {
        await api.post(`/trips/${tripId}/stop`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Trip stopped successfully');
      } catch (err) {
        Alert.alert('Error', err.message || 'Could not stop trip');
      }
    }
  setTracking(false);
  setTripName('');
  setTripId(null);
  setLiveLocations([]);
  Alert.alert('Trip Ended', 'Your trip has been checked out.');
  };

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
              style={[styles.actionButton, styles.checkInButton, tracking && styles.disabledButton]} 
              onPress={handleCheckIn} 
              disabled={tracking}
              activeOpacity={0.8}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="log-in-outline" size={20} color="#ffffff" />
                <Text style={[styles.actionButtonText, tracking && styles.disabledButtonText]}>
                  Check In
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.checkOutButton, !tracking && styles.disabledButton]} 
              onPress={handleCheckOut} 
              disabled={!tracking}
              activeOpacity={0.8}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="log-out-outline" size={20} color="#ffffff" />
                <Text style={[styles.actionButtonText, !tracking && styles.disabledButtonText]}>
                  Check Out
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
            <Text style={styles.logsTitle}>Location Logs</Text>
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
                style={[styles.modalButton, styles.cancelButton]}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={startTripWithName} 
                style={[styles.modalButton, styles.startButton]}
                activeOpacity={0.8}
              >
                <Text style={styles.startButtonText}>Start Trip</Text>
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
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
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
    marginBottom: 16,
  },
  logsContainer: {
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
});
