/**
 * Expo app configuration. The GitHub Actions build passes BW_VERSION_CODE and
 * BW_VERSION_NAME so every release installs over the previous one.
 */
import type { ExpoConfig } from 'expo/config';

const versionCode = Number(process.env.BW_VERSION_CODE ?? '1');
const versionName = process.env.BW_VERSION_NAME ?? '1.0.0';

const config: ExpoConfig = {
  name: "Builder's Wall",
  slug: 'builders-wall',
  version: versionName,
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  backgroundColor: '#121416',
  android: {
    package: 'com.pubu.builderswall',
    versionCode,
    adaptiveIcon: {
      backgroundColor: '#121416',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    permissions: [
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.USE_EXACT_ALARM',
      'android.permission.VIBRATE',
    ],
    blockedPermissions: ['android.permission.RECORD_AUDIO', 'android.permission.SYSTEM_ALERT_WINDOW'],
  },
  plugins: [
    './plugins/withReleaseSigning',
    'expo-sqlite',
    'expo-font',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#121416',
        image: './assets/splash-icon.png',
        imageWidth: 180,
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#FFB000',
      },
    ],
    'expo-sharing',
    [
      'react-native-android-widget',
      {
        fonts: ['./assets/fonts/BigShouldersDisplay_800ExtraBold.ttf'],
        widgets: [
          {
            name: 'BuilderWall',
            label: "Builder's Wall",
            description: 'Today’s habits with tap-to-tick, day count, streak and level',
            minWidth: '250dp',
            minHeight: '250dp',
            targetCellWidth: 4,
            targetCellHeight: 4,
            resizeMode: 'horizontal|vertical',
            previewImage: './assets/widget-preview.png',
            // Refresh at least every 30 min so the day rolls over after 3 am.
            updatePeriodMillis: 1800000,
          },
        ],
      },
    ],
  ],
};

export default config;
