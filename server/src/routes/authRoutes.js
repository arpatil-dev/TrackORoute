import login from "../controllers/authController.js";
import express from "express";

/* Initialize router */
const router = express.Router();

/* Unified login for user and superuser */
router.post("/login", login);

export default router;
