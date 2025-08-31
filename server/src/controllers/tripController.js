import { Trip } from "../models/Trip.js";
import handleResponse from "./controllerFunction.js";

// Start a new trip
export const startTrip = async (req, res) => {
  try {
    const { tripName } = req.body;
    const trip = new Trip({ user: req.user._id, tripName });
    await trip.save();
    handleResponse(res, 201, "Trip started", { tripId: trip._id });
  } catch (error) {
    handleResponse(res, 500, "Server error", null);
  }
};

// Add location points to a trip
export const addLocations = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { locations } = req.body;
    const trip = await Trip.findById(tripId);
    if (!trip) return handleResponse(res, 404, "Trip not found", null);
    trip.locations.push(...locations);
    await trip.save();
    handleResponse(res, 200, "Locations added", null);
  } catch (error) {
    handleResponse(res, 500, "Server error", null);
  }
};

// Stop a trip
export const stopTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const trip = await Trip.findById(tripId);
    if (!trip) return handleResponse(res, 404, "Trip not found", null);
    trip.stoppedAt = new Date();
    await trip.save();
    handleResponse(res, 200, "Trip stopped", null);
  } catch (error) {
    handleResponse(res, 500, "Server error", null);
  }
};

// Get trip history for a user
export const getTrips = async (req, res) => {
  try {
    let userId;
    if (req.user.role === "superuser") {
      userId = req.query.userId === "me" ? req.user._id : req.query.userId;
    } else {
      userId = req.user._id;
    }
    const trips = await Trip.find({ user: userId });
    handleResponse(res, 200, "Trips fetched", { trips });
  } catch (error) {
    handleResponse(res, 500, "Server error", null);
  }
};

// Get trip details
export const getTripDetails = async (req, res) => {
  try {
    const { tripId } = req.params;
    const trip = await Trip.findById(tripId);
    if (!trip) return handleResponse(res, 404, "Trip not found", null);
    // Only superuser or owner can view
    if (req.user.role !== "superuser" && String(trip.user) !== String(req.user._id)) {
      return handleResponse(res, 403, "Forbidden", null);
    }
      // --- Filtering and smoothing algorithm ---
      function haversine(lat1, lon1, lat2, lon2) {
        const R = 6371000; // meters
        const toRad = x => x * Math.PI / 180;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      }

      // Remove duplicates
      let points = trip.locations.filter((pt, idx, arr) => {
        if (idx === 0) return true;
        const prev = arr[idx-1];
        return !(pt.latitude === prev.latitude && pt.longitude === prev.longitude && pt.timestamp === prev.timestamp);
      });


      // Remove outliers by distance, speed, and preserve sharp turns
      const MAX_JUMP_METERS = 700;
      const MAX_SPEED_MPS = 70; // ~250 km/h
      let filtered = [points[0]];
      for (let i = 1; i < points.length; i++) {
        const prev = filtered[filtered.length-1];
        const curr = points[i];
        const dist = haversine(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
        const dt = (curr.timestamp - prev.timestamp) / 1000;
        const speed = dt > 0 ? dist/dt : 0;
        // Preserve sharp turns: if direction changes > 45 degrees, keep point
        let keep = dist < MAX_JUMP_METERS && speed < MAX_SPEED_MPS;
        if (i > 1 && keep) {
          const prev2 = filtered[filtered.length-2];
          if (prev2) {
            const dx1 = prev.longitude - prev2.longitude;
            const dy1 = prev.latitude - prev2.latitude;
            const dx2 = curr.longitude - prev.longitude;
            const dy2 = curr.latitude - prev.latitude;
            const dot = dx1 * dx2 + dy1 * dy2;
            const mag1 = Math.sqrt(dx1*dx1 + dy1*dy1);
            const mag2 = Math.sqrt(dx2*dx2 + dy2*dy2);
            const angle = Math.acos(dot / (mag1 * mag2 + 1e-6)) * 180 / Math.PI;
            if (angle > 45) keep = true;
          }
        }
        if (keep) filtered.push(curr);
      }

      // Fallback: if too few points remain, use only duplicate removal
      let finalPoints;
      if (filtered.length < 30) {
        finalPoints = points;
      } else {
        finalPoints = filtered;
      }

        // Smoothing: moving average (window size 3)
        function movingAveragePreserveEnds(arr, window=3, rawArr=[]) {
          if (arr.length <= 2) return arr;
          let smoothed = [arr[0]];
          for (let i = 1; i < arr.length - 1; i++) {
            let start = Math.max(0, i - Math.floor(window/2));
            let end = Math.min(arr.length, i + Math.ceil(window/2));
            let slice = arr.slice(start, end);
            let avgLat = slice.reduce((sum, pt) => sum + pt.latitude, 0) / slice.length;
            let avgLon = slice.reduce((sum, pt) => sum + pt.longitude, 0) / slice.length;
            let avgTs = slice.reduce((sum, pt) => sum + pt.timestamp, 0) / slice.length;
            smoothed.push({ ...arr[i], latitude: avgLat, longitude: avgLon, timestamp: avgTs });
          }
          // Always include the last raw location as endpoint
          if (rawArr && rawArr.length > 0) {
            const lastRaw = rawArr[rawArr.length - 1];
            smoothed.push(lastRaw);
          } else {
            smoothed.push(arr[arr.length - 1]);
          }
          return smoothed;
        }
        const smoothed = movingAveragePreserveEnds(finalPoints, 3, trip.locations);

      // Return trip with filtered/smoothed locations
      const tripCleaned = { ...trip.toObject(), locations: smoothed };
      handleResponse(res, 200, "Trip details fetched", { trip: tripCleaned });
  } catch (error) {
    handleResponse(res, 500, "Server error", null);
  }
};
