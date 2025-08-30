import 'dotenv/config';

export default {
  expo: {
    name: "TrackORoute",
    slug: "trackoroute",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon-1.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    description: "Professional GPS tracking and route management app for drivers and travelers",
    primaryColor: "#3b82f6",

    splash: {
      image: "./assets/splash-icon-1.png",
      resizeMode: "contain",
      backgroundColor: "#fff"
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.trackoroute.app",
      buildNumber: "1",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "TrackORoute needs location access to track your trips and provide accurate route information.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "TrackORoute needs location access to track your trips in the background.",
        CFBundleDisplayName: "TrackORoute"
      }
    },

    android: {
      package: "com.trackoroute.app",
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon-1.png",
        backgroundColor: "#fff"
      },
      edgeToEdgeEnabled: true,
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "FOREGROUND_SERVICE",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION"
      ],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY
        }
      }
    },

    web: {
      favicon: "./assets/favicon.png"
    },

    plugins: [
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Allow TrackORoute to access your location to track your trips and provide accurate route information.",
          isBackgroundLocationEnabled: true
        }
      ]
    ],

    extra: {
      eas: {
        projectId: "d0d45a37-d47f-4958-812f-b718e266b235"
      }
    },

    owner: "arpatil-dev"
  }
};
