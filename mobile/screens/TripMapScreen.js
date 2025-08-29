import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';

export default function TripMapScreen({ route }) {
  // Example: route.params.locations is an array of { latitude, longitude }
  const { locations = [] } = route.params || {};

  if (!locations.length) {
    return (
      <View style={styles.container}>
        <Text>No route data available.</Text>
      </View>
    );
  }

  const start = locations[0];
  const end = locations[locations.length - 1];

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: start.latitude,
          longitude: start.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        <Polyline
          coordinates={locations}
          strokeColor="#007AFF"
          strokeWidth={4}
        />
        <Marker coordinate={start} title="Start" />
        <Marker coordinate={end} title="End" />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});
