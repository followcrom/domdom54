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
import colors from "./styles/colors";
import { useNavigation } from "@react-navigation/native";

// --- Type Definitions ---

type AudioFile = {
  name: string;
  url: string;
};

// --- Component ---

export default function Moments() {
  // Untyped on purpose: this screen never navigates anywhere. The only thing it
  // wants from navigation is the "blur" event, to stop playback on the way out,
  // so there are no routes for a param list to describe.
  const navigation = useNavigation();
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
      <View style={[styles.transportButtonsRow, speechPageStyles.transportButtonsRow]}>
        <Ionicons
          name="play-skip-back-circle-outline"
          size={48}
          color={colors.brand}
          onPress={playPrevious}
          disabled={currentIndex === null}
        />
        <Ionicons
          name="reload-circle-outline"
          size={48}
          color={colors.brand}
          onPress={() => repeatCurrent()}
          disabled={currentIndex === null}
        />
        <Ionicons
          // The row is one blue: every control is brand, always, so the bar reads as a
          // single instrument rather than as a set of separately-styled buttons. Size is
          // what ranks the primary action, and colour stays reserved for state - this is
          // the only icon that turns orange, and only while something is playing.
          name={isPlaying ? "pause-circle-outline" : "play-circle-outline"}
          size={48}
          color={isPlaying ? colors.accentStrong : colors.brand}
          onPress={() => playAudio(currentIndex ?? 0)}
          disabled={audioFiles.length === 0}
        />
        <Ionicons
          name="stop-circle-outline"
          size={48}
          color={colors.brand}
          onPress={stopSound}
          disabled={currentIndex === null}
        />
        <Ionicons
          name="play-skip-forward-circle-outline"
          size={48}
          color={colors.brand}
          onPress={playNext}
          disabled={currentIndex === null}
        />
      </View>

      {/* The list gives blue up entirely so the transport row can have it back. A track
          name is content, not a link, so it is ink; the row that is playing is state, so
          it is orange. Neither colour is doing two jobs.
          The alt/card banding stays. It is only 1.30:1, which did nothing while the labels
          were dark blue and fighting it for attention - against ink on white it is enough
          to walk the eye down the list, which is all it is being asked to do. */}
      <ScrollView contentContainerStyle={styles.listContainer}>
        {audioFiles.map((item, index) => {
          const isCurrent = index === currentIndex;
          return (
            <TouchableOpacity
              key={index.toString()}
              style={[
                styles.listItem,
                {
                  backgroundColor: isCurrent
                    ? colors.accentStrong
                    : index % 2 === 0
                    ? colors.alt
                    : colors.card,
                },
              ]}
              onPress={() => playAudio(index)}
            >
              {isCurrent && (
                <View style={speechPageStyles.nowPlayingMark}>
                  <Ionicons name="stats-chart" size={16} color={colors.textInverse} />
                </View>
              )}
              <Text
                style={[
                  styles.listItemText,
                  {
                    color: isCurrent ? colors.textInverse : colors.textPrimary,
                    fontWeight: isCurrent ? "600" : "400",
                  },
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Styles for SpeechPage component
const speechPageStyles = StyleSheet.create({
  transportButtonsRow: {
    padding: 10,
    backgroundColor: colors.brandSurface,
  },

  // Absolutely positioned so the track name stays optically centred in the row - a marker
  // in the flow would shove every playing title off-centre as it appears and disappears.
  // Stretched top-to-bottom and centred with flex rather than offset from a 50% top: the
  // icon renders as Text, whose line box is taller than its size, so a half-size negative
  // margin under-corrects and leaves the glyph sitting high.
  nowPlayingMark: {
    position: "absolute",
    left: 22,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
});