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
    handleResponse(res, 200, "Trip details fetched", { trip });
  } catch (error) {
    handleResponse(res, 500, "Server error", null);
  }
};
