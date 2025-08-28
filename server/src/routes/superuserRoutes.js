
import express from "express";
import authenticate from "../middlewares/authenticate.js";
import requireRole from "../middlewares/requireRole.js";
import upload from "../utils/multerConfig.js";
import { listUsers, getUser, updateUser, deleteUser, addUser, getCurrentSuperuser } from '../controllers/superuserController.js';
/* Initialize router */
const router = express.Router();

/* Add User (protected route) */
router.post("/users", authenticate, requireRole("superuser"), upload.single("photo"), addUser);

// List all users
router.get('/users', authenticate, requireRole('superuser'), listUsers);

// Get specific user details
router.get('/users/:id', authenticate, requireRole('superuser'), getUser);

// Update user details (with photo upload)
router.put('/users/:id', authenticate, requireRole('superuser'), upload.single('photo'), updateUser);

// Delete user
router.delete('/users/:id', authenticate, requireRole('superuser'), deleteUser);

// Get current superuser info
router.get('/me', authenticate, requireRole('superuser'), getCurrentSuperuser);


export default router;
