import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  AppState,
  useWindowDimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveToken, deleteToken } from "./pushTokenStore";
import Constants from "expo-constants";
import * as Device from "expo-device";
import styles from "./styles/Styles";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

// The OS-level permission (can only be granted/revoked by the user, via the
// native prompt once or via system settings after that) and the app's own
// "should the backend send this device messages" state (a token's presence
// in the push token sheet) are two independent gates. Both must be open for
// a message to actually reach the user, so they're tracked separately below
// instead of being folded into one flag.
type OsPermissionStatus = "granted" | "denied" | "undetermined" | "checking";

type RootStackParamList = {
  Permission: undefined;
  Message: undefined;
  Home: undefined;
  Contact: undefined;
};

type PermissionNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Permission"
>;

const SUBSCRIBED_KEY = "pushSubscribed";

// --- Helper Functions ---

function handleRegistrationError(errorMessage: string) {
  Alert.alert("Notification Error", errorMessage);
  console.error(errorMessage);
}

function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId
  );
}

/** Fetches this device's Expo push token. Requires a physical device and a valid project ID. */
async function getExpoPushToken(): Promise<string> {
  const projectId = getProjectId();
  if (!projectId) {
    throw new Error("Project ID not found in app configuration");
  }
  const pushTokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  if (!pushTokenData?.data) {
    throw new Error("Failed to get push token");
  }
  return pushTokenData.data;
}

/** Re-derives the device's Expo push token when component state doesn't have it. */
async function resolveExpoPushToken(): Promise<string> {
  try {
    return await getExpoPushToken();
  } catch (error) {
    console.error("Could not resolve push token:", error);
    return "";
  }
}

// --- Component ---

export default function Permission() {
  const navigation = useNavigation<PermissionNavigationProp>();
  const [expoPushToken, setExpoPushToken] = useState("");
  const [osPermission, setOsPermission] = useState<OsPermissionStatus>("checking");
  const [subscribed, setSubscribed] = useState(false);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const refreshOsPermission = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setOsPermission(status as OsPermissionStatus);
    } catch (error) {
      console.error("Error checking permission:", error);
    }
  };

  useEffect(() => {
    refreshOsPermission();

    AsyncStorage.getItem(SUBSCRIBED_KEY).then((stored) => {
      setSubscribed(stored === "true");
    });

    // Android lets the user flip this app's notification permission from system
    // settings at any time, outside the app entirely — it's the deciding factor
    // for whether messages actually appear, regardless of any in-app state. Re-check
    // whenever the app returns to the foreground so this screen doesn't show a
    // stale status after a Settings round trip.
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        refreshOsPermission();
      }
    });

    return () => subscription.remove();
  }, []);

  const handleRequestOsPermission = async () => {
    if (!Device.isDevice) {
      handleRegistrationError("Must use a physical device for Push Notifications");
      return;
    }
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setOsPermission(status as OsPermissionStatus);
      if (status !== "granted") {
        handleRegistrationError("Permission not granted for push notifications!");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error occurred";
      handleRegistrationError(`Error requesting permission: ${message}`);
    }
  };

  const handleToggleSubscribe = async () => {
    try {
      if (subscribed) {
        const token = expoPushToken || (await resolveExpoPushToken());
        if (token) {
          const result = await deleteToken(token);
          if (!result.ok) console.error("Error removing token:", result.error);
        }
        setExpoPushToken("");
        setSubscribed(false);
        await AsyncStorage.setItem(SUBSCRIBED_KEY, "false");
      } else {
        if (!Device.isDevice) {
          handleRegistrationError("Must use a physical device for Push Notifications");
          return;
        }
        const token = await getExpoPushToken();
        const result = await saveToken(token);
        if (!result.ok) {
          handleRegistrationError(`Error saving token: ${result.error}`);
          return;
        }
        setExpoPushToken(token);
        setSubscribed(true);
        await AsyncStorage.setItem(SUBSCRIBED_KEY, "true");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error occurred";
      handleRegistrationError(message);
    }
  };

  const statusLabel =
    osPermission === "granted"
      ? "Allowed"
      : osPermission === "denied"
      ? "Blocked"
      : osPermission === "undetermined"
      ? "Not yet requested"
      : "Checking...";

  return (
    <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.textContainer, isLandscape && styles.textContainerLandscape]}>
        <Text style={styles.title}>Keep It Locked</Text>
              <Text
                style={[
                  styles.textOutput,
                  isLandscape && styles.textOutputLandscape,
                ]}
              >
          Enable push notifications.
        </Text>
              <Text
                style={[
                  styles.textOutput,
                  isLandscape && styles.textOutputLandscape,
                ]}
              >
          System permission: {statusLabel}
        </Text>
        {osPermission === "granted" && (
              <Text
                style={[
                  styles.textOutput,
                  isLandscape && styles.textOutputLandscape,
                ]}
              >
            Receiving messages: {subscribed ? "Yes" : "No"}
          </Text>
        )}
        {osPermission === "denied" && subscribed && (
              <Text
                style={[
                  styles.textOutput,
                  isLandscape && styles.textOutputLandscape,
                ]}
              >
            You're subscribed, but system permission is off — messages won't
            appear until you re-enable it.
          </Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        {osPermission === "undetermined" && (
          <TouchableOpacity
            style={styles.buttonIcon}
            onPress={handleRequestOsPermission}
          >
            <Ionicons name="notifications-outline" size={48} color="white" />
            <Text style={styles.buttonText}>Enable Notifications</Text>
          </TouchableOpacity>
        )}

        {osPermission === "denied" && (
          <TouchableOpacity
            style={styles.buttonIcon}
            onPress={() => Linking.openSettings()}
          >
            <Ionicons name="settings-outline" size={48} color="white" />
            <Text style={styles.buttonText}>Open Notification Settings</Text>
          </TouchableOpacity>
        )}

        {osPermission === "granted" && (
          <TouchableOpacity
            style={styles.buttonIcon}
            onPress={handleToggleSubscribe}
          >
            <Ionicons
              name={
                subscribed ? "notifications-off-outline" : "notifications-outline"
              }
              size={48}
              color="white"
            />
            <Text style={styles.buttonText}>
              {subscribed ? "Stop Receiving Messages" : "Start Receiving Messages"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.buttonIcon}
          onPress={() => navigation.navigate("Message")}
        >
          <MaterialCommunityIcons
            name="cellphone-message"
            size={48}
            color="white"
          />
          <Text style={styles.buttonText}>Your Messages</Text>
        </TouchableOpacity>
      </View>

        <View style={[styles.textContainer, isLandscape && styles.textContainerLandscape]}>
        <Text style={styles.title}>Useful Links</Text>
              <Text
                style={[
                  styles.textOutput,
                  isLandscape && styles.textOutputLandscape,
                ]}
              >
          Helping you stay connected.
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.buttonIcon}
          onPress={() => navigation.navigate("Home")}
        >
          <Ionicons name="home-outline" size={48} color="white" />
          <Text style={styles.buttonText}>Home</Text>
        </TouchableOpacity>
      </View>

            <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.buttonIcon}
          onPress={() => navigation.navigate("Contact")}
        >
          <MaterialCommunityIcons
            name="email-check-outline"
            size={48}
            color="white"
          />
          <Text style={styles.buttonText}>Contact us</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.buttonIcon}
          onPress={() => Linking.openURL("https://followcrom.com")}
        >
          <MaterialCommunityIcons name="handshake-outline" size={48} color="white" />
          <Text style={styles.buttonText}>followCrom</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}
