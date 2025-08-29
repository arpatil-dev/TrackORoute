

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../utils/api';

export default function TripHistoryScreen({ token }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    console.log('TripHistoryScreen mounted, fetching trips...');
    const fetchTrips = async () => {
      try {
        console.log('Fetching trips with token:', token);
        const res = await api.get('/trips?userId=me',{
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Fetched trips:', res.data);
        setTrips(res.data.data.trips || []);
      } catch (err) {
        setTrips([]);
      }
      setLoading(false);
    };
    fetchTrips();
  }, [token]);

  const renderTrip = ({ item }) => (
    <TouchableOpacity
      style={styles.tripCard}
      onPress={() => navigation.navigate('TripMap', { locations: item.locations })}
    >
      <Text style={styles.tripName}>{item.tripName || 'Unnamed Trip'}</Text>
      <Text style={styles.tripDate}>{item.startedAt ? new Date(item.startedAt).toLocaleString() : ''}</Text>
      <Text style={styles.tripPoints}>{item.locations.length} points</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trip History</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : trips.length === 0 ? (
        <Text>No trips found.</Text>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item._id}
          renderItem={renderTrip}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 16,
    alignSelf: 'center',
  },
  tripCard: {
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 2,
  },
  tripName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tripDate: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  tripPoints: {
    fontSize: 12,
    color: '#007AFF',
  },
});
