
import React, { useState, useRef } from 'react';
import { View, Text, Button, StyleSheet, Alert, Modal, TextInput, TouchableOpacity } from 'react-native';
import { requestLocationPermissions, startLocationUpdates, stopLocationUpdates } from '../utils/location';
import api from '../utils/api';

export default function TripTrackingScreen({ token }) {
  // State for trip tracking
  const [tracking, setTracking] = useState(false);
  const [tripName, setTripName] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [inputTripName, setInputTripName] = useState('');
  const locationSubscription = useRef(null);
  const [locationLogs, setLocationLogs] = useState([]);
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
    Alert.alert('Trip Ended', 'Your trip has been checked out.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trip Tracking</Text>
      <Button title="Check In" onPress={handleCheckIn} disabled={tracking} />
      <View style={{ height: 16 }} />
      <Button title="Check Out" onPress={handleCheckOut} disabled={!tracking} />
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Enter Trip Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Trip Name"
              value={inputTripName}
              onChangeText={setInputTripName}
              autoFocus
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <TouchableOpacity onPress={() => { setModalVisible(false); setInputTripName(''); }} style={styles.modalButton}>
                <Text style={{ color: 'red' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={startTripWithName} style={styles.modalButton}>
                <Text style={{ color: 'green' }}>Start</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <View style={{ marginTop: 32, width: '100%' }}>
        <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Location Logs:</Text>
        {locationLogs.length === 0 && <Text>No locations sent yet.</Text>}
        {locationLogs.slice(0, 10).map((log, idx) => {
          let timeString = '';
          if (log.timestamp) {
            const ts = log.timestamp > 1e12 ? log.timestamp : log.timestamp * 1000;
            const dateObj = new Date(ts);
            timeString = dateObj.toLocaleString();
          } else {
            timeString = 'No timestamp';
          }
          return (
            <Text key={idx} style={{ fontSize: 12, marginBottom: 4, color: log.sent ? 'green' : 'red' }}>
              {`Lat: ${log.latitude}, Lng: ${log.longitude}, Time: ${timeString}${log.sent ? '' : ' (Error: ' + log.error + ')'}`}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 24,
    width: '80%',
    elevation: 4,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  modalButton: {
    padding: 10,
    minWidth: 80,
    alignItems: 'center',
  },
});
