import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from "expo-sqlite";

// --- SQLite Setup & Batch Location Helpers (Async API) ---

let db;

// Initialize DB and tables
export const initDB = async () => {
  if (!db) {
    db = await SQLite.openDatabaseAsync("trackoroute.db");
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      latitude REAL,
      longitude REAL,
      timestamp INTEGER,
      sent INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at INTEGER
    );
  `);
};

// Insert a location point
export const insertLocation = async (latitude, longitude, timestamp) => {
  await db.runAsync(
    "INSERT INTO locations (latitude, longitude, timestamp, sent) VALUES (?, ?, ?, 0);",
    [latitude, longitude, timestamp]
  );
};

// Get unsent location points (for batching)
export const getUnsentLocations = async (limit = 10) => {
  const rows = await db.getAllAsync(
    "SELECT * FROM locations WHERE sent = 0 ORDER BY timestamp ASC LIMIT ?;",
    [limit]
  );
  return rows || [];
};

// Mark locations as sent after successful upload
export const markLocationsAsSent = async (ids = []) => {
  if (ids.length === 0) return;
  await db.runAsync(
    `UPDATE locations SET sent = 1 WHERE id IN (${ids.map(() => "?").join(",")});`,
    ids
  );
};

// Utility: Clear all locations (for testing/debug)
export const clearLocations = async () => {
  await db.execAsync("DELETE FROM locations;");
};


// Usage:
// 1. Call initDB() once on app start
// 2. Use insertLocation() to save points
// 3. Use getUnsentLocations() to fetch batch for upload
// 4. Use markLocationsAsSent() after successful upload

/* AsyncStorage is used for persistent key-value storage */
/* Token storage functions */
export const storeToken = async (token) => {
  try {
    /* Save the JWT token in AsyncStorage */
    await AsyncStorage.setItem('jwtToken', token);
  } catch (e) {
    console.error('Error saving token', e);
  }
};

/* Retrieve the stored token */
export const getToken = async () => {
  try {
    /* Get the JWT token from AsyncStorage */
    const value = await AsyncStorage.getItem('jwtToken');
    return value;
  } catch (e) {
    console.error('Error reading token', e);
    return null;
  }
};

/* Remove the stored token */
export const removeToken = async () => {
  try {
    /* Remove the JWT token from AsyncStorage */
    await AsyncStorage.removeItem('jwtToken');
  } catch (e) {
    console.error('Error removing token', e);
  }
};

/* User data storage functions */
export const storeUser = async (user) => {
  try {
    /* Save the user data as a JSON string in AsyncStorage */
    await AsyncStorage.setItem('userData', JSON.stringify(user));
  } catch (e) {
    console.error('Error saving user data', e);
  }
};

/* Retrieve the stored user data */
export const getUser = async () => {
  try {
    /* Get the user data from AsyncStorage and parse it */
    const value = await AsyncStorage.getItem('userData');
    return value ? JSON.parse(value) : null;
  } catch (e) {
    console.error('Error reading user data', e);
    return null;
  }
};

/* Remove the stored user data */
export const removeUser = async () => {
  try {
    /* Remove the user data from AsyncStorage */
    await AsyncStorage.removeItem('userData');
  } catch (e) {
    console.error('Error removing user data', e);
  }
};

export const storeTripId = async (tripId) => {
  try {
    /* Save the trip ID in AsyncStorage */
    await AsyncStorage.setItem('tripId', tripId);
  } catch (e) {
    console.error('Error saving tripId', e);
  }
};

export const getTripId = async () => {
  try {
    /* Get the trip ID from AsyncStorage */
    const value = await AsyncStorage.getItem('tripId');
    return value;
  } catch (e) {
    console.error('Error reading tripId', e);
    return null;
  } 
};

export const removeTripId = async () => {
  try {
    /* Remove the trip ID from AsyncStorage */
    await AsyncStorage.removeItem('tripId');
  } catch (e) {
    console.error('Error removing tripId', e);
  }
};

/* Clear all stored data (token, user, tripId) */
export const clearAllStorage = async () => {
  try { 
    await AsyncStorage.multiRemove(['jwtToken', 'userData', 'tripId']);
  } catch (e) {
    console.error('Error clearing storage', e);
  }
};

export async function setTrackingMode(mode) {
  await AsyncStorage.setItem('trackingMode', mode);
}

export async function getTrackingMode() {
  return await AsyncStorage.getItem('trackingMode');
}