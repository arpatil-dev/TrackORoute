import * as Location from 'expo-location';
/* expo-location is used for accessing device location services */
/* Request location permissions from the user */
export async function requestLocationPermissions() {
  /* Request foreground location permissions */
  let { status } = await Location.requestForegroundPermissionsAsync();
  /* If not granted, throw an error */
  if (status !== 'granted') {
    throw new Error('Permission to access location was denied');
  }
  /* If granted, return true*/
  return true;
}

/* Get the current location of the device */
export async function getCurrentLocation() {
  return await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
}

/* Start watching location changes with specified interval and distance 
  Calls the provided callback with location updates 
  Default interval is 5000ms and distance is 2 meters 
  Throttles updates to avoid excessive calls 
  Only calls callback if location changes significantly 
  Returns the subscription object to allow stopping updates */
export async function startLocationUpdates(callback, interval = 5000, distance = 2) {
  let lastSent = null;
  /* Start watching position with given accuracy, time interval, and distance interval */
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

/* Stop watching location changes by removing the subscription */
export async function stopLocationUpdates(subscription) {
  /* Remove the subscription to stop receiving location updates */
  if (subscription) {
    subscription.remove();
  }
}