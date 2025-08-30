import AsyncStorage from '@react-native-async-storage/async-storage';
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
