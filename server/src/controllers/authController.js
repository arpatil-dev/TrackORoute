import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import handleResponse from "./controllerFunction.js";
// Unified login for user and superuser
const login = async (req, res) => {
  try {
    const { email, password, clientType } = req.body;

    /* Find user by email */
    const user = await User.findOne({ email });
    if (!user) return handleResponse(res, 401, "Invalid credentials", null);

    /* Compare password */
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return handleResponse(res, 401, "Invalid credentials", null);

    /* Optional: enforce role by clientType */
    if (clientType === "web" && user.role !== "superuser") {
      return handleResponse(res, 403, "Only superuser can log in to web app", null);
    }
    /* Regular users can only log in via mobile app */
    if (clientType === "mobile" && user.role !== "user") {
      return handleResponse(res, 403, "Only regular user can log in to mobile app", null);
    }

    /* Generate JWT */
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });
    handleResponse(res, 200, "Login successful", {
      token,
      user: { id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role }
    });
  } catch (error) {
    handleResponse(res, 500, "Server error", null);
  }
};

export default login;