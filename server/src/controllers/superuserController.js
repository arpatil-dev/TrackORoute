import User from "../models/User.js";
import bcrypt from "bcryptjs";
import handleResponse from "./controllerFunction.js";

// Add User (only by superuser)
export const addUser = async (req, res) => {
  try {
  const { firstName, lastName, phone, address, email, password } = req.body;

    /* Check if email already exists */
    const existingUser = await User.findOne({ email });
  if (existingUser) return handleResponse(res, 400, "Email already exists", null);

    /* Hash password before saving */
    const hashedPassword = await bcrypt.hash(password, 10);

    /* Create new user with role 'user' */
    const newUser = new User({
      firstName,
      lastName,
      phone,
      address,
      email,
      password: hashedPassword,
  photo: req.file ? req.file.path : undefined,
      role: "user"
    });

    /* Save user to database */
    await newUser.save();
    
    /* Respond with success and user info */
  handleResponse(res, 201, "User created successfully", { user: newUser });
  } catch (error) {
  handleResponse(res, 500, "Server error", null);
  }
};

// List all users
export const listUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('-password');
    handleResponse(res, 200, 'Users fetched successfully', users);
  } catch (error) {
    handleResponse(res, 500, 'Server error', null);
  }
};

// Get specific user details
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user || user.role !== 'user') return handleResponse(res, 404, 'User not found', null);
    handleResponse(res, 200, 'User fetched successfully', user);
  } catch (error) {
    handleResponse(res, 500, 'Server error', null);
  }
};

// Update user details
export const updateUser = async (req, res) => {
  try {
    const updateData = { ...req.body };
  if (req.file) updateData.photo = req.file.path;
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }
    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
    if (!user || user.role !== 'user') return handleResponse(res, 404, 'User not found', null);
    handleResponse(res, 200, 'User updated successfully', user);
  } catch (error) {
    handleResponse(res, 500, 'Server error', null);
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user || user.role !== 'user') return handleResponse(res, 404, 'User not found', null);
    handleResponse(res, 200, 'User deleted successfully', null);
  } catch (error) {
    handleResponse(res, 500, 'Server error', null);
  }
};

export const getCurrentSuperuser = async (req, res) => {
  try {
		const user = req.user;
		if (!user || user.role !== 'superuser') return res.status(403).json({ status: 403, message: 'Forbidden', data: null });
		res.status(200).json({ status: 200, message: 'Superuser info', data: {
			id: user._id,
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email,
			role: user.role
		}});
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: null });
	}
}

