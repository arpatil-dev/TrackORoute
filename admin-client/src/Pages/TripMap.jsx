import React, { useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default markers in production
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Configure default marker icons
const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Create custom icons for start and end markers
const startIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'start-marker'
});

const endIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'end-marker'
});

// Component to update map data without resetting zoom
function MapUpdater({ locations }) {
  const map = useMap();
  
  useEffect(() => {
    if (locations && locations.length > 0) {
      // Only fit bounds on initial load, not on updates
      if (!map._initialBoundsSet) {
        const path = locations.map(loc => [loc.latitude, loc.longitude]);
        const bounds = L.latLngBounds(path);
        map.fitBounds(bounds, { padding: [20, 20] });
        map._initialBoundsSet = true;
      }
    }
  }, [locations, map]);
  
  return null;
}

export default function TripMap({ locations }) {
  const mapRef = useRef();
  
  /* State for road-snapped coordinates */
  const [snappedLocations, setSnappedLocations] = useState([]);
  /* Loading state for road snapping */
  const [isSnapping, setIsSnapping] = useState(false);
  /* Transportation mode for routing */
  const [transportMode, setTransportMode] = useState('driving'); // 'driving', 'walking', 'cycling'
  /* Toggle between original and snapped path */
  const [showOriginalPath, setShowOriginalPath] = useState(false);

  /* Fallback function to use routing instead of matching */
  const tryRouting = useCallback(async (coordinates) => {
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
  }, [transportMode]);

  /* Function to snap coordinates to roads using OSRM */
  const snapToRoads = useCallback(async (coordinates) => {
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
  }, [transportMode, tryRouting]);

  /* Effect to snap coordinates to roads when locations change */
  useEffect(() => {
    if (locations && locations.length > 1) {
      console.log('Starting road snapping for', locations.length, 'coordinates');
      console.log('First coordinate:', locations[0]);
      console.log('Last coordinate:', locations[locations.length - 1]);
      snapToRoads(locations);
    } else if (locations && locations.length === 1) {
      // Single point, no need to snap
      console.log('Single point detected, no road snapping needed');
      setSnappedLocations(locations);
    } else {
      console.log('No valid locations found');
      setSnappedLocations([]);
    }
  }, [locations, transportMode, snapToRoads]); // Re-snap when transport mode changes

  /* Cycle through transport modes */
  const cycleTransportMode = () => {
    const modes = ['driving', 'walking', 'cycling'];
    const currentIndex = modes.indexOf(transportMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setTransportMode(modes[nextIndex]);
    console.log(`Transport mode changed to: ${modes[nextIndex]}`);
  };

  /* Toggle between original and snapped path */
  const togglePathView = () => {
    setShowOriginalPath(!showOriginalPath);
    console.log(`Path view changed to: ${!showOriginalPath ? 'Original GPS' : 'Road-Snapped'}`);
  };
  
  if (!locations || locations.length === 0) return <div>Loading map...</div>;

  // Use snapped locations if available and toggle is off, otherwise use original
  const shouldUseSnapped = snappedLocations.length > 0 && !showOriginalPath;
  const locationsToShow = shouldUseSnapped ? snappedLocations : locations;
  const originalPath = locations.map(loc => [loc.latitude, loc.longitude]);
  const snappedPath = snappedLocations.map(loc => [loc.latitude, loc.longitude]);
  const pathToShow = shouldUseSnapped ? snappedPath : originalPath;
  const center = pathToShow[0];

  // Controls component to render in header
  const mapControls = (
    <div className="flex items-center gap-2">
      {/* Status indicator - moved to left */}
      {isSnapping && (
        <div className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md">
          <svg className="w-3 h-3 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Processing...
        </div>
      )}

      {/* Transport Mode Control */}
      <button
        onClick={cycleTransportMode}
        className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
      >
        {transportMode === 'driving' ? (
          <>
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707L16 7.586A1 1 0 0015.414 7H14z" />
            </svg>
            Driving
          </>
        ) : transportMode === 'walking' ? (
          <>
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a3 3 0 100 6 3 3 0 000-6zM6 8a2 2 0 012-2h4a2 2 0 012 2v1a2 2 0 01-2 2H8a2 2 0 01-2-2V8zM5 15a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            Walking
          </>
        ) : (
          <>
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zM4 4a4 4 0 014-4h4a4 4 0 014 4v12a4 4 0 01-4 4H8a4 4 0 01-4-4V4z" />
              <circle cx="10" cy="8" r="2" />
              <path d="M8 12h4v2H8v-2z" />
            </svg>
            Cycling
          </>
        )}
      </button>

      {/* Path View Toggle - Only show when road snapping is available */}
      {snappedLocations.length > 0 && (
        <button
          onClick={togglePathView}
          className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors ${
            showOriginalPath 
              ? 'text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 focus:ring-red-500' 
              : 'text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 focus:ring-blue-500'
          }`}
        >
          {showOriginalPath ? (
            <>
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              GPS Path
            </>
          ) : (
            <>
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Road Path
            </>
          )}
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Render controls in the header using portal */}
      {typeof document !== 'undefined' && document.getElementById('map-controls') && 
        createPortal(mapControls, document.getElementById('map-controls'))
      }
      
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer 
        ref={mapRef}
        center={center} 
        zoom={13} 
        style={{ width: "100%", height: "100%", borderRadius: "16px" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
        />
        <MapUpdater locations={locationsToShow} />
        
        {/* Show snapped path or original path */}
        <Polyline 
          positions={pathToShow} 
          color="#4285F4" 
          weight={10}
          opacity={1}
        />
        
        <Marker position={pathToShow[0]} icon={startIcon}>
          <Popup>
            <div className="text-center">
              <div className="font-semibold text-green-600">
                {snappedLocations.length > 0 ? `Trip Start (Road-Snapped - ${transportMode})` : 'Trip Start'}
              </div>
              <div className="text-sm text-gray-600">
                {new Date(locations[0]?.timestamp).toLocaleString()}
              </div>
            </div>
          </Popup>
        </Marker>
        <Marker position={pathToShow[pathToShow.length - 1]} icon={endIcon}>
          <Popup>
            <div className="text-center">
              <div className="font-semibold text-red-600">
                {snappedLocations.length > 0 ? `Trip End (Road-Snapped - ${transportMode})` : 'Trip End'}
              </div>
              <div className="text-sm text-gray-600">
                {new Date(locations[locations.length - 1]?.timestamp).toLocaleString()}
              </div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
      </div>
    </>
  );
}
