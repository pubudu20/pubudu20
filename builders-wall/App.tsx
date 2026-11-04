/**
 * App shell: loads the bundled fonts, sets up navigation (5 bottom tabs +
 * Settings and Day screens) and the celebration overlay.
 */
import React, { useEffect } from 'react';
import { Pressable, StatusBar, Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { DarkTheme, NavigationContainer, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StoreProvider, useStore } from './src/state/store';
import { configureForegroundHandler, requestPermission } from './src/notifications/scheduler';
import { CelebrationLayer } from './src/ui/feedback';
import { colors, fonts } from './src/ui/theme';
import { GearIcon, GoalsIcon, ShopIcon, StatsIcon, TodayIcon, WallIcon } from './src/ui/icons';
import { TodayScreen } from './src/screens/TodayScreen';
import { WallScreen } from './src/screens/WallScreen';
import { GoalsScreen } from './src/screens/GoalsScreen';
import { ShopScreen } from './src/screens/ShopScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { DayScreen } from './src/screens/DayScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});
configureForegroundHandler();

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.amber,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.line,
    notification: colors.amber,
  },
};

/** Header title on every tab: screen name + "Day X of 118". */
function HeaderTitle({ title }: { title: string }) {
  const { game } = useStore();
  return (
    <View>
      <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.text, letterSpacing: 1 }}>{title.toUpperCase()}</Text>
      <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.amber, marginTop: -2 }}>
        DAY {game.displayDay} OF {game.cycle.lengthDays}
      </Text>
    </View>
  );
}

function SettingsButton() {
  const nav = useNavigation<any>();
  return (
    <Pressable
      onPress={() => nav.navigate('Settings')}
      accessibilityRole="button"
      accessibilityLabel="Settings"
      hitSlop={10}
      style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: 4 }}
    >
      <GearIcon color={colors.muted} />
    </Pressable>
  );
}

function Tabs() {
  // Leave room for Android's own navigation buttons (◀ ● ■) under the tab bar.
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTitle: () => <HeaderTitle title={route.name} />,
        headerRight: () => <SettingsButton />,
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 6,
        },
        tabBarLabelStyle: { fontFamily: fonts.displaySemi, fontSize: 13, letterSpacing: 0.8 },
      })}
    >
      <Tab.Screen name="Today" component={TodayScreen} options={{ tabBarIcon: ({ color }) => <TodayIcon color={color} /> }} />
      <Tab.Screen name="Wall" component={WallScreen} options={{ tabBarIcon: ({ color }) => <WallIcon color={color} /> }} />
      <Tab.Screen name="Goals" component={GoalsScreen} options={{ tabBarIcon: ({ color }) => <GoalsIcon color={color} /> }} />
      <Tab.Screen name="Shop" component={ShopScreen} options={{ tabBarIcon: ({ color }) => <ShopIcon color={color} /> }} />
      <Tab.Screen name="Stats" component={StatsScreen} options={{ tabBarIcon: ({ color }) => <StatsIcon color={color} /> }} />
    </Tab.Navigator>
  );
}

function Root() {
  const { celebrations, dismissCelebration, reload } = useStore();

  // Ask for notification permission once (Android 13+ shows a prompt), then
  // reschedule so reminders exist straight away.
  useEffect(() => {
    requestPermission()
      .then((ok) => ok && reload())
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            headerTitleStyle: { fontFamily: fonts.display, fontSize: 22 },
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Day" component={DayScreen} options={{ title: 'Day' }} />
        </Stack.Navigator>
      </NavigationContainer>
      <CelebrationLayer queue={celebrations} onDismiss={dismissCelebration} />
    </View>
  );
}

export default function App() {
  const [loaded, error] = useFonts({
    [fonts.display]: require('./assets/fonts/BigShouldersDisplay_800ExtraBold.ttf'),
    [fonts.displaySemi]: require('./assets/fonts/BigShouldersDisplay_600SemiBold.ttf'),
    [fonts.body]: require('./assets/fonts/Inter_400Regular.ttf'),
    [fonts.bodyBold]: require('./assets/fonts/Inter_600SemiBold.ttf'),
    [fonts.mono]: require('./assets/fonts/JetBrainsMono_500Medium.ttf'),
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <StoreProvider>
        <Root />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
