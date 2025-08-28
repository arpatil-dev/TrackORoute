import User from "../models/User.js";
import bcrypt from "bcryptjs";

async function createDefaultSuperUser() {
  try {
    const existing = await User.findOne({ email: "admin@gmail.com" });
    if (!existing) {
      const hashedPassword = await bcrypt.hash("Admin@123", 10);
      const superuser = new User({
        firstName: "Super",
        lastName: "Admin",
        phone: "9999999999",
        address: "HQ",
        email: "admin@gmail.com",
        password: hashedPassword,
        role: "superuser",
      });
      await superuser.save();
      console.log("✅ Default superuser created!");
    } else {
      console.log("ℹ️ Superuser already exists");
    }
  } catch (err) {
    console.error("❌ Error creating superuser:", err);
  }
}
export default createDefaultSuperUser;