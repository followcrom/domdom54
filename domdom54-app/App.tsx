import "react-native-gesture-handler";
import React, { useEffect, useRef } from "react";
import {
  NavigationContainer,
  NavigationContainerRef,
  NavigatorScreenParams,
  DefaultTheme,
} from "@react-navigation/native";
import * as Notifications from 'expo-notifications';
import { createStackNavigator } from "@react-navigation/stack";
import * as Linking from "expo-linking";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import BottomTabs from "./src/navigation/Tabs";
import type { TabParamList } from "./src/navigation/Tabs";
import MeditationPlayer from "./src/MeditationPlayer";
import Contact from "./src/Contact";
import colors from "./src/styles/colors";
import type { EventSubscription } from 'expo-notifications';

// --- Type Definitions ---

// Define the shape of the data that comes with a notification
type NotificationData = {
  id: number;
  title: string;
  body: string;
  imageUrl: string | null;
  audio: string | null;
};

// Define all the screens and their parameters in our root stack
export type RootStackParamList = {
  // Messages is a tab now, so the stack's job is to hand params down into the
  // tab navigator rather than to own a Message screen of its own.
  HomeTabs: NavigatorScreenParams<TabParamList>;
  MeditationPlayer: { audioUrl: string; title: string };
  Contact: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

// The screen background used to come from React Navigation's DefaultTheme, which nothing
// in this app had chosen - it just happened to be rgb(242, 242, 242). Every contrast ratio
// in the palette is measured against it, so it is declared here rather than inherited: a
// change to the library's default can no longer move the floor underneath the colours.
// `colors.page` is that same value, now on purpose.
const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.page,
    card: colors.card,
    primary: colors.brandStrong,
    text: colors.textPrimary,
    border: colors.divider,
    notification: colors.danger,
  },
};

// Configure notification behavior for Android
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// --- Linking Configuration ---
const linking = {
  prefixes: [Linking.createURL("/")],
  config: {
    screens: {
      HomeTabs: {
        path: "/home",
        // Nested, because Messages lives inside the tab navigator. The old
        // top-level "Message" entry would no longer resolve to anything.
        screens: {
          Messages: "message",
        },
      },
      MeditationPlayer: {
        path: "/meditation/:audioUrl/:title",
        parse: {
          audioUrl: (audioUrl: string) => decodeURIComponent(audioUrl),
          title: (title: string) => decodeURIComponent(title),
        },
        stringify: {
          audioUrl: (audioUrl: string) => encodeURIComponent(audioUrl),
          title: (title: string) => encodeURIComponent(title),
        },
      },
    },
  },
};

// --- Main App Component ---

export default function App() {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const notificationListener = useRef<EventSubscription | null>(null);
  const responseListener = useRef<EventSubscription | null>(null);

  useEffect(() => {
    // Create the Android notification channel once at startup. This is the
    // single source of truth for the "default" channel used by push messages.
    const setupAndroidNotifications = async () => {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: colors.notificationLed,
      });
    };

    setupAndroidNotifications();

    // Handler for when a notification is received while the app is in the foreground
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        // Log only the parsed `data` payload. Logging the whole notification
        // object makes the console serializer read expo-notifications'
        // deprecated `dataString` getter, which prints a noisy warning.
        console.log("Notification received:", notification.request.content.data);
        // Optional: You could show an in-app notification here
      });

    // Handler for when a user taps on a notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as NotificationData;
        console.log("Notification response received:", data);
        handleNotification(data);
      });

    // Check if the app was opened from a notification that was received while the app was closed
    const checkInitialNotification = async () => {
      try {
        const response = await Notifications.getLastNotificationResponseAsync();
        if (response) {
          const data = response.notification.request.content.data as NotificationData;
          console.log("App opened from notification:", data);
          // Wait a bit longer for navigation to be ready
          setTimeout(() => {
            handleNotification(data);
          }, 500);
        }
      } catch (error) {
        console.error("Error checking initial notification:", error);
      }
    };

    checkInitialNotification();

    // Cleanup listeners on unmount
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const handleNotification = (data: NotificationData) => {
    if (data && navigationRef.current?.isReady()) {
      // Ensure we have the navigation ready and data is valid
      setTimeout(() => {
        try {
          // Messages is nested inside HomeTabs, so the params have to be
          // addressed through the tab navigator rather than passed to a
          // top-level route.
          navigationRef.current?.navigate("HomeTabs", {
            screen: "Messages",
            params: data,
          });
        } catch (error) {
          console.error("Navigation error:", error);
        }
      }, 100);
    } else {
      console.warn("Navigation not ready or invalid notification data:", data);
    }
  };

  return (
    <>
      {/*
        Status bar icon colour. Under edge-to-edge the bar has no background of its
        own — it sits over whatever the screen draws, which here is the white tab
        header (Tabs.tsx builds headerStyle.height as HEADER_CONTENT_HEIGHT +
        insets.top, so the header extends up behind it). Dark icons on white.

        Deliberately "dark" and not "auto": nothing in the app reads the colour
        scheme and every colour is a light-mode literal, so "auto" would flip to
        light icons on a white header whenever the user's phone is in dark mode.
        Revisit if real dark-mode support lands.

        `backgroundColor` and `translucent` are not options here — expo-status-bar
        warns and ignores both when edge-to-edge is on. To tint the area behind the
        bar, draw a view of height insets.top instead.
      */}
      <StatusBar style="dark" />
      <NavigationContainer
        ref={navigationRef}
        theme={navigationTheme}
        linking={linking}
        fallback={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        }
        onReady={() => console.log("Navigation container ready")}
      >
        <Stack.Navigator
          initialRouteName="HomeTabs"
          screenOptions={{
            headerShown: false,
            gestureEnabled: true,
            gestureDirection: 'horizontal',
          }}
        >
          <Stack.Screen
            name="HomeTabs"
            component={BottomTabs}
            options={{
              headerShown: false,
              gestureEnabled: false, // Disable gestures on main tab screen
            }}
          />
          <Stack.Screen
            name="MeditationPlayer"
            component={MeditationPlayer}
            options={{
              headerShown: false,
              presentation: 'modal',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="Contact"
            component={Contact}
            options={{
              headerShown: false,
              presentation: 'modal',
              gestureEnabled: true,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}