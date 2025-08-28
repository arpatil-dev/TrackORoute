import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import baseUrl from "../services/baseUrl";
import TripMap from "./TripMap";

export default function TripPage() {
  const { id } = useParams();
  const token = localStorage.getItem("token");
  const [trip, setTrip] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function fetchTrip() {
      try {
        const res = await axios.get(`${baseUrl}/api/trips/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTrip(res.data.data);
      } catch (err) {
        setMessage("Error fetching trip"+err);
      }
    }
    fetchTrip();
  }, [id, token]);

  if (!trip) return <div className="max-w-lg mx-auto p-6 bg-white shadow-lg rounded-2xl mt-8">Loading...</div>;
  console.log(trip.trip);
  return (
    <div className="max-w-lg mx-auto p-6 bg-white shadow-lg rounded-2xl mt-8">
      <h2 className="text-2xl font-bold mb-4 text-center">Trip Details</h2>
      {message && <p className="mb-4 text-center text-blue-600">{message}</p>}
      <div className="mb-2"><b>Trip Name:</b> {trip.trip.tripName || trip.trip._id}</div>
      <div className="mb-2"><b>Date:</b> {new Date(trip.trip.locations[0]?.timestamp).toLocaleString()}</div>
      <div className="mt-6">
        <TripMap locations={trip.trip.locations} />
      </div>
    </div>
  );
}
