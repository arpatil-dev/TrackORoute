

import React, { useState, useEffect } from 'react';
import { View, Text, Button } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import LoginScreen from './screens/LoginScreen';
import TripTrackingScreen from './screens/TripTrackingScreen';
import TripHistoryScreen from './screens/TripHistoryScreen';
import { storeToken, getToken, removeToken } from './utils/storage';

const Tab = createBottomTabNavigator();


export default function App() {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load token from AsyncStorage on app start
    const loadToken = async () => {
      const storedToken = await getToken();
      setToken(storedToken);
      setLoading(false);
    };
    loadToken();
  }, []);

  const handleLogin = async (jwt) => {
    setToken(jwt);
    await storeToken(jwt);
  };

  const handleLogout = async () => {
    setToken(null);
    await removeToken();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!token) {
    // Only show login screen until authenticated
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Track">
          {() => <TripTrackingScreen token={token} />}
        </Tab.Screen>
        <Tab.Screen name="History" component={TripHistoryScreen} />
        <Tab.Screen name="Logout">
          {() => <LogoutScreen onLogout={handleLogout} token={token} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

function LogoutScreen({ onLogout, token }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 32 }}>Profile</Text>
      <Text style={{ marginBottom: 16 }}>Logged in with token:</Text>
      <Text style={{ marginBottom: 32, fontSize: 12 }}>{token}</Text>
      <Button title="Logout" onPress={onLogout} />
    </View>
  );
}
