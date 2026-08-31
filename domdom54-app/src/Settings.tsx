import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  AppState,
  Switch,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import * as Updates from "expo-updates";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveToken, deleteToken } from "./pushTokenStore";
import Constants from "expo-constants";
import * as Device from "expo-device";
import styles from "./styles/Styles";
import colors from "./styles/colors";
import { Card } from "./components/Layout";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "../App";
import MeditationHistory from "./MeditationHistory";
import {
  EMPTY_TOTALS,
  formatMinutes,
  loadLog,
  totalsFrom,
} from "./meditationLog";

// This screen holds three things and deliberately nothing else: the one preference
// the app actually has (notifications), your own past activity (meditation history),
// and the facts you'd need to support the app (version, contact, privacy). It used
// to be the overflow drawer for anything that didn't fit elsewhere - a Home link, a
// "Useful Links" heading, the message viewer. The rule now is: something you
// configure goes in the first card, something you did goes in the next, something
// about the app goes after that, and anything else isn't a setting.

// The OS-level permission (can only be granted/revoked by the user, via the
// native prompt once or via system settings after that) and the app's own
// "should the backend send this device messages" state (a token's presence
// in the push token sheet) are two independent gates. Both must be open for
// a message to actually reach the user, so they're tracked separately below
// instead of being folded into one flag.
//
// They are NOT surfaced separately, though: the UI collapses them into a
// single switch plus one line of status text, because "two independent gates"
// is our implementation detail, not a mental model to hand the user.
type OsPermissionStatus = "granted" | "denied" | "undetermined" | "checking";

// The real stack, imported rather than re-declared. The local copy this replaces
// listed `Settings` and `Message`, and neither is a stack route: Settings and
// Messages are both tabs inside HomeTabs, so a navigate("Message") would have
// found nothing. Type-only, so it adds no runtime cycle with App.tsx.
type SettingsNavigationProp = StackNavigationProp<RootStackParamList>;

const SUBSCRIBED_KEY = "pushSubscribed";

// Play's own data-safety listing, which shows what the app declares it collects.
// A stand-in until followcrom.com carries a current privacy policy - the existing
// one is three years stale, and a link to a stale policy is worse than a link to
// the live declaration. Hardcoded to the PRODUCTION package: dev builds use
// com.followcrom.domdom.dev, which has no Play listing of its own.
const PRIVACY_URL =
  "https://play.google.com/store/apps/datasafety?id=com.followcrom.domdom";

const FOLLOWCROM_URL = "https://followcrom.com";

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

// --- Row ---

type RowProps = {
  label: string;
  /** Right-aligned static text, e.g. the version number. */
  value?: string;
  onPress?: () => void;
  busy?: boolean;
  /** Suppresses the divider on the final row of a card. */
  last?: boolean;
  /** Leaves the app (a browser tab) rather than navigating within it - swaps the chevron for an "opens elsewhere" mark. */
  external?: boolean;
};

/**
 * A settings row. Reuses the list vocabulary already established by the
 * meditation history sheet rather than the app's 300pt primary buttons - a link
 * to a website is not the same kind of thing as "Generate Wisdom", and it
 * shouldn't carry the same visual weight.
 */
