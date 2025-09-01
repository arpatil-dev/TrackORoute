import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import baseUrl from "../services/baseUrl";

export default function UserPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [message, setMessage] = useState("");
  const [trips, setTrips] = useState([]);

  // Filter states
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterMinDistance, setFilterMinDistance] = useState("");
  const [filterMaxDistance, setFilterMaxDistance] = useState("");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tripToDelete, setTripToDelete] = useState(null);

  // Fetch user's trips
  useEffect(() => {
    async function fetchTrips() {
      try {
        const res = await axios.get(`${baseUrl}/api/trips?userId=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTrips(res.data.data.trips || []);
      } catch (err) {
        console.error(err);
      }
    }
    fetchTrips();
  }, [id, token]);

  // Helper: Calculate trip distance (km)
  function getTripDistance(trip) {
    if (!trip.locations || trip.locations.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < trip.locations.length; i++) {
      const prev = trip.locations[i - 1];
      const curr = trip.locations[i];
      const R = 6371;
      const dLat = (curr.latitude - prev.latitude) * Math.PI / 180;
      const dLon = (curr.longitude - prev.longitude) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(prev.latitude * Math.PI / 180) * Math.cos(curr.latitude * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      total += R * c;
    }
    return total;
  }

  // Helper: Get trip date
  function getTripDate(trip) {
    if (!trip.locations || trip.locations.length === 0) return null;
    return new Date(trip.locations[0].timestamp);
  }

  // Helper: Group trips by date label
  function getDateLabel(date) {
    const today = new Date();
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diff = (t - d) / (1000 * 60 * 60 * 24);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return date.toLocaleDateString();
  }

  // Filter and sort trips
  const filteredTrips = trips
    .filter(trip => {
      const date = getTripDate(trip);
      if (!date) return false;
      if (filterStartDate && date < new Date(filterStartDate)) return false;
      if (filterEndDate && date > new Date(filterEndDate)) return false;
      const dist = getTripDistance(trip);
      if (filterMinDistance && dist < parseFloat(filterMinDistance)) return false;
      if (filterMaxDistance && dist > parseFloat(filterMaxDistance)) return false;
      return true;
    })
    .sort((a, b) => {
      const da = getTripDate(a);
      const db = getTripDate(b);
      return db - da;
    });

  // Group trips by date label
  const groupedTrips = {};
  filteredTrips.forEach(trip => {
    const date = getTripDate(trip);
    const label = getDateLabel(date);
    if (!groupedTrips[label]) groupedTrips[label] = [];
    groupedTrips[label].push(trip);
  });

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await axios.get(`${baseUrl}/api/superuser/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data.data);
        setFormData(res.data.data);
      } catch (err) {
        setMessage("Error fetching user" + err);
      }
    }
    fetchUser();
  }, [id, token]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value);
      });
      const res = await axios.put(
        `${baseUrl}/api/superuser/users/${id}`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setUser(res.data.data);
      setEditMode(false);
      setMessage("User updated successfully");
    } catch (err) {
      setMessage("Error updating user" + err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await axios.delete(`${baseUrl}/api/superuser/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage("User deleted successfully");
      setTimeout(() => navigate("/"), 1000);
    } catch (err) {
      setMessage("Error deleting user" + err);
    }
  };

  const handleDeleteTrip = async (tripId) => {
    setTripToDelete(tripId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTrip = async () => {
    try {
      await axios.delete(`${baseUrl}/api/trips/${tripToDelete}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTrips((trips) => trips.filter((t) => t._id !== tripToDelete));
      setShowDeleteConfirm(false);
      setTripToDelete(null);
    } catch (err) {
      alert("Error deleting trip: " + err.message);
      setShowDeleteConfirm(false);
      setTripToDelete(null);
    }
  };

  const cancelDeleteTrip = () => {
    setShowDeleteConfirm(false);
    setTripToDelete(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading user details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 sm:py-6 gap-4">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center space-x-4 order-1 sm:order-none">
              <button
                onClick={() => navigate("/")}
                className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </button>
              <div className="hidden sm:flex items-center text-slate-500">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                <span className="text-sm font-medium">User Profile</span>
              </div>
            </div>

            {/* Page Title */}
            <div className="text-center sm:flex-1 order-2 sm:order-none">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                User Management
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                View and manage user details
              </p>
            </div>

            <div className="hidden sm:block sm:w-32"></div> {/* Spacer for centering on larger screens */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* User Profile Card - Left Side */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              {/* Profile Header */}
              <div className="px-6 py-8 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-center">
                <div className="relative">
                  <img
                    src={user.photo || "/default-avatar.png"}
                    alt={user.firstName}
                    className="w-24 h-24 rounded-full mx-auto mb-4 object-cover ring-4 ring-white shadow-lg"
                  />
                  {!editMode && (
                    <div className="absolute top-0 right-0 bg-green-500 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <h2 className="text-2xl font-bold mb-2">
                  {user.firstName} {user.lastName}
                </h2>
                <p className="text-blue-100 text-sm">
                  Member since{" "}
                  {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                </p>
              </div>

              {/* Success/Error Message */}
              {message && (
                <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
                  <div className="flex items-center">
                    <svg
                      className="h-5 w-5 text-blue-500 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-blue-700 text-sm font-medium">{message}</p>
                  </div>
                </div>
              )}

              {/* User Details */}
              <div className="px-6 py-6">
                {!editMode ? (
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <svg
                        className="w-5 h-5 text-slate-400 mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                        />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {user.email}
                        </p>
                        <p className="text-xs text-slate-500">
                          Email Address
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <svg
                        className="w-5 h-5 text-slate-400 mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {user.phone}
                        </p>
                        <p className="text-xs text-slate-500">
                          Phone Number
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <svg
                        className="w-5 h-5 text-slate-400 mr-3 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {user.address}
                        </p>
                        <p className="text-xs text-slate-500">Address</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-3 pt-4">
                      <button
                        className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                        onClick={() => setEditMode(true)}
                      >
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Edit
                      </button>
                      <button
                        className="inline-flex items-center justify-center px-4 py-2 border border-red-300 text-sm font-medium rounded-xl text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
                        onClick={handleDelete}
                      >
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleEdit} className="space-y-4">
                    <div className="text-center mb-6">
                      <h3 className="text-lg font-semibold text-slate-900">
                        Edit User Details
                      </h3>
                      <p className="text-sm text-slate-600">
                        Update user information
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          First Name
                        </label>
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName || ""}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                          placeholder="First Name"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Last Name
                        </label>
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName || ""}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                          placeholder="Last Name"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email || ""}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                        placeholder="Email"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="text"
                        name="phone"
                        value={formData.phone || ""}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                        placeholder="Phone"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address || ""}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                        placeholder="Address"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Photo
                      </label>
                      <input
                        type="file"
                        name="photo"
                        accept="image/*"
                        onChange={(e) =>
                          setFormData({ ...formData, photo: e.target.files[0] })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>

                    <div className="flex space-x-3 pt-2">
                      <button
                        type="submit"
                        className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                      >
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Save
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-xl text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all duration-200"
                        onClick={() => setEditMode(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Trip History - Right Side */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">

              {/* Trip History Header & Filters */}
              <div className="px-6 py-6 border-b border-slate-200 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Trip History</h3>
                    <p className="text-sm text-slate-600 mt-1">{filteredTrips.length} trips found</p>
                  </div>
                  
                  {/* Filter Button & Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                      className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                      </svg>
                      Filters
                      {(filterStartDate || filterEndDate || filterMinDistance || filterMaxDistance) && (
                        <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded-full">
                          {[filterStartDate, filterEndDate, filterMinDistance, filterMaxDistance].filter(Boolean).length}
                        </span>
                      )}
                      <svg className={`w-4 h-4 ml-2 transition-transform duration-200 ${showFilterDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {showFilterDropdown && (
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-99">
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-semibold text-slate-900">Filter Trips</h4>
                            {(filterStartDate || filterEndDate || filterMinDistance || filterMaxDistance) && (
                              <button
                                onClick={() => {
                                  setFilterStartDate("");
                                  setFilterEndDate("");
                                  setFilterMinDistance("");
                                  setFilterMaxDistance("");
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                              >
                                Clear all
                              </button>
                            )}
                          </div>
                          
                          {/* Date Range */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Date Range</label>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <input
                                  type="date"
                                  value={filterStartDate}
                                  onChange={e => setFilterStartDate(e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  style={{ colorScheme: 'light' }}
                                />
                                <span className="text-xs text-slate-500 mt-1 block">From</span>
                              </div>
                              <div>
                                <input
                                  type="date"
                                  value={filterEndDate}
                                  onChange={e => setFilterEndDate(e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  style={{ colorScheme: 'light' }}
                                />
                                <span className="text-xs text-slate-500 mt-1 block">To</span>
                              </div>
                            </div>
                          </div>

                          {/* Distance Range */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Distance Range (km)</label>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={filterMinDistance}
                                  onChange={e => setFilterMinDistance(e.target.value)}
                                  placeholder="Min"
                                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={filterMaxDistance}
                                  onChange={e => setFilterMaxDistance(e.target.value)}
                                  placeholder="Max"
                                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Apply Button */}
                          <div className="flex justify-end">
                            <button
                              onClick={() => setShowFilterDropdown(false)}
                              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              Apply Filters
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Trip List with Grouping */}
              <div className="h-96 overflow-y-auto">
                {filteredTrips.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-slate-900">No trips found</h3>
                    <p className="mt-1 text-sm text-slate-500">No trips match the selected filters.</p>
                  </div>
                ) : (
                  <div>
                    {Object.entries(groupedTrips).map(([label, trips]) => (
                      <div key={label}>
                        <div className="bg-slate-100 px-6 py-2 text-xs font-semibold text-slate-600 sticky top-0 z-10">{label}</div>
                        <div className="divide-y divide-slate-200">
                          {trips.map(trip => (
                            <div key={trip._id} className="block hover:bg-slate-50 transition-colors duration-200">
                              <div className="px-6 py-4 flex items-center justify-between">
                                <Link to={`/trip/${trip._id}`} className="flex-1 flex items-center space-x-4">
                                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">{trip.tripName || `Trip ${trip._id.slice(-6)}`}</p>
                                    <p className="text-sm text-slate-500">
                                      {getTripDate(trip)?.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                    <p className="text-xs text-slate-400">{getTripDistance(trip).toFixed(2)} km &bull; {trip.locations ? trip.locations.length : 0} points</p>
                                  </div>
                                </Link>
                                <button 
                                  onClick={() => handleDeleteTrip(trip._id)} 
                                  className="ml-4 inline-flex items-center justify-center w-8 h-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500 transition-all duration-200 group" 
                                  title="Delete trip"
                                >
                                  <svg className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/10 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 transform transition-all">
            <div className="px-5 py-5">
              {/* Icon */}
              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
              </div>
              
              {/* Title */}
              <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Delete Trip</h3>
              
              {/* Message */}
              <p className="text-slate-600 text-center mb-5 text-sm">
                Are you sure you want to delete this trip? This action cannot be undone.
              </p>
              
              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={cancelDeleteTrip}
                  className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteTrip}
                  className="flex-1 px-3 py-2.5 bg-red-600 border border-red-600 rounded-lg text-sm font-medium text-white hover:bg-red-700 hover:border-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
