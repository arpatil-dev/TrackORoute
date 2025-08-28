import mongoose from 'mongoose';
import dotenv from 'dotenv';
// import createDefaultSuperUser from '../utils/SuperUserCreate.js';

// Load env variables
dotenv.config();

// MongoDB connection function
const connectDB = async () => {
    try {
        // MongoDB connection
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected');
        // createDefaultSuperUser();
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    }
};
export default connectDB;
