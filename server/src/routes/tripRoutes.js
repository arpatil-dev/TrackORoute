import express from "express";
import authenticate from "../middlewares/authenticate.js";
import requireRole from "../middlewares/requireRole.js";
import {
  startTrip,
  addLocations,
  stopTrip,
  getTrips,
  getTripDetails
} from "../controllers/tripController.js";

const router = express.Router();

// User endpoints
router.post("/start", authenticate, requireRole("user"), startTrip);
router.post("/:tripId/locations", authenticate, requireRole("user"), addLocations);
router.post("/:tripId/stop", authenticate, requireRole("user"), stopTrip);

// Trip history and details (accessible by both user and superuser)
router.get("/", authenticate, getTrips);
router.get("/:tripId", authenticate, getTripDetails);

export default router;
