import AsyncStorage from '@react-native-async-storage/async-storage';

export const storeToken = async (token) => {
  try {
    await AsyncStorage.setItem('jwtToken', token);
  } catch (e) {
    // saving error
    console.error('Error saving token', e);
  }
};

export const getToken = async () => {
  try {
    const value = await AsyncStorage.getItem('jwtToken');
    return value;
  } catch (e) {
    // reading error
    console.error('Error reading token', e);
    return null;
  }
};

export const removeToken = async () => {
  try {
    await AsyncStorage.removeItem('jwtToken');
  } catch (e) {
    // remove error
    console.error('Error removing token', e);
  }
};

// User data storage functions
export const storeUser = async (user) => {
  try {
    await AsyncStorage.setItem('userData', JSON.stringify(user));
  } catch (e) {
    console.error('Error saving user data', e);
  }
};

export const getUser = async () => {
  try {
    const value = await AsyncStorage.getItem('userData');
    return value ? JSON.parse(value) : null;
  } catch (e) {
    console.error('Error reading user data', e);
    return null;
  }
};

export const removeUser = async () => {
  try {
    await AsyncStorage.removeItem('userData');
  } catch (e) {
    console.error('Error removing user data', e);
  }
};
