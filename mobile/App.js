
import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './screens/LoginScreen';
import TripTrackingScreen from './screens/TripTrackingScreen';
import TripHistoryScreen from './screens/TripHistoryScreen';
import TripMapScreen from './screens/TripMapScreen';
import { storeToken, getToken, removeToken } from './utils/storage';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();


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
        <Stack.Screen name="MainTabs" options={{ headerShown: false }}>
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
                    <Text style={[styles.tabIcon, { color: focused ? '#3b82f6' : '#64748b' }]}>
                      🚀
                    </Text>
                  ),
                }}
              >
                {() => <TripTrackingScreen token={token} />}
              </Tab.Screen>
              <Tab.Screen 
                name="History"
                options={{
                  tabBarIcon: ({ focused }) => (
                    <Text style={[styles.tabIcon, { color: focused ? '#3b82f6' : '#64748b' }]}>
                      📋
                    </Text>
                  ),
                }}
              >
                {() => <TripHistoryScreen token={token} />}
              </Tab.Screen>
              <Tab.Screen 
                name="Profile"
                options={{
                  tabBarIcon: ({ focused }) => (
                    <Text style={[styles.tabIcon, { color: focused ? '#3b82f6' : '#64748b' }]}>
                      👤
                    </Text>
                  ),
                }}
              >
                {() => <LogoutScreen onLogout={handleLogout} token={token} />}
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

function LogoutScreen({ onLogout, token }) {
  const truncatedToken = token ? `${token.substring(0, 20)}...` : '';
  
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#1e293b" />
      <View style={styles.profileContainer}>
        {/* Header Section */}
        <View style={styles.profileHeaderContainer}>
          <Text style={styles.profileTitle}>Profile</Text>
          <Text style={styles.profileSubtitle}>Manage your account</Text>
        </View>

        {/* Profile Info Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>👤</Text>
          </View>
          <Text style={styles.profileName}>TrackORoute User</Text>
          <Text style={styles.profileEmail}>Authenticated User</Text>
        </View>

        {/* Token Info Card */}
        <View style={styles.tokenCard}>
          <View style={styles.tokenHeader}>
            <Text style={styles.tokenTitle}>Session Token</Text>
            <Text style={styles.tokenStatus}>🟢 Active</Text>
          </View>
          <Text style={styles.tokenValue}>{truncatedToken}</Text>
          <Text style={styles.tokenDescription}>
            Your secure authentication token for API access
          </Text>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={onLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutButtonText}>🚪 Sign Out</Text>
        </TouchableOpacity>

        {/* App Info */}
        <View style={styles.appInfoContainer}>
          <Text style={styles.appInfoText}>TrackORoute v1.0</Text>
          <Text style={styles.appInfoSubtext}>Built with React Native</Text>
        </View>
      </View>
    </>
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
    paddingBottom: 20,
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
    marginTop: 4,
  },
  tabBarItem: {
    paddingVertical: 8,
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

  // Profile Screen Styles
  profileContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
  },
  profileHeaderContainer: {
    paddingTop: 60,
    paddingBottom: 32,
    alignItems: 'center',
  },
  profileTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  profileSubtitle: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '400',
  },

  // Profile Card Styles
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    backgroundColor: '#eff6ff',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#3b82f6',
  },
  profileAvatarText: {
    fontSize: 32,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '400',
  },

  // Token Card Styles
  tokenCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tokenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tokenTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  tokenStatus: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  tokenValue: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#374151',
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  tokenDescription: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },

  // Logout Button Styles
  logoutButton: {
    height: 56,
    backgroundColor: '#ef4444',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#ef4444',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.5,
  },

  // App Info Styles
  appInfoContainer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: 40,
  },
  appInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  appInfoSubtext: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '400',
  },
});
