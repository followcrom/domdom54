import React, { useEffect, useRef } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ImageBackground,
} from "react-native";
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";
import styles from "./styles/Styles";
import { Banner, useIsLandscape } from "./components/Layout";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// --- Type Definitions ---

type MeditationLogEntry = {
  timestamp: string;
  title: string;
};

// Define the expected route params for this screen
type RootStackParamList = {
  MeditationPlayer: { audioUrl: string; title: string };
  // Add other screens here if needed
};

// Define the prop types for the navigation and route
type MeditationPlayerRouteProp = RouteProp<
  RootStackParamList,
  "MeditationPlayer"
>;
type MeditationPlayerNavigationProp = StackNavigationProp<RootStackParamList>;

// --- Helper Functions ---

const logMeditationComplete = async (title: string) => {
  try {
    const raw = await AsyncStorage.getItem("meditationLog");
    const log: MeditationLogEntry[] = raw ? JSON.parse(raw) : [];
    log.push({ timestamp: new Date().toISOString(), title });
    await AsyncStorage.setItem("meditationLog", JSON.stringify(log));
  } catch (error) {
    console.error("Error logging meditation completion:", error);
  }
};

// --- Component ---

export default function MeditationPlayer() {
  const insets = useSafeAreaInsets();
  const route = useRoute<MeditationPlayerRouteProp>();
  const navigation = useNavigation<MeditationPlayerNavigationProp>();
  const { audioUrl, title } = route.params;

  const isLandscape = useIsLandscape();

  // Create a single player instance and load the audio URL
  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);

  // Add ref to track if we should auto-play
  const shouldAutoPlay = useRef(true);
  const hasAutoPlayed = useRef(false);

  // Use correct property names from expo-audio
  const isPlaying = status?.playing;
  const isLoading = !status?.duration;
  const duration = status?.duration || 0;
  const position = status?.currentTime || 0;
  const isLoaded = status?.isLoaded;

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  // --- Effects ---

    useEffect(() => {
      const setAudioMode = async () => {
        await setAudioModeAsync({
          shouldPlayInBackground: true,
          interruptionModeAndroid: 'duckOthers',
          playsInSilentMode: true,
        });
      };
      setAudioMode();
    }, []); // Empty array ensures this runs only once

  // Load the audio URL when component mounts
  useEffect(() => {
    if (audioUrl) {
      player.replace(audioUrl);
    }
  }, [audioUrl, player]);

  // Effect to automatically play the sound when the audio is loaded (only once)
  useEffect(() => {
    if (player && isLoaded && !hasAutoPlayed.current && shouldAutoPlay.current) {
      player.play();
      hasAutoPlayed.current = true;
    }
  }, [player, isLoaded]);

  // Log meditation only when playback completes naturally
  useEffect(() => {
    if (status?.didJustFinish) {
      logMeditationComplete(title);
    }
  }, [status?.didJustFinish]);

  // Clean up when navigating away
  useEffect(() => {
    const unsubscribe = navigation.addListener("blur", () => {
      if (player) {
        player.pause();   // Stop playback immediately
        player.seekTo(0); // Reset to start
      }
    });

    return unsubscribe;
  }, [navigation, player]);

  // --- Helper Functions ---

  function formatTime(milliseconds: number): string {
    if (isNaN(milliseconds) || milliseconds < 0) {
      return "00:00";
    }
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const paddedMinutes = String(minutes).padStart(2, "0");
    const paddedSeconds = String(seconds).padStart(2, "0");

    return `${paddedMinutes}:${paddedSeconds}`;
  }

  const seekTo = (newPosition: number) => {
    if (player && isLoaded) {
      const clampedPosition = Math.max(0, Math.min(newPosition, duration));
      player.seekTo(clampedPosition);
    }
  };

  const rewind10 = () => {
    seekTo(position - 10);
  };

  const fastForward10 = () => {
    seekTo(position + 10);
  };

  const stopAndReset = () => {
    if (player) {
      player.pause();
      player.seekTo(0);
    }
  }

  const togglePlayPause = () => {
    if (player && isLoaded) {
      if (isPlaying) {
        player.pause();
      } else {
        player.play();
      }
    }
  }

  // --- Render ---

  return (
    <ImageBackground
      source={require("../assets/images/tile.png")}
      style={playerStyles.bgTiles}
      resizeMode="repeat"
    >

      <View style={[playerStyles.statusbar, { height: insets.top }]} />
      
      <ScrollView contentContainerStyle={[playerStyles.container, { paddingTop: insets.top }]}>
        <View style={playerStyles.closeContainer}>
          <Ionicons
            name="close-circle-outline"
            size={40}
            color="white"
            onPress={() => navigation.goBack()}
          />
        </View>
        <Banner />

        {isLoading && <ActivityIndicator size="large" color="#fff" />}

        <Text style={playerStyles.title}>{title}</Text>

        <View style={[playerStyles.transportContainer, isLandscape && playerStyles.transportContainerLandscape]}>
          <View style={playerStyles.buttonRow}>
            <MaterialCommunityIcons
              style={styles.transportButtonsStyle}
              name="rewind-10"
              size={36}
              color="blue"
              onPress={rewind10}
            />

            <Ionicons
              style={styles.transportButtonsStyle}
              name={isPlaying ? "pause-circle-outline" : "play-circle-outline"}
              size={48}
              color={isPlaying ? "orange" : "green"}
              onPress={togglePlayPause}
            />

            <Ionicons
              style={styles.transportButtonsStyle}
              name="stop-circle-outline"
              size={48}
              color="red"
              onPress={stopAndReset}
            />

            <MaterialCommunityIcons
              style={styles.transportButtonsStyle}
              name="fast-forward-10"
              size={36}
              color="blue"
              onPress={fastForward10}
            />
          </View>

          {/* Progress Bar */}
          <View style={playerStyles.outerProgressBarContainer}>
            <View style={playerStyles.progressBarContainer}>
              <View
                style={{
                  height: 20,
                  borderRadius: 10,
                  width: `${progress}%`,
                  backgroundColor: "#12abef",
                }}
              />
            </View>
          </View>

          <Text style={playerStyles.currPlay}>
            {formatTime(position * 1000)} / {formatTime(duration * 1000)}
          </Text>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

// Corresponding styles
const playerStyles = StyleSheet.create({
  container: {
    justifyContent: "flex-start",
    alignItems: "center",
  },
  bgTiles: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  statusbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.5)', // semi-opaque white
    zIndex: 10,
  },
  closeContainer: {
    padding: 10,
    marginTop: 5, // A liitle extra than safe area insets
  },
    transportContainer: {
    width: "90%",
    backgroundColor: "rgba(255, 255, 255, 0.8)", // Semi-transparent white
    borderRadius: 10,
    margin: 20,
  },
    transportContainerLandscape: {
    width: "80%",
    backgroundColor: "rgba(255, 255, 255, 0.8)", // Semi-transparent white
    borderRadius: 10,
    margin: 20,
  },
  title: {
    textAlign: "center",
    fontWeight: "bold",
    color: "#fff",
    fontSize: 30,
    paddingVertical: 10,
  },
  currPlay: {
    textAlign: "center",
    fontWeight: "bold",
    color: "#FF7F00",
    fontSize: 18,
    paddingVertical: 10,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 20,
  },
  outerProgressBarContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    zIndex: 1,
  },
  progressBarContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    width: "80%",
    height: 24,
    backgroundColor: "white",
    borderColor: "#007BFF",
    borderWidth: 2,
    borderRadius: 20,
    overflow: "hidden",
  },
});