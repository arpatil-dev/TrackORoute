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
