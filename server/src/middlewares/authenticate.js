import jwt from "jsonwebtoken";
import User from "../models/User.js";
import handleResponse from "../controllers/controllerFunction.js";

// Unified JWT verification middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return handleResponse(res, 401, "No token provided", null);

    // Verify token and extract payload
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return handleResponse(res, 401, "User not found", null);

    // Attach user and role to request
    req.user = user;
    req.user.role = decoded.role;
    next();
  } catch (error) {
    handleResponse(res, 401, "Invalid or expired token", null);
  }
};

export default authenticate;
