import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
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

type PermissionStatus = "granted" | "denied" | "undetermined" | "checking";

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

async function checkAndSaveToken(expoPushToken: string) {
  // De-duplication now happens server-side, so this is a single round trip.
  const result = await saveToken(expoPushToken);
  if (result.ok) {
    console.log(`Token ${result.status}`);
  } else {
    console.error("Error saving token:", result.error);
  }
}

async function registerForPushNotificationsAsync(
  setExpoPushToken: (token: string) => void,
  setPermissionStatus: (status: PermissionStatus) => void
) {
  try {
    // The "default" channel is created at app startup (see App.tsx).

    // Check if running on physical device
    if (!Device.isDevice) {
      handleRegistrationError("Must use a physical device for Push Notifications");
      return;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      handleRegistrationError("Permission not granted for push notifications!");
      setPermissionStatus("denied");
      await AsyncStorage.setItem("permissionStatus", "denied");
      return;
    }

    // Get project ID from app config
    const projectId = getProjectId();

    if (!projectId) {
      handleRegistrationError("Project ID not found in app configuration");
      return;
    }

    // Get Expo push token
    const pushTokenData = await Notifications.getExpoPushTokenAsync({ 
      projectId 
    });
    
    if (!pushTokenData?.data) {
      handleRegistrationError("Failed to get push token");
      return;
    }

    const expoPushToken = pushTokenData.data;
    // console.log("Expo Push Token:", expoPushToken); // dev only — don't log the push token in release

    await checkAndSaveToken(expoPushToken);

    // Update state
    setExpoPushToken(expoPushToken);
    setPermissionStatus("granted");
    await AsyncStorage.setItem("permissionStatus", "granted");

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    handleRegistrationError(`Error getting push token: ${errorMessage}`);
    console.error("Full error:", error);
  }
}

/** Re-derives the device's Expo push token when component state doesn't have it. */
async function resolveExpoPushToken(): Promise<string> {
  const projectId = getProjectId();
  if (!projectId) return "";
  try {
    const data = await Notifications.getExpoPushTokenAsync({ projectId });
    return data?.data ?? "";
  } catch (error) {
    console.error("Could not resolve push token:", error);
    return "";
  }
}

async function removeToken(expoPushToken: string) {
  // `expoPushToken` is only populated when the user enabled notifications
  // during this session. After a cold start the state is empty, so resolve the
  // token first — otherwise revoking silently leaves it in the store.
  const token = expoPushToken || (await resolveExpoPushToken());
  if (!token) {
    console.warn("No push token available to remove");
    return;
  }

  const result = await deleteToken(token);
  if (result.ok) {
    console.log(`Token ${result.status}`);
  } else {
    console.error("Error removing token:", result.error);
  }
}

// --- Component ---

export default function Permission() {
  const navigation = useNavigation<PermissionNavigationProp>();
  const [expoPushToken, setExpoPushToken] = useState("");
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionStatus>("checking");
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  useEffect(() => {
    const checkPermission = async () => {
      try {
        // Always ask the OS first. A cached "granted" goes stale the moment the
        // user turns notifications off in Android settings, and the previous
        // version returned early on any stored value — so the screen kept
        // reporting "Enabled" forever while Expo returned DeviceNotRegistered.
        const { status: osStatus } = await Notifications.getPermissionsAsync();

        if (osStatus !== "granted") {
          setPermissionStatus(osStatus as PermissionStatus);
          await AsyncStorage.setItem("permissionStatus", osStatus);
          return;
        }

        // An OS grant on its own does not mean the user wants notifications:
        // handleRevoke deletes the token and stores "denied" without touching
        // the OS permission. So when the OS says granted, the stored value
        // still wins — it is the only record of an in-app revoke.
        const storedStatus = (await AsyncStorage.getItem(
          "permissionStatus"
        )) as PermissionStatus | null;

        if (storedStatus) {
          setPermissionStatus(storedStatus);
        } else {
          setPermissionStatus(osStatus as PermissionStatus);
          await AsyncStorage.setItem("permissionStatus", osStatus);
        }
      } catch (error) {
        console.error("Error checking permission:", error);
        setPermissionStatus("undetermined");
      }
    };

    checkPermission();
  }, []);

  const handleAccept = () => {
    registerForPushNotificationsAsync(setExpoPushToken, setPermissionStatus);
  };

  const handleRevoke = async () => {
    try {
      await removeToken(expoPushToken);
      setExpoPushToken("");
      setPermissionStatus("denied");
      await AsyncStorage.setItem("permissionStatus", "denied");
    } catch (error) {
      console.error("Error revoking permissions:", error);
      Alert.alert("Error", "Failed to disable notifications");
    }
  };

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
          Current status:{" "}
          {permissionStatus === "granted" ? "Enabled" : "Disabled"}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        {permissionStatus === "granted" ? (
          <TouchableOpacity style={styles.buttonIcon} onPress={handleRevoke}>
            <Ionicons
              name="notifications-off-outline"
              size={48}
              color="white"
            />
            <Text style={styles.buttonText}>Disable Notifications</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.buttonIcon} onPress={handleAccept}>
            <Ionicons name="notifications-outline" size={48} color="white" />
            <Text style={styles.buttonText}>Enable Notifications</Text>
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