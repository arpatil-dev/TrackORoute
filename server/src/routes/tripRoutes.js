import express from "express";
import authenticate from "../middlewares/authenticate.js";
import requireRole from "../middlewares/requireRole.js";
import {
  startTrip,
  addLocations,
  addLocationsBatch,
  stopTrip,
  getTrips,
  getTripDetails,
  deleteTrip
} from "../controllers/tripController.js";

const router = express.Router();

// User endpoints
router.post("/start", authenticate, requireRole("user"), startTrip);
router.post("/:tripId/locations", authenticate, requireRole("user"), addLocations);
router.post("/:tripId/locations/batch", authenticate, requireRole("user"), addLocationsBatch);
router.post("/:tripId/stop", authenticate, requireRole("user"), stopTrip);

// Trip history and details (accessible by both user and superuser)
router.get("/", authenticate, getTrips);
router.get("/:tripId", authenticate, getTripDetails);
router.delete('/:tripId', authenticate, requireRole('superuser'), deleteTrip);

export default router;
