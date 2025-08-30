import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, StatusBar, RefreshControl, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';

export default function TripHistoryScreen({ token }) {
  /* Trip Data State */
  const [trips, setTrips] = useState([]);

  /* Pull-to-refresh State */
  const [refreshing, setRefreshing] = useState(false);

  /* Navigation */
  const navigation = useNavigation();

  /* Loading State */
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /* Initial fetch of trips */
    fetchTrips();
  }, [token]);

  /* Fetch trips from API */
  const fetchTrips = async () => {
    try {
      /* await api call to get trips */
      const res = await api.get('/trips?userId=me', {
        headers: { Authorization: `Bearer ${token}` }
      });

      /* Update state with fetched trips */
      setTrips(res.data.data.trips || []);
    } catch (err) {
      setTrips([]);
    }
    setLoading(false);
  };

  /* Pull-to-refresh handler */
  const onRefresh = async () => {
    setRefreshing(true);
    /* await api call to fetch and refresh trips */
    await fetchTrips();
    setRefreshing(false);
  };

  /* Format date to readable string */
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    /* Human-friendly date formatting */
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  /* Format time to readable string */
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    /* 12-hour time format */
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  /* Render individual trip item */
  const renderTrip = ({ item, index }) => {
    /* Safe navigation with location validation */
    const handleTripPress = () => {
      const locations = item.locations || [];
      /* Only navigate if we have valid locations */
      if (locations.length > 0) {
        navigation.navigate('TripMap', { locations });
      } else {
        /* Show alert if no location data */
        Alert.alert('No Location Data', 'This trip doesn\'t have any location data to display on the map.');
      }
    };

    return (
      <TouchableOpacity
        style={styles.tripCard}
        onPress={handleTripPress}
        activeOpacity={0.8}
      >
        <View style={styles.tripHeader}>
          <View style={styles.tripIcon}>
            <Ionicons name="map-outline" size={24} color="#3b82f6" />
          </View>
          <View style={styles.tripInfo}>
            <Text style={styles.tripName} numberOfLines={1}>
              {item.tripName || 'Unnamed Trip'}
            </Text>
          <View style={styles.tripMeta}>
            <Text style={styles.tripDate}>
              {formatDate(item.startedAt)}
            </Text>
            <Text style={styles.tripTime}>
              {formatTime(item.startedAt)}
            </Text>
          </View>
        </View>
        <View style={styles.tripStats}>
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsText}>{item.locations.length}</Text>
            <Text style={styles.pointsLabel}>points</Text>
          </View>
        </View>
      </View>

      <View style={styles.tripFooter}>
        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, { backgroundColor: '#10b981' }]} />
          <Text style={styles.statusText}>Completed</Text>
        </View>
        <Text style={styles.viewMapText}>View on Map →</Text>
      </View>
    </TouchableOpacity>
    );
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={styles.statusBar.backgroundColor} />
      <View style={styles.container}>

        {/* Header Section */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Trip History</Text>
          <Text style={styles.subtitle}>
            {trips.length > 0
              ? `${trips.length} trip${trips.length !== 1 ? 's' : ''} recorded`
              : 'Your travel journey awaits'
            }
          </Text>
        </View>

        {/* Content Section */}
        <View style={styles.contentContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading your trips...</Text>
            </View>
          ) : trips.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🗺️</Text>
              <Text style={styles.emptyTitle}>No trips yet</Text>
              <Text style={styles.emptySubtitle}>
                Start tracking your first trip to see it appear here
              </Text>
            </View>
          ) : (
            <FlatList
              data={trips}
              keyExtractor={(item) => item._id}
              renderItem={renderTrip}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#3b82f6']}
                  tintColor="#3b82f6"
                />
              }
            />
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  // Layout Styles
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  statusBar: {
    backgroundColor: '#1e293b',
  },

  // Header Styles
  headerContainer: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '400',
  },

  // Content Styles
  contentContainer: {
    flex: 1,
    paddingTop: 16,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },

  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
    fontWeight: '500',
  },

  // Empty State Styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },

  // Trip Card Styles
  tripCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tripIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#eff6ff',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  tripIconText: {
    fontSize: 20,
  },
  tripInfo: {
    flex: 1,
  },
  tripName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  tripMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripDate: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginRight: 12,
  },
  tripTime: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '400',
  },
  tripStats: {
    alignItems: 'flex-end',
  },
  pointsBadge: {
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 60,
  },
  pointsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3b82f6',
  },
  pointsLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },

  // Trip Footer Styles
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  viewMapText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '600',
  },
});
