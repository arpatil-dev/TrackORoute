import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import api from './api';
import { getToken, getTripId } from './storage';

/* expo-location and expo-task-manager are used for accessing device location services in the background */

const BACKGROUND_LOCATION_TASK = 'background-location-task';
/* Name for the background location task */

// Define the background task for location updates
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, ({ data, error }) => {
  // Handle errors from background location
  if (error) {
    console.error('Background location error:', error);
    return;
  }
  // Handle location data
  if (data) {
    const { locations } = data;

    // Track last sent location to avoid redundant updates
    if (!TaskManager.lastSent) {
      TaskManager.lastSent = null;
    }

    // For each location, check threshold before sending
    locations.forEach(async (location) => {
      const { latitude, longitude } = location.coords;
      const { timestamp } = location;

      let shouldSend = false;
      if (!TaskManager.lastSent) {
        shouldSend = true;
      } else {
        const latDiff = Math.abs(latitude - TaskManager.lastSent.latitude);
        const lonDiff = Math.abs(longitude - TaskManager.lastSent.longitude);
        if (latDiff > 0.00005 || lonDiff > 0.00005) {
          shouldSend = true;
        }
      }

      if (shouldSend) {
        try {
          const tripId = await getTripId();
          const token = await getToken();
          if (tripId && token) {
            console.log('Sending background location:', { latitude, longitude, timestamp });
            // Send location to backend API
            await api.post(`/trips/${tripId}/locations`, { locations: [{ latitude, longitude, timestamp }] }, {
              headers: { Authorization: `Bearer ${token}` }
            });
            TaskManager.lastSent = { latitude, longitude };
          } else {
            console.warn('Missing tripId or token for background location update');
          }
        } catch (err) {
          console.error('Error sending background location:', err);
        }
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
    timeInterval: 5000,
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


