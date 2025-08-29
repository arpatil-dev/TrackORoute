import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Dimensions } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';

export default function TripMapScreen({ route }) {
  // Example: route.params.locations is an array of { latitude, longitude }
  const { locations = [] } = route.params || {};
  const mapRef = useRef(null);
  const [mapType, setMapType] = useState('standard');
  const [showStats, setShowStats] = useState(true);

  if (!locations.length) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor={styles.statusBar.backgroundColor} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🗺️</Text>
          <Text style={styles.emptyTitle}>No Route Data</Text>
          <Text style={styles.emptySubtitle}>
            This trip doesn't have any location data to display
          </Text>
        </View>
      </>
    );
  }

  const start = locations[0];
  const end = locations[locations.length - 1];

  // Calculate trip statistics
  const calculateDistance = () => {
    if (locations.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 1; i < locations.length; i++) {
      const prev = locations[i - 1];
      const curr = locations[i];
      
      // Haversine formula for distance calculation
      const R = 6371; // Earth's radius in kilometers
      const dLat = (curr.latitude - prev.latitude) * Math.PI / 180;
      const dLon = (curr.longitude - prev.longitude) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(prev.latitude * Math.PI / 180) * Math.cos(curr.latitude * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      totalDistance += distance;
    }
    
    return totalDistance;
  };

  const distance = calculateDistance();
  const points = locations.length;

  const fitToCoordinates = () => {
    if (mapRef.current && locations.length > 0) {
      mapRef.current.fitToCoordinates(locations, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  const toggleMapType = () => {
    setMapType(prevType => prevType === 'standard' ? 'satellite' : 'standard');
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={styles.statusBar.backgroundColor} />
      <View style={styles.container}>
        {/* Map Container */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            mapType={mapType}
            initialRegion={{
              latitude: start.latitude,
              longitude: start.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            onMapReady={fitToCoordinates}
          >
            <Polyline
              coordinates={locations}
              strokeColor="#3b82f6"
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
            />
            
            {/* Start Marker */}
            <Marker
              coordinate={start}
              title="Trip Start"
              description="Starting point of your journey"
            >
              <View style={styles.startMarker}>
                <Text style={styles.markerText}>🚀</Text>
              </View>
            </Marker>
            
            {/* End Marker */}
            <Marker
              coordinate={end}
              title="Trip End"
              description="End point of your journey"
            >
              <View style={styles.endMarker}>
                <Text style={styles.markerText}>🏁</Text>
              </View>
            </Marker>
          </MapView>
        </View>

        {/* Control Buttons */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={fitToCoordinates}
            activeOpacity={0.8}
          >
            <Text style={styles.controlButtonText}>📍</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.controlButton}
            onPress={toggleMapType}
            activeOpacity={0.8}
          >
            <Text style={styles.controlButtonText}>🛰️</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setShowStats(!showStats)}
            activeOpacity={0.8}
          >
            <Text style={styles.controlButtonText}>📊</Text>
          </TouchableOpacity>
        </View>

        {/* Trip Statistics Panel */}
        {showStats && (
          <View style={styles.statsPanel}>
            <View style={styles.statsPanelHeader}>
              <Text style={styles.statsPanelTitle}>Trip Details</Text>
              <TouchableOpacity
                onPress={() => setShowStats(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {distance > 0 ? `${distance.toFixed(2)} km` : '0 km'}
                </Text>
                <Text style={styles.statLabel}>Total Distance</Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{points}</Text>
                <Text style={styles.statLabel}>GPS Points</Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {mapType === 'standard' ? 'Standard' : 'Satellite'}
                </Text>
                <Text style={styles.statLabel}>Map View</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  // Layout Styles
  container: {
    flex: 1,
    backgroundColor: '#1e293b',
  },
  statusBar: {
    backgroundColor: '#1e293b',
  },

  // Empty State Styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },

  // Map Styles
  mapContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  map: {
    flex: 1,
  },

  // Marker Styles
  startMarker: {
    width: 40,
    height: 40,
    backgroundColor: '#10b981',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#10b981',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  endMarker: {
    width: 40,
    height: 40,
    backgroundColor: '#ef4444',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#ef4444',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  markerText: {
    fontSize: 16,
  },

  // Controls Styles
  controlsContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    flexDirection: 'column',
    gap: 12,
  },
  controlButton: {
    width: 48,
    height: 48,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  controlButtonText: {
    fontSize: 18,
  },

  // Stats Panel Styles
  statsPanel: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  statsPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  statsPanelTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  closeButton: {
    width: 28,
    height: 28,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3b82f6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 16,
  },
});
