import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

// env config load
dotenv.config();

// express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// DB connect
connectDB();

// Routes
app.get("/", (req, res) => res.send("API running..."));

// export for testing
export default app;