function Row({ label, value, onPress, busy, last, external }: RowProps) {
  const content = (
    <View style={[styles.row, settingsStyles.row, last && settingsStyles.rowLast]}>
      <Text style={settingsStyles.rowLabel}>{label}</Text>
      {busy ? (
        <ActivityIndicator size="small" color={colors.brand} />
      ) : value ? (
        <Text style={settingsStyles.rowValue}>{value}</Text>
      ) : external ? (
        <Ionicons name="open-outline" size={20} color={colors.textSecondary} />
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {content}
    </TouchableOpacity>
  );
}

// --- Component ---

export default function Settings() {
  const navigation = useNavigation<SettingsNavigationProp>();
  const [expoPushToken, setExpoPushToken] = useState("");
  const [osPermission, setOsPermission] = useState<OsPermissionStatus>("checking");
  const [subscribed, setSubscribed] = useState(false);
  // Guards the switch while a permission prompt or a token round trip is in
  // flight, so a double tap can't fire two conflicting requests.
  const [busy, setBusy] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [totals, setTotals] = useState(EMPTY_TOTALS);

  const refreshTotals = useCallback(async () => {
    setTotals(totalsFrom(await loadLog()));
  }, []);

  // The log is written by the player, on another screen entirely, so recompute
  // whenever this tab comes into view rather than only on mount. Deletions from
  // the history sheet are caught by its onClose below.
  useFocusEffect(
    useCallback(() => {
      refreshTotals();
    }, [refreshTotals])
  );

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
    // settings at any time, outside the app entirely - it's the deciding factor
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

  const isPermissionGranted = osPermission === "granted";
  const isPermissionBlocked = osPermission === "denied";

  // What the switch renders as. A device that's still subscribed but has had its
  // permission revoked in system settings reads as OFF, because that is the
  // honest answer to "am I receiving messages" - but `subscribed` is left alone,
  // so re-allowing in settings flips it straight back on with no further taps.
  const switchOn = subscribed && isPermissionGranted;

  const persistSubscribed = async (value: boolean) => {
    setSubscribed(value);
    await AsyncStorage.setItem(SUBSCRIBED_KEY, value ? "true" : "false");
  };

  /**
   * Shows the native permission dialog. This is the ONLY moment it can ever
   * appear: Android grants one prompt per install, so if the user is at
   * "undetermined" we must spend it here rather than sending them out to
   * system settings for something a single in-app tap can do.
   */
  const requestOsPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setOsPermission(status as OsPermissionStatus);
      return status === "granted";
    } catch (error) {
      console.error("Error requesting permission:", error);
      return false;
    }
  };

  const subscribe = async () => {
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
    await persistSubscribed(true);
  };

  const unsubscribe = async () => {
    const token = expoPushToken || (await resolveExpoPushToken());

    // No token to remove server-side (e.g. this install never registered one).
    // Nothing to orphan, so just settle the local flag.
    if (!token) {
      await persistSubscribed(false);
      return;
    }

    const result = await deleteToken(token);
    if (!result.ok) {
      // Deliberately leave the switch ON. `tokens_active` is capped at 20 rows,
      // so a row we failed to delete is a row that keeps receiving messages AND
      // occupies capacity - claiming "off" here would be a lie in both
      // directions, and there'd be no way for the user to retry.
      Alert.alert(
        "Couldn't turn messages off",
        `We couldn't reach the server (${result.error}). You're still subscribed - please try again in a moment.`
      );
      return;
    }

    setExpoPushToken("");
    await persistSubscribed(false);
  };

  const handleToggle = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      if (!next) {
        await unsubscribe();
        return;
      }

      // Turning on: open the OS gate first if it isn't already.
      if (!isPermissionGranted) {
        const granted = await requestOsPermission();
        if (!granted) return; // Denied at the prompt - the status line explains the rest.
      }

      await subscribe();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error occurred";
      handleRegistrationError(message);
    } finally {
      setBusy(false);
    }
  };


  // Null when subscribed: the link below replaces the sentence rather than
  // sitting under it, because "you'll get new wisdom" and "here's the wisdom
  // you got" are the same thought and the link is the one you can act on.
  const statusLine = (() => {
    if (osPermission === "checking") return "Checking...";
    if (isPermissionBlocked) return "Notifications are currently blocked in your device settings.";
    if (switchOn) return null;
    return "Turn on to receive messages.";
  })();

  const appVersion = Constants.expoConfig?.version ?? "unknown";
  // Updates.channel is "" in a dev client. When present it tells a tester which
  // channel their build follows (preview vs production), which is exactly the
  // thing that's otherwise impossible to determine from inside the app.
  const versionLabel = Updates.channel
    ? `${appVersion} (${Updates.channel})`
    : appVersion;

  const checkForUpdates = async () => {
    // checkForUpdateAsync THROWS in a dev client rather than returning a result,
    // so this guard is load-bearing, not defensive.
    if (!Updates.isEnabled) {
      Alert.alert(
        "Not available here",
        "Over-the-air updates only apply to release builds, not to development builds."
      );
      return;
    }

    setCheckingUpdate(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        Alert.alert("You're up to date", `Version ${appVersion} is the latest.`);
        return;
      }

      await Updates.fetchUpdateAsync();
      Alert.alert("Update ready", "Restart the app to use the latest version?", [
        { text: "Later", style: "cancel" },
        { text: "Restart", onPress: () => Updates.reloadAsync() },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Couldn't check for updates", message);
    } finally {
      setCheckingUpdate(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={settingsStyles.card}>
        <Text style={[settingsStyles.heading, settingsStyles.cardHeading]}>
          Account
        </Text>

        <Row label="Meditation history" onPress={() => setShowHistory(true)} />
        <Row label="This month" value={formatMinutes(totals.thisMonth)} />
        <Row label="Last month" value={formatMinutes(totals.lastMonth)} />
        <Row label="All time" value={formatMinutes(totals.allTime)} last />

        <Text style={settingsStyles.statusLine}>
          Your meditation history is stored only on this device. It is never sent to
          the server or shared with anyone.
        </Text>
      </Card>

      <MeditationHistory
        visible={showHistory}
        onClose={() => {
          setShowHistory(false);
          refreshTotals();
        }}
      />


      <Card style={settingsStyles.card}>
        <View style={[styles.row, settingsStyles.switchRow]}>
          <Text style={settingsStyles.heading}>Notifications</Text>
          {busy ? (
            <View style={settingsStyles.switchControl}>
              <ActivityIndicator size="small" color={colors.brand} />
            </View>
          ) : (
            <View style={settingsStyles.switchControl}>
              <Switch
                value={switchOn}
                onValueChange={handleToggle}
                disabled={osPermission === "checking" || isPermissionBlocked}
                // The track carries the state and the thumb stays white, so the on state
                // reads at 3.59:1 rather than the 1.69:1 of the old pale-blue track.
                trackColor={{ false: colors.divider, true: colors.brand }}
                thumbColor={colors.card}
                accessibilityRole="switch"
                accessibilityLabel="Receive push notifications"
              />
            </View>
          )}
        </View>

        {statusLine && (
          <Text style={settingsStyles.statusLine}>{statusLine}</Text>
        )}

        {switchOn && (
          <Text
            style={settingsStyles.link}
            onPress={() =>
              navigation.navigate("HomeTabs", { screen: "Messages" })
            }
            accessibilityRole="link"
          >
            See your latest message
          </Text>
        )}

        {isPermissionBlocked && (
          <Text
            style={[settingsStyles.link, settingsStyles.linkAfterText]}
            onPress={() => Linking.openSettings()}
            accessibilityRole="link"
          >
            Open notification settings
          </Text>
        )}
      </Card>

            <Card style={settingsStyles.card}>
        <Text style={[settingsStyles.heading, settingsStyles.cardHeading]}>
          Contact
        </Text>

        <Row label="Get in touch" onPress={() => navigation.navigate("Contact")} />
        <Row
          label="followCrom online"
          onPress={() => Linking.openURL(FOLLOWCROM_URL)}
          external
          last
        />
      </Card>

      <Card style={settingsStyles.card}>
        <Text style={[settingsStyles.heading, settingsStyles.cardHeading]}>
          About
        </Text>

        <Row label="Version" value={versionLabel} />
        <Row
          label="Check for updates"
          onPress={checkForUpdates}
          busy={checkingUpdate}
        />
        <Row
          label="Privacy & data"
          onPress={() => Linking.openURL(PRIVACY_URL)}
          external
          last
        />
      </Card>
    </ScrollView>
  );
}

const settingsStyles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.brandStrong,
    flexShrink: 1,
  },
  cardHeading: {
    marginBottom: 4,
  },

  // --- Notifications ---
  switchRow: {
    minHeight: 44,
  },
  // Fixed width so the switch and the spinner that replaces it occupy the same
  // space - otherwise the label shifts sideways every time a toggle is in flight.
  switchControl: {
    width: 52,
    alignItems: "flex-end",
  },
  // Subscribed shows a link where every other state shows a sentence, so these
  // two must occupy identical vertical space - matching size and top margin -
  // or the card grows and shrinks as the switch is toggled.
  statusLine: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  link: {
    fontSize: 16,
    color: colors.brandStrong,
    textDecorationLine: "underline",
    marginTop: 4,
  },
  // The blocked state is the one case where a link sits BELOW a sentence rather
  // than instead of one, and there it needs the breathing room back.
  linkAfterText: {
    marginTop: 10,
  },

  // --- About rows ---
  row: {
    minHeight: 52,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    fontSize: 18,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  rowValue: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
