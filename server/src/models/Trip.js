import mongoose from "mongoose";

const locationSchema = new mongoose.Schema({
  latitude: Number,
  longitude: Number,
  timestamp: Number
});

const tripSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  tripName: String,
  startedAt: { type: Date, default: Date.now },
  stoppedAt: Date,
  locations: [locationSchema]
});

export const Trip = mongoose.model("Trip", tripSchema);
