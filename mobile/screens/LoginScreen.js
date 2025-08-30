import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        email,
        password
      });
      // console.log('Login response:', response.data.data.token);
      if (response.data.data && response.data.data.token) {
        // console.log('Login successful, token:', response.data.data.token);
        onLogin(response.data.data.token);
        Alert.alert('Login Successful', 'You have been logged in successfully.');
      } else {
        Alert.alert('Login Failed', response.data.message || 'Invalid credentials');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not connect to server');
    }
    setLoading(false);
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={styles.statusBar.backgroundColor} />
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="Enter your email"
                  placeholderTextColor={styles.placeholderText.color}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="Enter your password"
                  placeholderTextColor={styles.placeholderText.color}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
              onPress={handleLogin} 
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>
              Secure login powered by TrackORoute
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  // Layout Styles
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 24,
  },
  statusBar: {
    backgroundColor: '#1e293b',
  },

  // Header Styles
  headerContainer: {
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
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

  // Form Styles
  formContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  input: {
    height: 56,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  inputWithIcon: {
    height: 56,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingLeft: 48,
    paddingRight: 20,
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
    flex: 1,
  },
  placeholderText: {
    color: '#94a3b8',
  },

  // Button Styles
  loginButton: {
    height: 56,
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0.1,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.5,
  },

  // Footer Styles
  footerContainer: {
    alignItems: 'center',
    paddingBottom: 40,
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '400',
  },
});
