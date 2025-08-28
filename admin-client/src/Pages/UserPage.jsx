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
  // Fetch user's trips
  useEffect(() => {
    async function fetchTrips() {
      try {
        const res = await axios.get(`${baseUrl}/api/trips?userId=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log(res.data.data.trips);
        setTrips(res.data.data.trips || []);
      } catch (err) {
        console.error(err);
      }
    }
    fetchTrips();
  }, [id, token]);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await axios.get(`${baseUrl}/api/superuser/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data.data);
        setFormData(res.data.data);
      } catch (err) {
        setMessage("Error fetching user"+err);
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
      const res = await axios.put(`${baseUrl}/api/superuser/users/${id}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      setUser(res.data.data);
      setEditMode(false);
      setMessage("User updated successfully");
    } catch (err) {
      setMessage("Error updating user"+err);
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
      setMessage("Error deleting user"+err);
    }
  };





  if (!user) return <div className="max-w-lg mx-auto p-6 bg-white shadow-lg rounded-2xl mt-8">Loading...</div>;

  return (
    <div className="max-w-lg mx-auto p-6 bg-white shadow-lg rounded-2xl mt-8">
      <h2 className="text-2xl font-bold mb-4 text-center">User Details</h2>
      {message && <p className="mb-4 text-center text-blue-600">{message}</p>}
      <img src={user.photo} alt={user.firstName} className="w-24 h-24 rounded-full mx-auto mb-4 object-cover" />
      {!editMode ? (
        <>
          <div className="mb-2"><b>Name:</b> {user.firstName} {user.lastName}</div>
          <div className="mb-2"><b>Email:</b> {user.email}</div>
          <div className="mb-2"><b>Phone:</b> {user.phone}</div>
          <div className="mb-2"><b>Address:</b> {user.address}</div>
          <div className="flex gap-4 mt-6">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg" onClick={() => setEditMode(true)}>Edit</button>
            <button className="bg-red-500 text-white px-4 py-2 rounded-lg" onClick={handleDelete}>Delete</button>
          </div>
        </>
      ) : (
        <form onSubmit={handleEdit} className="space-y-4">
          <input type="text" name="firstName" value={formData.firstName || ""} onChange={handleChange} className="w-full p-2 border rounded-lg" placeholder="First Name" required />
          <input type="text" name="lastName" value={formData.lastName || ""} onChange={handleChange} className="w-full p-2 border rounded-lg" placeholder="Last Name" required />
          <input type="email" name="email" value={formData.email || ""} onChange={handleChange} className="w-full p-2 border rounded-lg" placeholder="Email" required />
          <input type="text" name="phone" value={formData.phone || ""} onChange={handleChange} className="w-full p-2 border rounded-lg" placeholder="Phone" required />
          <input type="text" name="address" value={formData.address || ""} onChange={handleChange} className="w-full p-2 border rounded-lg" placeholder="Address" required />
          <input type="file" name="photo" accept="image/*" onChange={e => setFormData({ ...formData, photo: e.target.files[0] })} className="w-full p-2 border rounded-lg" />
          <div className="flex gap-4">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg">Save</button>
            <button type="button" className="bg-gray-400 text-white px-4 py-2 rounded-lg" onClick={() => setEditMode(false)}>Cancel</button>
          </div>
        </form>
      )}
      {/* ...existing code... */}
      <hr className="my-8" />
      <h3 className="text-xl font-bold mb-4">Trip History</h3>
      <div className="space-y-4">
        {trips.length === 0 && <div className="text-gray-500">No trips found.</div>
        }{console.log(trips)}
        {trips.map(trip => (
          <Link to={`/trip/${trip._id}`} key={trip._id} className="block">
            <div className="p-4 border rounded-lg shadow hover:bg-gray-100 cursor-pointer">
              <div className="font-semibold">{trip.tripName || trip._id}</div>
              <div className="text-sm text-gray-600">{new Date(trip.locations[0].timestamp).toLocaleString()}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
