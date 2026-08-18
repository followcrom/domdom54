import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  ScrollView,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  useWindowDimensions,
  ToastAndroid,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "./styles/Styles";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useAudioPlayback } from "./hooks/useAudioPlayback";

// --- Type Definitions ---

type PhraseData = {
  id: number;
  phrase: string;
  title: string;
  audio?: string | null;
};

type RootStackParamList = {
  Text: undefined;
  Discuss: { discussPhrase: string };
};

type TextPageNavigationProp = StackNavigationProp<RootStackParamList, "Text">;

// --- Component ---

export default function TextPage() {
  const navigation = useNavigation<TextPageNavigationProp>();

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [outputText, setOutputText] = useState("");
  const [title, setTitle] = useState("");
  const [phraseId, setPhraseId] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Audio player: handles play/pause, a loading spinner, and load failures.
  const { isPlaying, isLoadingPlayback, audioError, togglePlayPause } =
    useAudioPlayback(audioUrl);

  useEffect(() => {
    getRandomPhrase();
  }, []);

  const getRandomPhrase = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "https://ur3fnc2j12.execute-api.eu-west-2.amazonaws.com/getPhraseStage/getphrase"
      );
      const data: PhraseData = await response.json();

      if (data && data.id !== undefined && data.phrase !== undefined) {
        setOutputText(data.phrase);
        setTitle(data.title);
        setPhraseId(data.id);
        setAudioUrl(data.audio || null);
        // console.log("Full API Response:", JSON.stringify(data, null, 2)); // dev only — don't dump full API response in release
      } else {
        console.error("Received unexpected data structure:", data);
        setOutputText("An error occurred. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setOutputText("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const showId = () => {
    ToastAndroid.show(phraseId.toString(), ToastAndroid.SHORT);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image
        source={require("../assets/images/random_wisdom_landscape.jpg")}
        style={isLandscape ? styles.imageLandscape : styles.image}
      />

        <View style={[styles.textContainer, isLandscape && styles.textContainerLandscape]}>
        {loading ? (
          <View style={{ padding: 10 }}>
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
        ) : (
          <>
            {title && <Text style={textPageStyles.title}>{title}</Text>}
            <Text
              style={[
                styles.textOutput,
                isLandscape && styles.textOutputLandscape,
              ]}
              onPress={showId}
            >
              {outputText}
            </Text>

            {audioUrl && (
              <View style={styles.audioContainer}>
                {isLoadingPlayback ? (
                  <ActivityIndicator size="large" color="#007BFF" />
                ) : (
                  <Ionicons
                    name={isPlaying ? "pause-circle-outline" : "play-circle-outline"}
                    size={48}
                    color={isPlaying ? "orange" : "#007BFF"}
                    onPress={togglePlayPause}
                  />
                )}
                {audioError && (
                  <Text style={textPageStyles.audioError}>{audioError}</Text>
                )}
              </View>
            )}
          </>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.buttonIcon} onPress={getRandomPhrase}>
          <Ionicons name="bulb-outline" size={48} color="white" />
          <Text style={styles.buttonText}>Generate Wisdom</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.buttonIcon}
          onPress={() =>
            navigation.navigate("Discuss", { discussPhrase: outputText })
          }
          disabled={!outputText || loading}
        >
          <Ionicons name="chatbubbles-sharp" size={48} color="white" />
          <Text style={styles.buttonText}>Discuss</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const textPageStyles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#007BFF",
    marginTop: 10,
    textAlign: "center",
  },
  audioError: {
    color: "#e74c3c",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
});
