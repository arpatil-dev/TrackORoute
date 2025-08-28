import { useSelector, useDispatch } from "react-redux";
import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import axios from "axios";
import { setUser } from "./store/userSlice";
import baseUrl from "./services/baseUrl";
import Login from "./Pages/Login";
import Dashboard from "./Pages/Dashboard";
import UserPage from "./Pages/UserPage";

export default function App() {
  const user = useSelector((state) => state.userState.user);
  const dispatch = useDispatch();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && !user) {
      axios.get(`${baseUrl}/api/superuser/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        if (res.data.status === 200 && res.data.data) {
          dispatch(setUser(res.data.data));
        }
      })
      .catch(() => {});
    }
  }, [user, dispatch]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={!user ? <Login /> : <Dashboard />} />
        <Route path="/user/:id" element={<UserPage />} />
      </Routes>
    </Router>
  );
}
