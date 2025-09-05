import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import api from "./api";
import logger from "./logger";
import {
  getToken,
  getTripId,
  insertLocation,
  getUnsentLocations,
  markLocationsAsSent,
  getTrackingMode,
  getForegroundServiceEnabled,
} from "./storage";
import { get } from "react-native/Libraries/TurboModule/TurboModuleRegistry";

/* expo-location and expo-task-manager are used for accessing device location services in the background */

const backgroundLiveModeLocationHandler = async (
  latitude,
  longitude,
  timestamp,
  tripId = null,
  token = null,
  shouldSend = false
) => {
  try {
    if (shouldSend) {
      await api.post(
        `/trips/${tripId}/locations`,
        { locations: [{ latitude, longitude, timestamp }] },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      TaskManager.lastSent = { latitude, longitude };
    }
  } catch (error) {
    console.error("Error in background live mode handler:", error);
  }
};

const backgroundBatchModeLocationHandler = async (
  latitude,
  longitude,
  timestamp,
  tripId = null,
  token = null
) => {
  try {
    logger.background("2. Saving location to local DB");

    const token = await getToken();

    await insertLocation(latitude, longitude, timestamp);

    logger.background("3. Location saved to local DB");
    // Try to send batch if we have 10 unsent points

    logger.background("4. Checking for batch to send");
    const batch = await getUnsentLocations(10);

    logger.background(`5. Batch size : ${batch.length}`);
    if (batch && batch.length === 10) {
      logger.background(
        `6. Sending batch of ${batch.length} locations to server`
      );
      await api.post(
        `/trips/${tripId}/locations/batch`,
        { locations: batch },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      logger.background("7. Batch sent successfully to server");
      await markLocationsAsSent(batch.map((loc) => loc.id));
      console.log("\n\n");
    }
  } catch (err) {
    console.error("Error in background batch mode handler:", err);
  }
};

const backgroundSendOnCheckoutModeLocationHandler = async (
  latitude,
  longitude,
  timestamp
) => {
  try {
    await insertLocation(latitude, longitude, timestamp);
  } catch (error) {
    console.error("Error in background send-on-checkout mode handler:", error);
  }
};

const backendRobustBatchModeLocationHandler = async (
  latitude,
  longitude,
  timestamp,
  tripId,
  token
) => {
  try {
    console.log(
      `Robust batch mode: storing location ${latitude}, ${longitude} at ${new Date(
        timestamp
      ).toISOString()}`
    );
    await insertLocation(latitude, longitude, timestamp);
    console.log("Inserted location into DB for robust batch mode");
    // For every new point, try to send all unsent batches
    if (tripId && token) {
      console.log("Attempting to send all unsent batches in robust batch mode");
      let batch = await getUnsentLocations(10);
      console.log(
        "Unsent locations fetched for robust batch mode:",
        batch.length
      );
      while (batch && batch.length === 10) {
        console.log("Sending locations to server");
        try {
          await api.post(
            `/trips/${tripId}/locations/batch`,
            { locations: batch },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          console.log("Robust batch sent successfully to server");
          await markLocationsAsSent(batch.map((loc) => loc.id));
          console.log("marked locations as sent\n");
        } catch (err) {
          console.error(
            "Robust batch send failed, will retry on next point:",
            err
          );
          break; // Stop retrying for now, will retry on next location
        }
        batch = await getUnsentLocations(10);
      }
    }
  } catch (error) {
    console.error("Error in robust batch mode handler:", error);
  }
};

const BACKGROUND_LOCATION_TASK = "bg-location-task";
/* Name for the background location task */

// Define the background task for location updates
if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      console.error("Background location error:", error);
      return;
    }
    if(await getForegroundServiceEnabled()) return;
    console.log(getForegroundServiceEnabled());
    if (data) {
      const { locations } = data;
      console.log(
        "\n\nBackground location received:",
        locations.map((loc, idx) => ({
          idx,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
          timestamp: new Date(loc.timestamp).toISOString(),
        }))
      );
      const mode = await getTrackingMode();
      logger.background(`1. Tracking Mode : ${mode}`);
      if (locations.length === 0) {
        console.log("No locations received in background task");
        return;
      }
      const { latitude, longitude, accuracy = 0 } = locations[0].coords;
      const { timestamp } = locations[0];

      let shouldSend = false;

      if (accuracy > 50) return;

      if (TaskManager.lastSent) {
        const toRad = (value) => (value * Math.PI) / 180;
        const R = 6371000;
        const dLat = toRad(latitude - TaskManager.lastSent.latitude);
        const dLon = toRad(longitude - TaskManager.lastSent.longitude);
        const lat1 = toRad(TaskManager.lastSent.latitude);
        const lat2 = toRad(latitude);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.sin(dLon / 2) *
            Math.sin(dLon / 2) *
            Math.cos(lat1) *
            Math.cos(lat2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

      if (mode === "live") {
        backgroundLiveModeLocationHandler(
          latitude,
          longitude,
          timestamp,
          tripId,
          token,
          shouldSend
        );
      } else if (mode === "batch") {
        backgroundBatchModeLocationHandler(
          latitude,
          longitude,
          timestamp,
          tripId,
          token
        );
      } else if (mode === "sendOnCheckout") {
        backgroundSendOnCheckoutModeLocationHandler(
          latitude,
          longitude,
          timestamp
        );
        // Do not send until checkout
      } else if (mode === "robustBatch") {
        // Robust batch mode: always collect, queue, and retry all unsent batches for every new point
        backendRobustBatchModeLocationHandler(
          latitude,
          longitude,
          timestamp,
          tripId,
          token
        );
      }

      // Robust batch send loop: always try to send oldest unsent batch, retry on failure, keep collecting
      // async function robustBatchSendLoop() {
      //   const RETRY_DELAY = 10000; // ms
      //   let keepTrying = true;
      //   while (keepTrying) {
      //     // Get oldest unsent batch of 10
      //     console.log("Getting 10 unsent locations for robust batch send");
      //     const batch = await getUnsentLocations(10);
      //     console.log("\n10 Unsent locations :", batch.length, "\n");
      //     if (!batch || batch.length === 0) {
      //       // No unsent points, stop loop
      //       keepTrying = false;
      //       break;
      //     }
      //     // Only send full batches (or send partial if you want)
      //     if (batch.length < 10) {
      //       // Wait for more points
      //       keepTrying = false;
      //       break;
      //     }
      //     const tripId = await getTripId();
      //     const token = await getToken();
      //     if (!tripId || !token) {
      //       keepTrying = false;
      //       break;
      //     }
      //     try {
      //       console.log("Sending robust batch of locations:");
      //       await api.post(
      //         `/trips/${tripId}/locations/batch`,
      //         { locations: batch },
      //         {
      //           headers: { Authorization: `Bearer ${token}` },
      //         }
      //       );
      //       console.log("Robust batch sent successfully to server");
      //       await markLocationsAsSent(batch.map((loc) => loc.id));
      //       // Continue to next batch immediately
      //     } catch (err) {
      //       // Network/server error: wait and retry
      //       console.error("Robust batch send failed, will retry:", err);
      //       await new Promise((res) => setTimeout(res, RETRY_DELAY));
      //       console.log("Retrying robust batch send...");
      //     }
      //   }
      // }
    }
  });
}

/* Request background location permissions from the user */
export async function requestBackgroundLocationPermissions() {
  try {
    const { status: foregroundStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== "granted") {
      throw new Error("Foreground location permission not granted");
    }
    const { status: backgroundStatus } =
      await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== "granted") {
      throw new Error("Background location permission not granted");
    }
    return true;
  } catch (error) {
    console.error("Background location permission error:", error);
    throw new Error(
      "Failed to get background location permission: " + error.message
    );
  }
}

/* Start background location tracking with high accuracy and reasonable intervals */
export async function startBackgroundLocationUpdates() {
  if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
    console.log("Already started background location updates");
    return;
  } else {
    console.log("Registering background location updates for the first time");
  }

  return await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 10000,
    distanceInterval: 5,
    differentialDistanceInterval: 5,
    deferredUpdatesInterval: 10000,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "TrackORoute",
      notificationBody: "Tracking your trip in the background",
      notificationColor: "#3b82f6",
    },
  });
}

/* Stop background location tracking by removing the task */
export async function stopBackgroundLocationUpdates() {
  if (
    !(await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK))
  ) {
    console.log("Background location updates not running");
    return;
  }
  return await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
}
