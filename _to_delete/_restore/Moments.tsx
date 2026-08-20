import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio";
import styles from "./styles/Styles";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

// --- Type Definitions ---

type AudioFile = {
  name: string;
  url: string;
};

type RootStackParamList = {
  Moments: undefined;
};

type MomentsNavigationProp = StackNavigationProp<RootStackParamList, "Moments">;

// --- Component ---

export default function Moments() {
  const navigation = useNavigation<MomentsNavigationProp>();
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);

  // Create a single player instance that we'll reuse
  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);
  const isPlaying = status?.playing;
  const shouldAutoPlay = useRef(false);

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

  useEffect(() => {
    const fetchAudioFiles = async () => {
      try {
        const url =
          "https://followcrom.com/audio/moments/moments.json?" +
          new Date().getTime();
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        setAudioFiles(data);
      } catch (error) {
        console.error("Failed to fetch audio files:", error);
      }
    };

    fetchAudioFiles();
  }, []);

  // Load new audio when currentIndex changes
  useEffect(() => {
    if (currentIndex !== null && audioFiles[currentIndex]) {
      shouldAutoPlay.current = true;
      const currentAudioUrl = audioFiles[currentIndex].url;
      player.replace(currentAudioUrl);
    }
  }, [currentIndex, audioFiles, player]);

  // Auto-play when new audio is loaded, but only if triggered by a new track selection
  useEffect(() => {
    if (player && status?.isLoaded && currentIndex !== null && shouldAutoPlay.current) {
      shouldAutoPlay.current = false;
      player.play();
    }
  }, [player, status?.isLoaded, currentIndex]);

  // Seek to start when audio finishes so pressing play restarts it
  useEffect(() => {
    if (status?.didJustFinish) {
      shouldAutoPlay.current = false;
      player.seekTo(0);
      player.pause();
    }
  }, [status?.didJustFinish, player]);

  // Clean up when navigating away
useEffect(() => {
  const unsubscribe = navigation.addListener("blur", () => {
    if (player) {
      player.pause();   // Stop playback immediately
      player.seekTo(0); // Reset to start
    }
    setCurrentIndex(null);
  });

  return unsubscribe;
}, [navigation, player]);


  // --- Control Functions ---

  const playAudio = (index: number) => {
    if (index === currentIndex) {
      isPlaying ? player.pause() : player.play();
    } else {
      setCurrentIndex(index);
    }
  };

  const playPrevious = () => {
    if (currentIndex !== null) {
      const newIndex =
        (currentIndex - 1 + audioFiles.length) % audioFiles.length;
      setCurrentIndex(newIndex);
    }
  };

  const playNext = () => {
    if (currentIndex !== null) {
      const newIndex = (currentIndex + 1) % audioFiles.length;
      setCurrentIndex(newIndex);
    }
  };

  const stopSound = () => {
    player.pause();
    setCurrentIndex(null);
  };

  const repeatCurrent = () => {
    if (player && status?.isLoaded) {
      player.seekTo(0);
    }
  };

  // Absolute fill view to cover parent, which means that it will take up the entire screen. The parent is the screen area allocated by the navigator.
  
  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Transport controls */}
      <View style={speechPageStyles.transportButtonsRow}>
        <Ionicons
          name="play-skip-back-circle-outline"
          size={48}
          color="#007BFF"
          onPress={playPrevious}
          disabled={currentIndex === null}
        />
        <Ionicons
          name="reload-circle-outline"
          size={48}
          color="#f39b51"
          onPress={() => repeatCurrent()}
          disabled={currentIndex === null}
        />
        <Ionicons
          name={isPlaying ? "pause-circle-outline" : "play-circle-outline"}
          size={48}
          color={isPlaying ? "#a999d2" : "green"}
          onPress={() => playAudio(currentIndex ?? 0)}
          disabled={audioFiles.length === 0}
        />
        <Ionicons
          name="stop-circle-outline"
          size={48}
          color="red"
          onPress={stopSound}
          disabled={currentIndex === null}
        />
        <Ionicons
          name="play-skip-forward-circle-outline"
          size={48}
          color="#007BFF"
          onPress={playNext}
          disabled={currentIndex === null}
        />
      </View>

      <ScrollView contentContainerStyle={styles.listContainer}>
        {audioFiles.map((item, index) => (
          <TouchableOpacity
            key={index.toString()}
            style={[
              styles.listItem,
              {
                backgroundColor:
                  index === currentIndex
                    ? "#007BFF"
                    : index % 2 === 0
                    ? "#e0e0e0"
                    : "white",
              },
            ]}
            onPress={() => playAudio(index)}
          >
            <Text
              style={[
                styles.listItemText,
                { color: index === currentIndex ? "white" : "#007BFF" },
              ]}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// Styles for SpeechPage component
const speechPageStyles = StyleSheet.create({
  transportButtonsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-evenly",
    alignItems: "center",
    padding: 10,
    backgroundColor: "white",
  },
});