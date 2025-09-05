import React, { useState, useRef, useEffect } from "react";
import MapView, { Polyline, Marker } from "react-native-maps";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";

export default function TripMapScreen({ route }) {
  /* Example: route.params.locations is an array of { latitude, longitude } */
  const { locations = [] } = route?.params || {};
  /* Map reference for controlling the map */
  const mapRef = useRef(null);
  /* Map type state: 'standard' or 'satellite' */
  const [mapType, setMapType] = useState("standard");
  /* Show/hide statistics panel */
  const [showStats, setShowStats] = useState(true);
  /* State for road-snapped coordinates */
  const [snappedLocations, setSnappedLocations] = useState([]);
  /* Loading state for road snapping */
  const [isSnapping, setIsSnapping] = useState(false);
  /* Transportation mode for routing */
  const [transportMode, setTransportMode] = useState('driving'); // 'driving', 'walking', 'cycling'

  /* Validate locations data */
  const validLocations = locations.filter(
    (loc) =>
      loc &&
      typeof loc.latitude === "number" &&
      typeof loc.longitude === "number" &&
      !isNaN(loc.latitude) &&
      !isNaN(loc.longitude)
  );

  /* Function to snap coordinates to roads using OSRM */
  const snapToRoads = async (coordinates) => {
    try {
      setIsSnapping(true);
      
      // Filter coordinates to reduce noise and improve matching
      const filteredCoords = coordinates.filter((coord, index) => {
        if (index === 0 || index === coordinates.length - 1) return true; // Always keep start and end
        if (index % 3 === 0) return true; // Keep every 3rd point to reduce density
        return false;
      });
      
      console.log(`Filtering coordinates: ${coordinates.length} -> ${filteredCoords.length} points`);
      
      // Convert coordinates to OSRM format (longitude,latitude)
      const osrmCoordinates = filteredCoords.map(loc => `${loc.longitude},${loc.latitude}`).join(';');
      
      // OSRM Map Matching API with improved parameters
      const osrmUrl = `https://router.project-osrm.org/match/v1/${transportMode}/${osrmCoordinates}?geometries=geojson&radiuses=${filteredCoords.map(() => '50').join(';')}&steps=false&overview=full`;
      
      console.log(`Requesting OSRM map matching for ${transportMode} mode:`, osrmUrl);
      const response = await fetch(osrmUrl);
      const data = await response.json();
      
      console.log('OSRM Response:', JSON.stringify(data, null, 2));
      
      if (data.matchings && data.matchings.length > 0 && data.matchings[0].geometry) {
        // Extract snapped coordinates from the response
        const snappedCoords = data.matchings[0].geometry.coordinates.map(([lon, lat]) => ({
          latitude: lat,
          longitude: lon,
        }));
        
        console.log('Successfully snapped coordinates to roads:', snappedCoords.length, 'points');
        setSnappedLocations(snappedCoords);
        return snappedCoords;
      } else {
        console.warn('No road matching found. Response details:', {
          matchings: data.matchings?.length || 0,
          code: data.code,
          message: data.message
        });
        
        // Try with routing instead of matching as fallback
        if (filteredCoords.length >= 2) {
          console.log('Trying route-based approach as fallback...');
          return await tryRouting(filteredCoords);
        }
        
        setSnappedLocations(coordinates);
        return coordinates;
      }
    } catch (error) {
      console.error('OSRM road snapping failed:', error);
      // Fall back to original coordinates if snapping fails
      setSnappedLocations(coordinates);
      return coordinates;
    } finally {
      setIsSnapping(false);
    }
  };

  /* Fallback function to use routing instead of matching */
  const tryRouting = async (coordinates) => {
    try {
      const start = coordinates[0];
      const end = coordinates[coordinates.length - 1];
      
      // Use OSRM routing API as fallback
      const routeUrl = `https://router.project-osrm.org/route/v1/${transportMode}/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?geometries=geojson&overview=full`;
      
      console.log(`Trying route fallback for ${transportMode} mode:`, routeUrl);
      const response = await fetch(routeUrl);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0 && data.routes[0].geometry) {
        const routeCoords = data.routes[0].geometry.coordinates.map(([lon, lat]) => ({
          latitude: lat,
          longitude: lon,
        }));
        
        console.log('Route fallback successful:', routeCoords.length, 'points');
        setSnappedLocations(routeCoords);
        return routeCoords;
      } else {
        console.warn('Route fallback also failed');
        setSnappedLocations(coordinates);
        return coordinates;
      }
    } catch (error) {
      console.error('Route fallback failed:', error);
      setSnappedLocations(coordinates);
      return coordinates;
    }
  };

  /* Effect to snap coordinates to roads when validLocations change */
  useEffect(() => {
    if (validLocations.length > 1) {
      console.log('Starting road snapping for', validLocations.length, 'coordinates');
      console.log('First coordinate:', validLocations[0]);
      console.log('Last coordinate:', validLocations[validLocations.length - 1]);
      snapToRoads(validLocations);
    } else if (validLocations.length === 1) {
      // Single point, no need to snap
      console.log('Single point detected, no road snapping needed');
      setSnappedLocations(validLocations);
    } else {
      console.log('No valid locations found');
      setSnappedLocations([]);
    }
  }, [validLocations.length, transportMode]); // Re-snap when transport mode changes

  /* If no valid locations, show empty state */
  if (!validLocations.length) {
    return (
      <>
        <StatusBar
          barStyle="light-content"
          backgroundColor={styles.statusBar.backgroundColor}
        />
        <View style={styles.emptyContainer}>
          <Ionicons name="map-outline" size={64} color="#94a3b8" />
          <Text style={styles.emptyTitle}>No Route Data</Text>
          <Text style={styles.emptySubtitle}>
            This trip doesn't have any location data to display
          </Text>
        </View>
      </>
    );
  }

  /* Get start and end points */
  const start = validLocations[0];
  const end = validLocations[validLocations.length - 1];

  /* Get road-snapped start and end points */
  const snappedStart = snappedLocations[0] || start;
  const snappedEnd = snappedLocations[snappedLocations.length - 1] || end;

  /* Calculate trip statistics */
  const calculateDistance = () => {
    /* Need at least 2 points to calculate distance */
    if (validLocations.length < 2) return 0;

    /* Calculations */
    let totalDistance = 0;
    for (let i = 1; i < validLocations.length; i++) {
      const prev = validLocations[i - 1];
      const curr = validLocations[i];

      // Haversine formula for distance calculation
      const R = 6371; // Earth's radius in kilometers
      const dLat = ((curr.latitude - prev.latitude) * Math.PI) / 180;
      const dLon = ((curr.longitude - prev.longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((prev.latitude * Math.PI) / 180) *
          Math.cos((curr.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;
      totalDistance += distance;
    }
    /* Total distance in kilometers */
    return totalDistance;
  };

  /* Trip statistics */
  const distance = calculateDistance();
  const points = validLocations.length;

  /* Fit map to show all coordinates */
  const fitToCoordinates = () => {
    if (mapRef.current && validLocations.length > 0) {
      mapRef.current.fitToCoordinates(validLocations, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  /* Toggle between standard and satellite map types */
  const toggleMapType = () => {
    setMapType((prevType) =>
      prevType === "standard" ? "satellite" : "standard"
    );
  };

  /* Cycle through transport modes */
  const cycleTransportMode = () => {
    const modes = ['driving', 'walking', 'cycling'];
    const currentIndex = modes.indexOf(transportMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setTransportMode(modes[nextIndex]);
    console.log(`Transport mode changed to: ${modes[nextIndex]}`);
  };

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor={styles.statusBar.backgroundColor}
      />
      <View style={styles.container}>
        {console.log(start.latitude, start.longitude)}
        {Platform.OS === "android" ? (
          <WebView
            key={`webview-${snappedLocations.length}-${transportMode}`} // Force re-render when data changes
            source={{
               html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
      </head>
      <body style="margin:0;padding:0;">
        <div id="map" style="width: 100%; height: 100vh;"></div>
      </body>
      </html>
    `,
            }}
            style={styles.map}
            injectedJavaScript={`
    console.log('WebView injectedJavaScript running...');
    const validLocations = ${JSON.stringify(validLocations)};
    const snappedLocations = ${JSON.stringify(snappedLocations)};
    const transportMode = '${transportMode}';
    
    console.log('Valid locations count:', validLocations.length);
    console.log('Snapped locations count:', snappedLocations.length);
    console.log('Transport mode:', transportMode);
    
    // Use snapped locations if available, otherwise fall back to original
    const locationsToShow = snappedLocations.length > 0 ? snappedLocations : validLocations;
    console.log('Using locations count:', locationsToShow.length);
    
    if (locationsToShow.length === 0) {
      console.log('No locations to show');
      return;
    }
    
    const start = locationsToShow[0];
    const end = locationsToShow[locationsToShow.length - 1];
    
    console.log('Start point:', start);
    console.log('End point:', end);

    const map = L.map('map').setView([start.latitude, start.longitude], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Show both original path (dashed) and snapped path (solid) for comparison
    if (snappedLocations.length > 0 && validLocations.length > 0) {
      console.log('Showing both original and snapped paths');
      // Original path in light gray, dashed
      const originalLatlngs = validLocations.map(loc => [loc.latitude, loc.longitude]);
      L.polyline(originalLatlngs, { 
        color: '#cccccc', 
        weight: 2, 
        dashArray: '5, 5',
        opacity: 0.7
      }).addTo(map).bindPopup('Original GPS Path');

      // Snapped path in blue, solid
      const snappedLatlngs = snappedLocations.map(loc => [loc.latitude, loc.longitude]);
      L.polyline(snappedLatlngs, { 
        color: 'blue', 
        weight: 4,
        opacity: 0.8
      }).addTo(map).bindPopup('Road-Snapped Path (' + transportMode + ')');
    } else {
      console.log('Showing single path');
      // Only original path if snapping not available
      const latlngs = locationsToShow.map(loc => [loc.latitude, loc.longitude]);
      L.polyline(latlngs, { color: 'blue', weight: 4 }).addTo(map);
    }

    // Markers for start and end points (using snapped if available)
    L.marker([start.latitude, start.longitude])
      .addTo(map)
      .bindPopup(snappedLocations.length > 0 ? 'Start (Road-Snapped - ' + transportMode + ')' : 'Start')
      .openPopup();
    
    L.marker([end.latitude, end.longitude])
      .addTo(map)
      .bindPopup(snappedLocations.length > 0 ? 'End (Road-Snapped - ' + transportMode + ')' : 'End');

    // Fit map to show all coordinates
    if (locationsToShow.length > 1) {
      const group = L.featureGroup([
        L.polyline(locationsToShow.map(loc => [loc.latitude, loc.longitude]))
      ]);
      map.fitBounds(group.getBounds().pad(0.1));
    }
    
    console.log('Map setup complete');
  `}
          />
        ) : (
          <MapView
            ref={mapRef}
            style={styles.map}
            mapType={mapType}
            initialRegion={{
              latitude: snappedStart?.latitude || start?.latitude || 0,
              longitude: snappedStart?.longitude || start?.longitude || 0,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            onMapReady={fitToCoordinates}
            onError={(error) => {
              console.error("MapView error:", error);
            }}
          >
            {/* Show original path if snapped coordinates are available */}
            {snappedLocations.length > 0 && (
              <Polyline
                coordinates={validLocations}
                strokeColor="#cccccc"
                strokeWidth={2}
                lineDashPattern={[5, 5]}
                lineCap="round"
                lineJoin="round"
              />
            )}
            
            {/* Show snapped path or original path */}
            <Polyline
              coordinates={snappedLocations.length > 0 ? snappedLocations : validLocations}
              strokeColor="#3b82f6"
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
            />

            {/* Start Marker */}
            <Marker
              coordinate={snappedStart || start}
              title={snappedLocations.length > 0 ? "Trip Start (Road-Snapped)" : "Trip Start"}
              description="Starting point of your journey"
            >
              <View style={styles.startMarker}>
                <Ionicons name="flag-outline" size={24} color="#ffffff" />
              </View>
            </Marker>

            {/* End Marker */}
            <Marker
              coordinate={snappedEnd || end}
              title={snappedLocations.length > 0 ? "Trip End (Road-Snapped)" : "Trip End"}
              description="End point of your journey"
            >
              <View style={styles.endMarker}>
                <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
              </View>
            </Marker>
            
            {/* Loading indicator for road snapping */}
            {isSnapping && (
              <View style={styles.loadingOverlay}>
                <Text style={styles.loadingText}>🔄 Snapping to roads...</Text>
              </View>
            )}
          </MapView>
        )}
        
        {/* Loading Overlay for Road Snapping (works for both Android and iOS) */}
        {isSnapping && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>🔄 Snapping to roads...</Text>
          </View>
        )}
        
        {/* Transport Mode Control */}
        <TouchableOpacity 
          style={styles.transportModeButton}
          onPress={cycleTransportMode}
        >
          <Text style={styles.transportModeText}>
            {transportMode === 'driving' ? '🚗' : transportMode === 'walking' ? '🚶' : '🚴'}
          </Text>
          <Text style={styles.transportModeLabel}>
            {transportMode.charAt(0).toUpperCase() + transportMode.slice(1)}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  // Layout Styles
  container: {
    flex: 1,
    backgroundColor: "#1e293b",
  },
  statusBar: {
    backgroundColor: "#1e293b",
  },

  // Empty State Styles
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 12,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 24,
  },

  // Map Styles
  mapContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
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
    backgroundColor: "#10b981",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#ffffff",
    shadowColor: "#10b981",
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
    backgroundColor: "#ef4444",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#ffffff",
    shadowColor: "#ef4444",
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
    position: "absolute",
    top: 30,
    right: 16,
    flexDirection: "column",
    gap: 12,
    paddingRight: 8,
  },
  controlButton: {
    width: 48,
    height: 48,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
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
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  statsPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  statsPanelTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
  },
  closeButton: {
    width: 28,
    height: 28,
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#3b82f6",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 16,
  },

  // Loading Overlay Styles
  loadingOverlay: {
    position: 'absolute',
    top: 80, // Position below the transport mode button
    right: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.9)', // Blue background with transparency
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },

  // Transport Mode Button Styles
  transportModeButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  transportModeText: {
    fontSize: 20,
    marginRight: 8,
  },
  transportModeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
});
