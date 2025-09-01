import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import api from './api';
import { getToken, getTripId, insertLocation, getUnsentLocations, markLocationsAsSent, getTrackingMode } from './storage';

/* expo-location and expo-task-manager are used for accessing device location services in the background */

const BACKGROUND_LOCATION_TASK = 'background-location-task';
/* Name for the background location task */

// Define the background task for location updates
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    const mode = await getTrackingMode();
    locations.forEach(async (location) => {
      const { latitude, longitude, accuracy = 0 } = location.coords;
      const { timestamp } = location;
      let shouldSend = false;
      if (accuracy > 50) return;
      if (TaskManager.lastSent) {
        const toRad = (value) => value * Math.PI / 180;
        const R = 6371000;
        const dLat = toRad(latitude - TaskManager.lastSent.latitude);
        const dLon = toRad(longitude - TaskManager.lastSent.longitude);
        const lat1 = toRad(TaskManager.lastSent.latitude);
        const lat2 = toRad(latitude);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        if (distance > 200) return;
      }
      if (!TaskManager.lastSent) {
        shouldSend = true;
      } else {
        const latDiff = Math.abs(latitude - TaskManager.lastSent.latitude);
        const lonDiff = Math.abs(longitude - TaskManager.lastSent.longitude);
        if (latDiff > 0.00005 || lonDiff > 0.00005) {
          shouldSend = true;
        }
      }
      const tripId = await getTripId();
      const token = await getToken();
      if (!tripId || !token) return;
      if (mode === 'live') {
        if (shouldSend) {
          await api.post(`/trips/${tripId}/locations`, { locations: [{ latitude, longitude, timestamp }] }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          TaskManager.lastSent = { latitude, longitude };
        }
      } else if (mode === 'batch') {
        await insertLocation(latitude, longitude, timestamp);
        const batch = await getUnsentLocations(10);
        if (batch && batch.length === 10) {
          await api.post(`/trips/${tripId}/locations/batch`, { locations: batch }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          await markLocationsAsSent(batch.map(loc => loc.id));
        }
      } else if (mode === 'sendOnCheckout') {
        await insertLocation(latitude, longitude, timestamp);
        // Do not send until checkout
      }
    });
  }
});

/* Request background location permissions from the user */
export async function requestBackgroundLocationPermissions() {
  try {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      throw new Error('Foreground location permission not granted');
    }
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      throw new Error('Background location permission not granted');
    }
    return true;
  } catch (error) {
    console.error('Background location permission error:', error);
    throw new Error('Failed to get background location permission: ' + error.message);
  }
}

/* Start background location tracking with high accuracy and reasonable intervals */
export async function startBackgroundLocationUpdates() {
  return await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 10000,
    distanceInterval: 2,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'TrackORoute',
      notificationBody: 'Tracking your trip in the background',
      notificationColor: '#3b82f6',
    },
  });
}

/* Stop background location tracking by removing the task */
export async function stopBackgroundLocationUpdates() {
  return await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
}


