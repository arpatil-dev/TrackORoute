import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../store/userSlice";
import axios from "axios";
import baseUrl from "../services/baseUrl";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const token = localStorage.getItem("token");
  /* Access user state from Redux store */
  const user = useSelector((state) => state.userState.user);
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    email: "",
    password: "",
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();
  // Fetch users on mount
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await axios.get(`${baseUrl}/api/superuser/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(res.data.data || []);
      } catch (err) {
        console.error("Error fetching users", err);
      }
    }
    fetchUsers();
  }, [token]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setPhotoFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value);
      });
      if (photoFile) {
        data.append("photo", photoFile);
      }
      /* Send POST request to create new user */
      const res = await axios.post(
        `${baseUrl}/api/superuser/users`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setMessage(res.data.message);
      setFormData({
        firstName: "",
        lastName: "",
        phone: "",
        address: "",
        email: "",
        password: "",
      });
      setPhotoFile(null);
      // Refresh user list after adding
      const usersRes = await axios.get(`${baseUrl}/api/superuser/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(usersRes.data.data || []);
    } catch (err) {
      setMessage(err.response?.data?.message || "Error creating user");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    dispatch(logout());
  };


  return (
    <div className="max-w-lg mx-auto p-6 bg-white shadow-lg rounded-2xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-center">Add New User</h2>
        {user && (
          <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-1 rounded-lg hover:bg-red-600">Logout</button>
        )}
      </div>
      {user && (
        <div className="mb-4 text-sm text-gray-700">Logged in as: <span className="font-semibold">{user.email}</span></div>
      )}
      {message && (
        <p className="mb-4 text-center text-sm font-medium text-blue-600">
          {message}
        </p>
      )}
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 mb-8">
        {/* ...existing form code... */}
        <input
          type="text"
          name="firstName"
          placeholder="First Name"
          value={formData.firstName}
          onChange={handleChange}
          className="col-span-1 p-2 border rounded-lg"
          required
        />
        <input
          type="text"
          name="lastName"
          placeholder="Last Name"
          value={formData.lastName}
          onChange={handleChange}
          className="col-span-1 p-2 border rounded-lg"
          required
        />
        <input
          type="text"
          name="phone"
          placeholder="Phone"
          value={formData.phone}
          onChange={handleChange}
          className="col-span-2 p-2 border rounded-lg"
          required
        />
        <input
          type="text"
          name="address"
          placeholder="Address"
          value={formData.address}
          onChange={handleChange}
          className="col-span-2 p-2 border rounded-lg"
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          className="col-span-2 p-2 border rounded-lg"
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          className="col-span-2 p-2 border rounded-lg"
          required
        />
        <input
          type="file"
          name="photo"
          accept="image/*"
          onChange={handleFileChange}
          className="col-span-2 p-2 border rounded-lg"
        />
        <button
          type="submit"
          className="col-span-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Add User
        </button>
      </form>
      {/* User list display */}
      <h3 className="text-xl font-bold mb-2">Users</h3>
      <div className="space-y-4">
        {users.map(u => (
          <div key={u._id} className="flex items-center gap-4 p-2 border rounded-lg cursor-pointer hover:bg-gray-100" onClick={() => navigate(`/user/${u._id}`)}>
            <img src={u.photo ? `${u.photo}` : '/default-avatar.png'} alt={u.firstName} className="w-12 h-12 rounded-full object-cover" />
            <span className="font-semibold">{u.firstName} {u.lastName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

