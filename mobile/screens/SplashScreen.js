import React,{ useEffect, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, Animated, Image } from 'react-native';
import splashIcon from '../assets/splash-icon-1.png';

export default function SplashScreen({ onSplashComplete }) {
  /* Minimal animation values */
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    /* Simple sequence of animations */
    Animated.sequence([
      /* Logo scale animation */
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      /* Text fade in */
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      /* Loading indicator fade in */
      Animated.timing(loadingOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    /* Continuous pulsing animation for loading indicator */
    const startPulse = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    /* Start pulse after loading indicator appears */
    const pulseTimer = setTimeout(startPulse, 1000);

    /* Navigate after animations complete */
    const timer = setTimeout(() => {
      onSplashComplete();
    }, 2500);

    /* Cleanup timers on unmount */
    return () => {
      clearTimeout(timer);
      clearTimeout(pulseTimer);
    };
  }, []);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#1e293b" />
      <View style={styles.container}>
        <View style={styles.contentContainer}>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <Animated.View style={[styles.logoIcon, { transform: [{ scale: logoScale }] }]}>
              <Image 
                source={splashIcon} 
                style={styles.logoImage}
                resizeMode="contain"
              />
            </Animated.View>
          </View>

          {/* App Name */}
          <Animated.View style={[styles.appnameContainer, { opacity: textOpacity }]}>
            <Text style={styles.appname}>
              <Text style={styles.appnameTrack}>Track</Text>
              <Text style={styles.appnameO}> O </Text>
              <Text style={styles.appnameRoute}>Route</Text>
            </Text>
          </Animated.View>

          {/* Tagline */}
          <Animated.View style={[styles.taglineContainer, { opacity: textOpacity }]}>
            <Text style={styles.brandTagline}>GPS Navigation & Trip Tracking</Text>
          </Animated.View>
        </View>

        {/* Animated Loading Indicator */}
        <Animated.View style={[styles.loadingContainer, { opacity: loadingOpacity }]}>
          <View style={styles.loadingDots}>
            <Animated.View style={[styles.loadingDot, { opacity: pulseAnimation }]} />
            <Animated.View style={[styles.loadingDot, { opacity: pulseAnimation }]} />
            <Animated.View style={[styles.loadingDot, { opacity: pulseAnimation }]} />
          </View>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  logoImage: {
    width: 60,
    height: 60,
  },
  appnameContainer: {
    marginBottom: 12,
  },
  appname: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appnameTrack: {
    fontSize: 42,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1.5,
  },
  appnameO: {
    fontSize: 42,
    fontWeight: '300',
    color: '#3b82f6',
    letterSpacing: -1.5,
  },
  appnameRoute: {
    fontSize: 42,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1.5,
  },
  taglineContainer: {
    marginBottom: 80,
  },
  brandTagline: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 80,
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginHorizontal: 4,
  },
});
