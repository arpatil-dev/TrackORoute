import React, { useState, useRef, useEffect } from "react";
import * as Location from "expo-location";
import {
  Platform,
  AppState,
  View,
  Text,
  Button,
  Switch,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Polyline, Marker } from "react-native-maps";
import { WebView } from "react-native-webview";
import {
  requestLocationPermissions,
  startLocationUpdates,
  stopLocationUpdates,
} from "../utils/location";
import {
  requestBackgroundLocationPermissions,
  startBackgroundLocationUpdates,
  stopBackgroundLocationUpdates,
} from "../utils/backgroundLocation";
import api from "../utils/api";
import {
  storeTripId,
  insertLocation,
  getUnsentLocations,
  markLocationsAsSent,
  initDB,
  clearLocations,
  setTrackingMode,
  getTrackingMode,
  getTripId,
  setForegroundServiceEnabled,
  getForegroundServiceEnabled,
} from "../utils/storage";
import logger from "../utils/logger";

export default function TripTrackingScreen({ token }) {
  // Track app state for foreground/background transitions

  const BACKGROUND_LOCATION_TASK = "bg-location-task";

  /* State for trip tracking */
  const [tracking, setTracking] = useState(false);

  /* State for trip details */
  const [tripName, setTripName] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [inputTripName, setInputTripName] = useState("");

  /* State for location data */
  const locationSubscription = useRef(null);
  const [locationLogs, setLocationLogs] = useState([]);
  const [liveLocations, setLiveLocations] = useState([]);
  const [tripId, setTripId] = useState(null);

  /* Loading states */
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  // State to manage tracking mode: 'live', 'batch', 'sendOnCheckout', 'robustBatch'
  const [trackingMode, setTrackingModeState] = useState("live");

  // Map provider preference - iOS only (Android always uses OSRM)
  const [useOSRM, setUseOSRM] = useState(Platform.OS === 'android' ? true : false);

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

  const foregroundLiveModeLocationHandler = async (location) => {
    try {
      
      if(!(await getForegroundServiceEnabled())) return;
      const tripId = await getTripId();
      
      await api.post(
        `/trips/${tripId}/locations`,
        { locations: [location] },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setLocationLogs((prev) => [{ ...location, sent: true }, ...prev]);
      setLiveLocations((prev) => [
        ...prev,
        { latitude: location.latitude, longitude: location.longitude },
      ]);
    } catch (err) {
      console.error("Live mode location send error:", err);
      setLocationLogs((prev) => [
        { ...location, sent: false, error: err.message },
        ...prev,
      ]);
    }
  };

  const foregroundBatchModeLocationHandler = async (location) => {
    try {
      
      if(!(await getForegroundServiceEnabled())) return;
      logger.foreground(
        `Location : ${location.latitude}, ${location.longitude} at ${location.timestamp} in Local DB`
      );
      await insertLocation(
        location.latitude,
        location.longitude,
        location.timestamp
      );
      logger.foreground("Location saved to local DB");
      setLocationLogs((prev) => [{ ...location, sent: false }, ...prev]);
      setLiveLocations((prev) => [
        ...prev,
        { latitude: location.latitude, longitude: location.longitude },
      ]);

      logger.foreground("Checking for batch to send");
      const batch = await getUnsentLocations(10);
      logger.foreground(`Batch size : ${batch.length}`);
      if (batch && batch.length === 10) {
        try {
          logger.foreground("Sending batch of locations to server");
          const tripId = await getTripId();
          if(!(await getForegroundServiceEnabled())) return;
          await api.post(
            `/trips/${tripId}/locations/batch`,
            { locations: batch },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          logger.foreground("Batch sent successfully to server");
          await markLocationsAsSent(batch.map((loc) => loc.id));
          setLocationLogs((prev) =>
            prev.map((log) =>
              batch.find((b) => b.id === log.id) ? { ...log, sent: true } : log
            )
          );
          logger.foreground("Marked locations as sent");
        } catch (err) {
          console.error(err);
          setLocationLogs((prev) =>
            prev.map((log) =>
              batch.find((b) => b.id === log.id)
                ? { ...log, error: err.message }
                : log
            )
          );
        }
      }
    } catch (err) {
      console.error("Error in batch mode callback:", err);
    }
  };

  const foregroundSendOnCheckoutModeLocationHandler = async (location) => {
    try {
      // if(!(await getForegroundServiceEnabled())) return;
      await insertLocation(
        location.latitude,
        location.longitude,
        location.timestamp
      );
      setLocationLogs((prev) => [{ ...location, sent: false }, ...prev]);
      setLiveLocations((prev) => [
        ...prev,
        { latitude: location.latitude, longitude: location.longitude },
      ]);
    } catch (err) {
      setLocationLogs((prev) => [
        { ...location, sent: false, error: err.message },
        ...prev,
      ]);
    }
  };

  const foregroundRobustBatchModeLocationHandler = async (location) => {
    try {
      if(!(await getForegroundServiceEnabled())) return;
      await insertLocation(
        location.latitude,
        location.longitude,
        location.timestamp
      );
      setLocationLogs((prev) => [{ ...location, sent: false }, ...prev]);
      setLiveLocations((prev) => [
        ...prev,
        { latitude: location.latitude, longitude: location.longitude },
      ]);
      // No batch sending here; handled by backgroundLocation.js robustBatchSendLoop
    } catch (err) {
      setLocationLogs((prev) => [
        { ...location, sent: false, error: err.message },
        ...prev,
      ]);
    }
  };

  const [counter, setCounter] = useState(0);
  /* Start trip with given name */
  const startTripWithName = async () => {
    if (!inputTripName.trim()) {
      Alert.alert("Error", "Trip name cannot be empty");
      return;
    }
    setModalVisible(false);
    setTripName(inputTripName.trim());
    setInputTripName("");
    setCheckingIn(true);
    try {
      // Platform-specific location permission and tracking logic
      if (Platform.OS === "android") {
        await requestLocationPermissions();
        await requestBackgroundLocationPermissions();
      } else {
        await requestLocationPermissions();
      }
      await setForegroundServiceEnabled("enabled");
      // Start trip in backend with Bearer token and tripName
      const res = await api.post(
        "/trips/start",
        { tripName: inputTripName.trim() },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const { tripId } = res.data.data;
      // Trip started successfully, save tripId
      setTripId(tripId);
      storeTripId(tripId);

      // Start tracking based on selected mode
      if (trackingMode === "batch") {
        logger.foreground("Batch mode Selected and Running");
        locationSubscription.current = await startLocationUpdates(
          async (location) => {
            
            foregroundBatchModeLocationHandler(location);
          }
        );
      } else if (trackingMode === "robustBatch") {
        // Robust batch mode: only collect points locally, sending/retry handled in backgroundLocation.js
        console.log("Robust Batch mode selected");
        locationSubscription.current = await startLocationUpdates(
          async (location) => {
            
            foregroundRobustBatchModeLocationHandler(location);
          }
        );
      } else if (trackingMode === "sendOnCheckout") {
        // Save all points locally, send only on checkout
        locationSubscription.current = await startLocationUpdates(
          async (location) => {
            
            foregroundSendOnCheckoutModeLocationHandler(location);
          }
        );
      } else {
        console.log("Live mode selected");
        locationSubscription.current = await startLocationUpdates(
          async (location) => {
           
            await foregroundLiveModeLocationHandler(location);
          }
        );
      }

      // Only start background location updates on Android
      if (Platform.OS === "android") {
        const isBgRunning = await Location.hasStartedLocationUpdatesAsync(
          BACKGROUND_LOCATION_TASK
        );
        console.log("Is background running:", isBgRunning);
        if (!(await Location.hasStartedLocationUpdatesAsync(
                BACKGROUND_LOCATION_TASK
              ))) {
          await startBackgroundLocationUpdates();
          console.log("Background location updates started on Android");
          await new Promise((r) => setTimeout(r, 1000));
        }else {
          console.log("Background location updates already running");
        }
      }

      setTracking(true);
    } catch (err) {
      Alert.alert(
        "Error",
        err.message || "Could not start trip or get location permission"
      );
    } finally {
      setCheckingIn(false);
    }
  };

  /* Modal handlers */
  const handleCheckIn = () => {
    setModalVisible(true);
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
      if (
        (trackingMode === "batch" || trackingMode === "sendOnCheckout" || trackingMode === "robustBatch") &&
        tripId
      ) {
        // For batch mode, flush any remaining batch
        let batch = await getUnsentLocations(10);
        while (batch.length > 0) {
          try {
            await api.post(
              `/trips/${tripId}/locations/batch`,
              { locations: batch },
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            await markLocationsAsSent(batch.map((loc) => loc.id));
            setLocationLogs((prev) =>
              prev.map((log) =>
                batch.find((b) => b.id === log.id)
                  ? { ...log, sent: true }
                  : log
              )
            );
          } catch (err) {
            setLocationLogs((prev) =>
              prev.map((log) =>
                batch.find((b) => b.id === log.id)
                  ? { ...log, error: err.message }
                  : log
              )
            );
          }
          batch = await getUnsentLocations(10);
        }
      }

      // Clear local SQLite points after checkout
      await clearLocations();

      if (tripId) {
        try {
          await api.post(
            `/trips/${tripId}/stop`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
        } catch (err) {
          Alert.alert("Error", err.message || "Could not stop trip");
          return;
        }
      }

      /* Reset state */
      setTracking(false);
      setTripId(null);
      setLiveLocations([]);
      setLocationLogs([]);

      /* Notify user that trip has ended*/
      Alert.alert("Trip Ended", "Your trip has been checked out.");
    } catch (err) {
      Alert.alert("Error", err.message || "Could not end trip");
    } finally {
      setCheckingOut(false);
    }
  };

  // Initialize SQLite DB on mount
  useEffect(() => {
    initDB();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      async (nextAppState) => {
        const tripId = await getTripId();
        const trkMode = await getTrackingMode();
        console.log(
          "AppState changed to",
          nextAppState,
          "tracking:",
          tracking,
          "tripId:",
          tripId,"\n"
        );

        if (nextAppState === "active" && tracking && tripId) {
          await setForegroundServiceEnabled("enabled");
          // ✅ Stop background updates safely when app comes to foreground
          if (Platform.OS === "android") {
            if (await Location.hasStartedLocationUpdatesAsync(
                BACKGROUND_LOCATION_TASK
              )) {
              
              console.log(
                "Background is Running..."
              );
              await new Promise((r) => setTimeout(r, 500));
            } else {
              console.log("Background already stopped");
            }
          }

          if (!locationSubscription.current) {
            locationSubscription.current = await startLocationUpdates(
              async (location) => {
                
                if (trkMode === "live")
                  await foregroundLiveModeLocationHandler(location);
                else if (trkMode === "sendOnCheckout")
                  await foregroundSendOnCheckoutModeLocationHandler(location);
                else if (trkMode === "robustBatch")
                  await foregroundRobustBatchModeLocationHandler(location);
                else if (trkMode === "batch")
                  await foregroundBatchModeLocationHandler(location);
                else console.warn("Unknown tracking mode:", trackingMode);
              }
            );
            await new Promise((r) => setTimeout(r, 500));
            logger.foreground("Foreground updates started");
          } else {
            logger.foreground("Foreground already started");
          }

          console.log(
            "App has come to the foreground, fetching latest locations"
          );
          try {
            const res = await api.get(`/trips/${tripId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const { locations } = res.data.data.trip;

            setLiveLocations(
              locations.map((loc) => ({
                latitude: loc.latitude,
                longitude: loc.longitude,
              }))
            );
            setLocationLogs(
              locations.map((loc) => ({
                latitude: loc.latitude,
                longitude: loc.longitude,
                timestamp: loc.timestamp,
                sent: true,
              }))
            );
          } catch (err) {
            console.error("Failed to fetch trip locations:", err);
          }
        } else if (nextAppState.match(/inactive|background/) && tracking && tripId) {
          await setForegroundServiceEnabled("disabled");
          console.log(
            "App has gone to the background, stopping foreground location updates \n"
          );


          // ✅ Start background safely
          if (Platform.OS === "android") {
            console.log("Before isBgRunning");
            const isBgRunning = await Location.hasStartedLocationUpdatesAsync(
              BACKGROUND_LOCATION_TASK
            );
            console.log("Is background running:", isBgRunning);
            if (
              await Location.hasStartedLocationUpdatesAsync(
                BACKGROUND_LOCATION_TASK
              )
            ) {
              console.log(
                "Starting background location updates ................."
              );

              // await startBackgroundLocationUpdates();
              console.log("BG SERVICE RUNNING");
              await new Promise((r) => setTimeout(r, 500));
            } else {
              console.log("BG SERVICE ALREADY RUNNING");
            }
          }
        } else {
          // No-op
        }
      }
    );
    setCounter((prev) => prev + 1);
    console.log("UseEffect Called : " + counter);
    return () => subscription.remove();
  }, [tracking, tripId]);

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor={styles.statusBar.backgroundColor}
      />
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.container}>
          {/* Header Section */}
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Trip Tracking</Text>
            <Text style={styles.subtitle}>
              {tracking
                ? `Tracking: ${tripName}`
                : "Ready to start your journey"}
            </Text>
          </View>

          {/* Tracking Mode Selection */}
          <View style={styles.modeSelectionSection}>
            <View style={styles.modeGrid}>
              <TouchableOpacity
                style={[
                  styles.modeCard,
                  trackingMode === "live" && styles.modeCardActive,
                ]}
                onPress={() => handleModeChange("live")}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.modeCardBackground,
                    trackingMode === "live" && styles.modeCardActiveBackground,
                  ]}
                />
                <Ionicons
                  name="flash"
                  size={22}
                  color={trackingMode === "live" ? "#fff" : "#3b82f6"}
                />
                <Text
                  style={[
                    styles.modeLabel,
                    trackingMode === "live" && styles.modeLabelActive,
                  ]}
                >
                  Live
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeCard,
                  trackingMode === "batch" && styles.modeCardActive,
                ]}
                onPress={() => handleModeChange("batch")}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.modeCardBackground,
                    trackingMode === "batch" && styles.modeCardActiveBackground,
                  ]}
                />
                <Ionicons
                  name="layers"
                  size={22}
                  color={trackingMode === "batch" ? "#fff" : "#3b82f6"}
                />
                <Text
                  style={[
                    styles.modeLabel,
                    trackingMode === "batch" && styles.modeLabelActive,
                  ]}
                >
                  Batch
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeCard,
                  trackingMode === "sendOnCheckout" && styles.modeCardActive,
                ]}
                onPress={() => handleModeChange("sendOnCheckout")}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.modeCardBackground,
                    trackingMode === "sendOnCheckout" &&
                      styles.modeCardActiveBackground,
                  ]}
                />
                <Ionicons
                  name="cloud-upload"
                  size={22}
                  color={trackingMode === "sendOnCheckout" ? "#fff" : "#ea580c"}
                />
                <Text
                  style={[
                    styles.modeLabel,
                    trackingMode === "sendOnCheckout" && styles.modeLabelActive,
                  ]}
                >
                  Upload
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeCard,
                  trackingMode === "robustBatch" && styles.modeCardActive,
                ]}
                onPress={() => handleModeChange("robustBatch")}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.modeCardBackground,
                    trackingMode === "robustBatch" &&
                      styles.modeCardActiveBackground,
                  ]}
                />
                <Ionicons
                  name="reload"
                  size={22}
                  color={trackingMode === "robustBatch" ? "#fff" : "#0ea5e9"}
                />
                <Text
                  style={[
                    styles.modeLabel,
                    trackingMode === "robustBatch" && styles.modeLabelActive,
                  ]}
                >
                  Robust
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Button and Mode Description Row */}
          <View style={styles.actionRow}>
            <View style={styles.buttonSection}>
              {!tracking ? (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.checkInButton,
                    checkingIn && styles.disabledButton,
                  ]}
                  onPress={handleCheckIn}
                  disabled={checkingIn}
                  activeOpacity={0.8}
                >
                  <View style={styles.buttonContent}>
                    {checkingIn ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Ionicons
                        name="log-in-outline"
                        size={20}
                        color="#ffffff"
                      />
                    )}
                    <Text
                      style={[
                        styles.actionButtonText,
                        checkingIn && styles.disabledButtonText,
                      ]}
                    >
                      {checkingIn ? "Checking In..." : "Check In"}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.checkOutButton,
                    checkingOut && styles.disabledButton,
                  ]}
                  onPress={handleCheckOut}
                  disabled={checkingOut}
                  activeOpacity={0.8}
                >
                  <View style={styles.buttonContent}>
                    {checkingOut ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Ionicons
                        name="log-out-outline"
                        size={20}
                        color="#ffffff"
                      />
                    )}
                    <Text
                      style={[
                        styles.actionButtonText,
                        checkingOut && styles.disabledButtonText,
                      ]}
                    >
                      {checkingOut ? "Checking Out..." : "Check Out"}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.descriptionSection}>
              <Text style={styles.modeDescription}>
                {trackingMode === "live"
                  ? "Send location data instantly after capture (Best for live Tracking)"
                  : trackingMode === "batch"
                  ? "Store locally, send in batches of 10 points (Best for less frequent updates)"
                  : trackingMode === "sendOnCheckout"
                  ? "Save locally, send all captured points on Checkout (Best for no network scenarios)"
                  : "Store locally, uses batches and retry on network failure (Best for reliability)"}
              </Text>
            </View>
          </View>

          {/* Map Section */}
          {tracking && (
            <View style={styles.mapSection}>
              <View style={styles.mapHeader}>
                <View style={styles.mapHeaderLeft}>
                  <Text style={styles.mapTitle}>Live Tracking</Text>
                  <Text style={styles.mapSubtitle}>
                    {liveLocations.length} points recorded
                  </Text>
                </View>
                
                {/* Map Provider Toggle - Only show on iOS */}
                {Platform.OS === 'ios' && (
                  <TouchableOpacity 
                    style={[styles.mapProviderButton, { backgroundColor: useOSRM ? '#3b82f6' : '#10b981' }]}
                    onPress={() => setUseOSRM(!useOSRM)}
                  >
                    <Ionicons 
                      name={useOSRM ? 'map-outline' : 'logo-apple'} 
                      size={16} 
                      color="white" 
                    />
                    <Text style={styles.mapProviderText}>
                      {useOSRM ? 'OSRM' : 'Apple'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.mapContainer}>
                {(Platform.OS === "android" || useOSRM) ? (
                  <WebView
                    key={`tracking-webview-${liveLocations.length}-${useOSRM}`}
                    source={{
                      html: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                          <meta charset="utf-8">
                          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" 
                                integrity="sha512-xodZBNTC5n17Xt2atTPuE1HxjVMSvLVW9ocqUKLsCC5CXdbqCmblAshOMAS6/keqq/sMZMZ19scR4PsZChSR7A=="
                                crossorigin=""/>
                          <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"
                                  integrity="sha512-XQoYMqMTK8LvdxXYG3nZ448hOEQiglfqkJs1NOQV44cWnUrBc8PkAOcXy20w0vlaXaVUearIOBhiXZ5V3ynxwA=="
                                  crossorigin=""></script>
                          <style>
                            * { margin: 0; padding: 0; }
                            html, body { height: 100%; width: 100%; overflow: hidden; }
                            #map { height: 100%; width: 100%; }
                          </style>
                        </head>
                        <body>
                          <div id="map"></div>
                          <script>
                            console.log('HTML loaded, waiting for Leaflet...');
                            
                            function initializeMap() {
                              const liveLocations = %LIVE_LOCATIONS%;
                              
                              console.log('Initializing tracking map with locations:', liveLocations.length);
                              
                              try {
                                if (liveLocations.length === 0) {
                                  // Default view for India if no locations
                                  const map = L.map('map', {
                                    zoomControl: true,
                                    attributionControl: true
                                  }).setView([20, 78], 5);
                                  
                                  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                    maxZoom: 19,
                                    attribution: '© OpenStreetMap contributors'
                                  }).addTo(map);
                                  
                                  console.log('Showing default India view');
                                  return;
                                }
                                
                                const start = liveLocations[0];
                                const current = liveLocations[liveLocations.length - 1];
                                
                                console.log('Creating tracking map centered at:', start);
                                
                                const map = L.map('map', {
                                  zoomControl: true,
                                  attributionControl: true
                                }).setView([start.latitude, start.longitude], 15);
                                
                                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                  maxZoom: 19,
                                  attribution: '© OpenStreetMap contributors'
                                }).addTo(map);

                                // Add polyline for the tracked path
                                if (liveLocations.length > 1) {
                                  const pathCoords = liveLocations.map(loc => [loc.latitude, loc.longitude]);
                                  L.polyline(pathCoords, { 
                                    color: '#3b82f6', 
                                    weight: 4,
                                    opacity: 0.8
                                  }).addTo(map);
                                }

                                // Start marker
                                L.marker([start.latitude, start.longitude])
                                  .addTo(map)
                                  .bindPopup('Start')
                                  .openPopup();
                                
                                // Current position marker
                                if (liveLocations.length > 1) {
                                  L.marker([current.latitude, current.longitude])
                                    .addTo(map)
                                    .bindPopup('Current Position');
                                }

                                // Fit map to show all locations
                                if (liveLocations.length > 1) {
                                  const group = L.featureGroup([
                                    L.polyline(liveLocations.map(loc => [loc.latitude, loc.longitude]))
                                  ]);
                                  map.fitBounds(group.getBounds().pad(0.1));
                                } else if (liveLocations.length === 1) {
                                  map.setView([start.latitude, start.longitude], 15);
                                }
                                
                                console.log('Tracking map setup complete');
                              } catch (error) {
                                console.error('Error initializing tracking map:', error);
                              }
                            }
                            
                            // Wait for Leaflet to load
                            if (typeof L !== 'undefined') {
                              initializeMap();
                            } else {
                              document.addEventListener('DOMContentLoaded', function() {
                                setTimeout(initializeMap, 100);
                              });
                            }
                          </script>
                        </body>
                        </html>
                      `.replace('%LIVE_LOCATIONS%', JSON.stringify(liveLocations)),
                    }}
                    style={styles.map}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={true}
                    scalesPageToFit={false}
                    scrollEnabled={false}
                    bounces={false}
                    allowsInlineMediaPlayback={true}
                    mediaPlaybackRequiresUserAction={false}
                    originWhitelist={['*']}
                    onError={(syntheticEvent) => {
                      const { nativeEvent } = syntheticEvent;
                      console.error('WebView error: ', nativeEvent);
                    }}
                    onHttpError={(syntheticEvent) => {
                      const { nativeEvent } = syntheticEvent;
                      console.error('WebView HTTP error: ', nativeEvent);
                    }}
                  />
                ) : (
                  <MapView
                    style={styles.map}
                    initialRegion={
                      liveLocations.length > 0
                        ? {
                            latitude: liveLocations[0].latitude,
                            longitude: liveLocations[0].longitude,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                          }
                        : {
                            latitude: 20,
                            longitude: 78,
                            latitudeDelta: 10,
                            longitudeDelta: 10,
                          }
                    }
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
                      <Marker
                        coordinate={liveLocations[liveLocations.length - 1]}
                        title="Current"
                      />
                    )}
                  </MapView>
                )}
              </View>
            </View>
          )}

          {/* Location Logs Section */}
          <View style={styles.logsSection}>
            <View style={styles.logsHeaderRow}>
              <Text style={styles.logsTitle}>Location Logs</Text>
            </View>
            <View style={styles.logsContainer}>
              {locationLogs.length === 0 ? (
                <View style={styles.noLogsContainer}>
                  <View style={styles.noLogsIconText}>
                    <Ionicons
                      name="location-outline"
                      size={20}
                      color="#64748b"
                    />
                    <Text style={styles.noLogsText}>
                      No locations recorded yet
                    </Text>
                  </View>
                  <Text style={styles.noLogsSubtext}>
                    Start tracking to see location data
                  </Text>
                </View>
              ) : (
                locationLogs.slice(0, 10).map((log, idx) => {
                  let timeString = "";
                  if (log.timestamp) {
                    const ts =
                      log.timestamp > 1e12
                        ? log.timestamp
                        : log.timestamp * 1000;
                    const dateObj = new Date(ts);
                    timeString = dateObj.toLocaleTimeString();
                  } else {
                    timeString = "No timestamp";
                  }
                  return (
                    <View key={idx} style={styles.logItem}>
                      <View
                        style={[
                          styles.logStatus,
                          { backgroundColor: log.sent ? "#10b981" : "#ef4444" },
                        ]}
                      />
                      <View style={styles.logContent}>
                        <Text style={styles.logCoordinates}>
                          {`${log.latitude.toFixed(6)}, ${log.longitude.toFixed(
                            6
                          )}`}
                        </Text>
                        <Text style={styles.logTime}>{timeString}</Text>
                        {!log.sent && log.error && (
                          <Text style={styles.logError}>
                            Error: {log.error}
                          </Text>
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
                onPress={() => {
                  setModalVisible(false);
                  setInputTripName("");
                }}
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  checkingIn && styles.disabledButton,
                ]}
                activeOpacity={0.8}
                disabled={checkingIn}
              >
                <Text
                  style={[
                    styles.cancelButtonText,
                    checkingIn && styles.disabledButtonText,
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={startTripWithName}
                style={[
                  styles.modalButton,
                  styles.startButton,
                  checkingIn && styles.disabledButton,
                ]}
                activeOpacity={0.8}
                disabled={checkingIn}
              >
                <View style={styles.buttonContent}>
                  {checkingIn && (
                    <ActivityIndicator
                      size="small"
                      color="#ffffff"
                      style={styles.modalButtonSpinner}
                    />
                  )}
                  <Text
                    style={[
                      styles.startButtonText,
                      checkingIn && styles.disabledButtonText,
                    ]}
                  >
                    {checkingIn ? "Starting..." : "Start Trip"}
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
    backgroundColor: "#f8fafc",
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
    backgroundColor: "#1e293b",
  },

  // Header Styles
  headerContainer: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    fontWeight: "400",
    textAlign: "center",
  },

  // Mode Selection Styles
  modeSelectionSection: {
    marginBottom: 20,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  modeGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 6,
  },
  modeCard: {
    flex: 1,
    backgroundColor: "transparent",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    marginBottom: 6,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    minHeight: 80,
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  modeCardActive: {
    backgroundColor: "transparent",
    borderColor: "#3b82f6",
    shadowColor: "#3b82f6",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modeCardBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
  },
  modeCardActiveBackground: {
    backgroundColor: "#3b82f6",
  },
  modeLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginTop: 6,
    textAlign: "center",
    lineHeight: 12,
    letterSpacing: -0.2,
    zIndex: 1,
  },
  modeLabelActive: {
    color: "#ffffff",
  },
  modeDescription: {
    fontSize: 14,
    color: "#475569",
    textAlign: "left", // 👈 center text inside
    fontStyle: "normal",
    fontWeight: "500",

    margin: 0,
    padding: 0,
    // remove flex: 1
  },

  // Action Row Styles
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 16,
    minHeight: 56,
  },
  buttonSection: {
    flex: 0,
  },
  descriptionSection: {
    flex: 1,
    paddingLeft: 8,
    justifyContent: "center",
    alignItems: "center",
    height: 56,
  },

  // Button Styles
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  actionButton: {
    width: 140,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  checkInButton: {
    backgroundColor: "#3b82f6",
    shadowColor: "#3b82f6",
  },
  checkOutButton: {
    backgroundColor: "#ef4444",
    shadowColor: "#ef4444",
  },
  disabledButton: {
    backgroundColor: "#94a3b8",
    shadowOpacity: 0.1,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  disabledButtonText: {
    color: "#e2e8f0",
  },

  // Map Styles
  mapSection: {
    marginBottom: 24,
  },
  mapHeader: {
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mapHeaderLeft: {
    flex: 1,
  },
  mapTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  mapSubtitle: {
    fontSize: 14,
    color: "#64748b",
  },
  mapProviderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  mapProviderText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    marginLeft: 4,
  },
  mapContainer: {
    height: 300,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    shadowColor: "#000",
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
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 0,
  },
  logsContainer: {
    marginTop: 16,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  noLogsContainer: {
    alignItems: "center",
    paddingVertical: 32,
  },
  noLogsIconText: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  noLogsText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#64748b",
  },
  noLogsSubtext: {
    fontSize: 14,
    color: "#94a3b8",
  },
  logItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
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
    fontWeight: "500",
    color: "#374151",
    marginBottom: 2,
  },
  logTime: {
    fontSize: 12,
    color: "#64748b",
  },
  logError: {
    fontSize: 12,
    color: "#ef4444",
    fontStyle: "italic",
    marginTop: 2,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 32,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
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
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 32,
  },
  modalInputContainer: {
    marginBottom: 32,
  },
  modalInputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    marginLeft: 4,
  },
  modalInput: {
    height: 56,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  placeholderText: {
    color: "#94a3b8",
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f1f5f9",
  },
  startButton: {
    backgroundColor: "#3b82f6",
    shadowColor: "#3b82f6",
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
    fontWeight: "600",
    color: "#64748b",
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  modalButtonSpinner: {
    marginRight: 8,
  },
  logsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
});
