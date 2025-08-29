import * as Location from 'expo-location';

export async function requestLocationPermissions() {
  let { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permission to access location was denied');
  }
  return true;
}

export async function getCurrentLocation() {
  return await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
}

export async function startLocationUpdates(callback, interval = 5000, distance = 2) {
  let lastSent = null;
  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: interval,
      distanceInterval: distance,
    },
    (location) => {
        
      const { latitude, longitude } = location.coords;
      const { timestamp } = location;
      
      if (!lastSent || Math.abs(latitude - lastSent.latitude) > 0.00005 || Math.abs(longitude - lastSent.longitude) > 0.00005) {
        callback({ latitude, longitude, timestamp });
        lastSent = { latitude, longitude };
      }
    }
  );
}

export async function stopLocationUpdates(subscription) {
  if (subscription) {
    subscription.remove();
  }
}
