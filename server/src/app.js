import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

// Routes import
import authRoutes from "./routes/authRoutes.js";
import superuserRoutes from "./routes/superuserRoutes.js";
import tripRoutes from "./routes/tripRoutes.js";

// env config load
dotenv.config();

// express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// DB connect
connectDB();

// Routes
app.get("/", (req, res) => res.send("API running..."));

/* Use Routes */
app.use("/api/auth", authRoutes);
app.use("/api/superuser", superuserRoutes);
app.use("/api/trips", tripRoutes);

// export for testing
export default app;
