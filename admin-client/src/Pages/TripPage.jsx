import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import baseUrl from "../services/baseUrl";
import TripMap from "./TripMap";

export default function TripPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [trip, setTrip] = useState(null);
  const [message, setMessage] = useState("");

  // Calculate trip statistics
  const calculateTripStats = () => {
    if (!trip || !trip.trip.locations || trip.trip.locations.length === 0) {
      return { distance: 0, duration: 0, avgSpeed: 0, points: 0 };
    }

    const locations = trip.trip.locations;
    const points = locations.length;
    
    // Calculate total distance using Haversine formula
    let totalDistance = 0;
    for (let i = 1; i < locations.length; i++) {
      const prev = locations[i - 1];
      const curr = locations[i];
      
      const R = 6371; // Earth's radius in kilometers
      const dLat = (curr.latitude - prev.latitude) * Math.PI / 180;
      const dLon = (curr.longitude - prev.longitude) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(prev.latitude * Math.PI / 180) * Math.cos(curr.latitude * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      totalDistance += distance;
    }

    // Calculate duration
    const startTime = new Date(locations[0].timestamp);
    const endTime = new Date(locations[locations.length - 1].timestamp);
    const duration = (endTime - startTime) / 1000 / 60; // in minutes

    // Calculate average speed (km/h)
    const avgSpeed = duration > 0 ? (totalDistance / (duration / 60)) : 0;

    return {
      distance: totalDistance,
      duration: duration,
      avgSpeed: avgSpeed,
      points: points
    };
  };

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

  if (!trip) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading trip details...</p>
        </div>
      </div>
    );
  }

  const stats = calculateTripStats();
  const tripData = trip.trip;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => navigate(-1)}
                className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <div className="flex items-center text-slate-500">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-sm font-medium">Trip Details</span>
              </div>
            </div>
            
            {/* Page Title */}
            <div className="text-center flex-1">
              <h1 className="text-2xl font-bold text-slate-900">Trip Analysis</h1>
              <p className="text-sm text-slate-600">View comprehensive trip information</p>
            </div>
            
            <div className="w-32"></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {message && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-700 text-sm font-medium">{message}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Trip Info Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-8">
              {/* Trip Header */}
              <div className="text-center mb-8">
                <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center mb-4 shadow-lg">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  {tripData.tripName || `Trip ${tripData._id.slice(-6)}`}
                </h2>
                <p className="text-sm text-slate-600">
                  {tripData.locations && tripData.locations.length > 0 
                    ? new Date(tripData.locations[0].timestamp).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'No date available'
                  }
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {tripData.locations && tripData.locations.length > 0 
                    ? new Date(tripData.locations[0].timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : ''
                  }
                </p>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.distance.toFixed(1)}
                  </div>
                  <div className="text-xs font-semibold text-blue-800 uppercase tracking-wide">
                    Kilometers
                  </div>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(stats.duration)}
                  </div>
                  <div className="text-xs font-semibold text-green-800 uppercase tracking-wide">
                    Minutes
                  </div>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-xl">
                  <div className="text-2xl font-bold text-purple-600">
                    {stats.avgSpeed.toFixed(0)}
                  </div>
                  <div className="text-xs font-semibold text-purple-800 uppercase tracking-wide">
                    Km/h Avg
                  </div>
                </div>

                <div className="text-center p-4 bg-orange-50 rounded-xl">
                  <div className="text-2xl font-bold text-orange-600">
                    {stats.points}
                  </div>
                  <div className="text-xs font-semibold text-orange-800 uppercase tracking-wide">
                    GPS Points
                  </div>
                </div>
              </div>

              {/* Additional Trip Details */}
              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-700 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Trip ID
                  </span>
                  <span className="text-sm text-slate-500 font-mono">
                    {tripData._id.slice(-8)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-700 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Status
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Completed
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Map Section */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden h-full flex flex-col">
              {/* Map Header */}
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Route Visualization</h3>
                    <p className="text-sm text-slate-600">Interactive map showing the complete trip route</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Map Container */}
              <div className="flex-1 min-h-0">
                <TripMap locations={tripData.locations} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
