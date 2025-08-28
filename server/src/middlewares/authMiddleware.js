import jwt from "jsonwebtoken";
import User from "../models/User.js";
import handleResponse from "../controllers/controllerFunction.js";

// Middleware to protect routes for superuser access only
const protectSuperuser = async (req, res, next) => {
  try {
    /* Get token from headers */
    const token = req.headers.authorization?.split(" ")[1];

  if (!token) return handleResponse(res, 401, "No token provided", null);

    /* Verify token and extract user ID */
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    /* Fetch user from database */
    const user = await User.findById(decoded.id);

    /* Check if user exists and is a superuser */
    if (!user || user.role !== "superuser") {
      return handleResponse(res, 403, "Not authorized as superuser", null);
    }

    /* Attach user to request object */
    req.user = user;

    /* Proceed to next middleware or route handler */
    next();
  } catch (error) {
  handleResponse(res, 401, "Invalid or expired token", null);
  }
};

export default protectSuperuser;
