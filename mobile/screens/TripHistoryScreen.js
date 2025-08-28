
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function TripHistoryScreen() {
  // TODO: Fetch and display user's trip history with map
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trip History</Text>
      {/* TODO: List trips and show route on map */}
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
});
