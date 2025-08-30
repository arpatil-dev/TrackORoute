import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen({ onLogout, token, user }) {
    const truncatedToken = token ? `${token.substring(0, 20)}...` : '';
    console.log(user)
    // Default user data if not provided
    const userData = user || {
        name: 'TrackORoute User',
        email: 'user@trackoroute.com',
        phone: '+91 0000000000',
        profilePicture: null
    };

    const getName = (firstName, lastName) => {
        if (!firstName && !lastName) return 'TrackORoute User';
        if (!firstName) return lastName;
        if (!lastName) return firstName;
        return `${firstName} ${lastName}`;
    }


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
                        {userData.photo ? (
                            <Image
                                source={{ uri: userData.photo }}
                                style={styles.profileImage}
                                resizeMode="cover"
                            />
                        ) : (
                            <Ionicons name="person-outline" size={32} color="#3b82f6" />
                        )}
                    </View>
                    <Text style={styles.profileName}>{getName(userData.firstName,userData.lastName)}</Text>
                    <Text style={styles.profileEmail}>{userData.email}</Text>
                    {userData.phone && (
                        <View style={styles.profilePhoneContainer}>
                            <Ionicons name="call-outline" size={14} color="#64748b" />
                            <Text style={styles.profilePhone}>{userData.phone}</Text>
                        </View>
                    )}
                </View>

                {/* Token Info Card */}
                <View style={styles.tokenCard}>
                    <View style={styles.tokenHeader}>
                        <Text style={styles.tokenTitle}>Session Token</Text>
                        <View style={styles.tokenStatusContainer}>
                            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                            <Text style={styles.tokenStatus}>Active</Text>
                        </View>
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
                    <View style={styles.logoutButtonContent}>
                        <Ionicons name="log-out-outline" size={20} color="#ffffff" />
                        <Text style={styles.logoutButtonText}>Sign Out</Text>
                    </View>
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
        overflow: 'hidden',
    },
    profileImage: {
        width: '100%',
        height: '100%',
        borderRadius: 37,
    },
    profileName: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 4,
        textAlign: 'center',
    },
    profileEmail: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '400',
        textAlign: 'center',
        marginBottom: 8,
    },
    profilePhoneContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 4,
    },
    profilePhone: {
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
    tokenStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
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
    logoutButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
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
