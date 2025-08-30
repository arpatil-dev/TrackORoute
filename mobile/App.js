import 'react-native-gesture-handler';

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { storeToken, getToken, removeToken, storeUser, getUser, removeUser } from './utils/storage';

import LoginScreen from './screens/LoginScreen';
import SplashScreen from './screens/SplashScreen';
import TripTrackingScreen from './screens/TripTrackingScreen';
import TripHistoryScreen from './screens/TripHistoryScreen';
import TripMapScreen from './screens/TripMapScreen';
import ProfileScreen from './screens/ProfileScreen';



const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();


export default function App() {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [user, setUser] = useState(null);
  
  // Get screen width for slide animation
  const screenWidth = Dimensions.get('window').width;
  
  // Animation values
  const splashTranslateX = useRef(new Animated.Value(0)).current;
  const loginTranslateX = useRef(new Animated.Value(screenWidth)).current;

  useEffect(() => {
    // Load token and user data from AsyncStorage on app start
    const loadUserSession = async () => {
      const storedToken = await getToken();
      const storedUser = await getUser();
      
      setToken(storedToken);
      setUser(storedUser);
      setLoading(false);
    };
    loadUserSession();
  }, []);

  const handleSplashComplete = () => {
    setIsTransitioning(true);
    
    // Animate splash screen sliding left and login screen sliding in from right
    Animated.parallel([
      Animated.timing(splashTranslateX, {
        toValue: -screenWidth,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(loginTranslateX, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Animation complete, hide splash screen
      setShowSplash(false);
      setIsTransitioning(false);
    });
  };

  const handleLogin = async (jwt, user) => {
    setToken(jwt);
    setUser(user);
    await storeToken(jwt);
    await storeUser(user);
  };

  const handleLogout = async () => {
    setToken(null);
    setUser(null);
    await removeToken();
    await removeUser();
  };

  // Show splash screen first
  if (showSplash || isTransitioning) {
    return (
      <View style={{ flex: 1, overflow: 'hidden' }}>
        {/* Splash Screen */}
        <Animated.View style={[
          { flex: 1, position: 'absolute', width: '100%', height: '100%' },
          { transform: [{ translateX: splashTranslateX }] }
        ]}>
          <SplashScreen onSplashComplete={handleSplashComplete} />
        </Animated.View>
        
        {/* Login Screen (during transition) */}
        {isTransitioning && (
          <Animated.View style={[
            { flex: 1, position: 'absolute', width: '100%', height: '100%' },
            { transform: [{ translateX: loginTranslateX }] }
          ]}>
            <LoginScreen onLogin={handleLogin} />
          </Animated.View>
        )}
      </View>
    );
  }

  if (loading) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#1e293b" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading TrackORoute...</Text>
        </View>
      </>
    );
  }

  if (!token) {
    // Only show login screen until authenticated
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Trip History" options={{ headerShown: false }}>
          {() => (
            <Tab.Navigator
              screenOptions={{
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: '#3b82f6',
                tabBarInactiveTintColor: '#64748b',
                tabBarLabelStyle: styles.tabBarLabel,
                tabBarItemStyle: styles.tabBarItem,
              }}
            >
              <Tab.Screen 
                name="Track"
                options={{
                  tabBarIcon: ({ focused }) => (
                    <Ionicons 
                      name="navigate-outline" 
                      size={24} 
                      color={focused ? '#3b82f6' : '#64748b'} 
                    />
                  ),
                }}
              >
                {() => <TripTrackingScreen token={token} />}
              </Tab.Screen>
              <Tab.Screen 
                name="History"
                options={{
                  tabBarIcon: ({ focused }) => (
                    <Ionicons 
                      name="time-outline" 
                      size={24} 
                      color={focused ? '#3b82f6' : '#64748b'} 
                    />
                  ),
                }}
              >
                {() => <TripHistoryScreen token={token} />}
              </Tab.Screen>
              <Tab.Screen 
                name="Profile"
                options={{
                  tabBarIcon: ({ focused }) => (
                    <Ionicons 
                      name="person-outline" 
                      size={24} 
                      color={focused ? '#3b82f6' : '#64748b'} 
                    />
                  ),
                }}
              >
                {() => <ProfileScreen onLogout={handleLogout} token={token} user={user} />}
              </Tab.Screen>
            </Tab.Navigator>
          )}
        </Stack.Screen>
        <Stack.Screen 
          name="TripMap" 
          component={TripMapScreen} 
          options={{ 
            title: 'Trip Details',
            headerStyle: styles.stackHeader,
            headerTintColor: '#ffffff',
            headerTitleStyle: styles.stackHeaderTitle,
          }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  // Loading Styles
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
    fontWeight: '500',
  },

  // Tab Bar Styles
  tabBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    height: 80,
    paddingBottom: 10,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  tabBarItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 0,
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
  },

  // Stack Header Styles
  stackHeader: {
    backgroundColor: '#1e293b',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  stackHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
});
