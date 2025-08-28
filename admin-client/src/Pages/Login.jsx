import { useState } from "react";
import { useDispatch } from "react-redux";
import { setUser } from "../store/userSlice";
import axios from "axios";
import baseUrl from "../services/baseUrl";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  /* Access dispatch function from Redux */
  const dispatch = useDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      /* Call login API */
      const res = await axios.post(`${baseUrl}/api/auth/login`, {
        email,
        password,
        clientType: "web"
      });

      /* On success, store token and update Redux state */
      if (res.data.status === 200 && res.data.data && res.data.data.token) {
        localStorage.setItem("token", res.data.data.token);
        dispatch(setUser(res.data.data.user));
      } else {
        setError(res.data.message || "Login failed");
      }
    }catch(err) {
      setError("Invalid credentials"+err.message);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold text-center text-gray-800">Superuser Login</h2>
        {error && <p className="text-red-500 text-center">{error}</p>}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              className="w-full px-4 py-2 mt-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Password</label>
            <input
              type="password"
              className="w-full px-4 py-2 mt-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
export default Login;