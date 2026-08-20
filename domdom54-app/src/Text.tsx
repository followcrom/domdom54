import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  ScrollView,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  ToastAndroid,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import styles from "./styles/Styles";
import { Banner, Body, Card } from "./components/Layout";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useAudioPlayback } from "./hooks/useAudioPlayback";

// This screen is a single phrase display with two ways to fill it: shuffle
// (Generate Wisdom) or search. It used to be two near-identical screens - the
// old Search tab duplicated the banner, the card, the title and the ID toast,
// and search results had no Discuss button because Discuss only existed here.
// Merging deletes the duplication and gives results Discuss for free.
//
// The search field is deliberately collapsed until asked for: shuffling is the
// core loop, so the resting screen stays as quiet as it was. If you ever want
// the field permanently visible, initialise `searchOpen` to true - the layout
// is already in the right order for it.

// --- Type Definitions ---

/**
 * One phrase, from either endpoint. `audio` is optional because only the random
 * endpoint returns it: /searchphrase yields id, phrase and title only, so search
 * results simply render without the player. (Backend ticket, not a blocker.)
 */
type Phrase = {
  id: number;
  title: string;
  phrase: string;
  audio?: string | null;
};

type SearchResponseItem = {
  id: number;
  phrase: string;
  title: string;
};

type RootStackParamList = {
  Wisdom: undefined;
  Discuss: { discussPhrase: string };
};

type WisdomNavigationProp = StackNavigationProp<RootStackParamList, "Wisdom">;

const RANDOM_ENDPOINT =
  "https://ur3fnc2j12.execute-api.eu-west-2.amazonaws.com/getPhraseStage/getphrase";
const SEARCH_ENDPOINT =
  "https://c7h8lmqr9l.execute-api.eu-west-2.amazonaws.com/searchPhraseStage/searchphrase";

// --- Component ---

export default function TextPage() {
  const navigation = useNavigation<WisdomNavigationProp>();
  const inputRef = useRef<TextInput>(null);

  // What's on screen right now, whatever produced it.
  const [phrase, setPhrase] = useState<Phrase | null>(null);
  // Shown in the card in place of a phrase: errors, empty results, prompts.
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Search state. `results` being non-empty is what puts the screen in "search
  // mode" - there's no separate mode flag to keep in sync.
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [results, setResults] = useState<Phrase[]>([]);
  const [index, setIndex] = useState(0);

  const hasResults = results.length > 0;

  // Audio player: handles play/pause, a loading spinner, and load failures.
  // Search results carry no audio, so this is null for them and no player renders.
  const { isPlaying, isLoadingPlayback, audioError, togglePlayPause } =
    useAudioPlayback(phrase?.audio ?? null);

  useEffect(() => {
    getRandomPhrase();
    // Deliberately once, on mount. The old Search screen reset itself via
    // useFocusEffect on every focus; merged, that would wipe the phrase (and any
    // search results) every time the user came back to the tab, so it's gone.
  }, []);

  // --- Data ---

  const getRandomPhrase = async () => {
    // Leaving search: clear results, close the field, drop the keyboard.
    setResults([]);
    setIndex(0);
    setLastQuery("");
    setQuery("");
    setSearchOpen(false);
    Keyboard.dismiss();

    setLoading(true);
    setNotice(null);
    try {
      const response = await fetch(RANDOM_ENDPOINT);
      const data: Phrase = await response.json();

      if (data && data.id !== undefined && data.phrase !== undefined) {
        setPhrase({
          id: data.id,
          title: data.title,
          phrase: data.phrase,
          audio: data.audio ?? null,
        });
      } else {
        console.error("Received unexpected data structure:", data);
        setPhrase(null);
        setNotice("An error occurred. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setPhrase(null);
      setNotice("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const runSearch = async () => {
    const searchTerm = query.trim();

    if (!searchTerm) {
      setNotice("Please enter a search term.");
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    setNotice(null);
    setLastQuery(searchTerm);
    setResults([]);
    setIndex(0);

    try {
      const response = await fetch(SEARCH_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchTerm }),
      });
      const data = await response.json();
      // The Lambda returns the payload as a JSON string in `body`.
      const responseBody = JSON.parse(data.body);
      const items: SearchResponseItem[] = responseBody.Items ?? [];

      if (items.length > 0) {
        const mapped: Phrase[] = items.map((item) => ({
          id: item.id,
          title: item.title,
          phrase: item.phrase,
          audio: null,
        }));
        setResults(mapped);
        setPhrase(mapped[0]);
        setQuery("");
      } else {
        setPhrase(null);
        setNotice(`No matches found for '${searchTerm}'.`);
      }
    } catch (error) {
      console.error("Error:", error);
      setPhrase(null);
      setNotice("An error occurred during the search.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * One button, two jobs: reveal the field, then search with it. The label never
   * changes because the action never changes from the user's point of view -
   * "Search" just needs somewhere to type first.
   */
  const handleSearchPress = () => {
    if (!searchOpen) {
      setSearchOpen(true);
      // Focus after the field has actually mounted.
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    runSearch();
  };

  const showResultAt = (nextIndex: number) => {
    setPhrase(results[nextIndex]);
    setIndex(nextIndex);
  };

  const handlePrevious = () => {
    if (index > 0) showResultAt(index - 1);
  };

  const handleNext = () => {
    if (index < results.length - 1) showResultAt(index + 1);
  };

  const showId = () => {
    ToastAndroid.show(phrase ? phrase.id.toString() : "No ID", ToastAndroid.SHORT);
  };

  // --- Render ---

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      // Without this, the first tap on Search while the keyboard is up is eaten
      // dismissing the keyboard instead of running the search.
      keyboardShouldPersistTaps="handled"
    >
      <Banner />

      {/* Search field sits above its results, where a search field belongs. */}
      {searchOpen && (
        <TextInput
          ref={inputRef}
          style={wisdomStyles.input}
          value={query}
          accessibilityLabel="Search input field"
          onChangeText={setQuery}
          onSubmitEditing={runSearch}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          placeholder="Search for wisdom ..."
          placeholderTextColor="#888"
        />
      )}

      {hasResults && (
        <>
          <Text style={wisdomStyles.resultsTopline}>
            Results for:{" "}
            <Text style={wisdomStyles.resultsTerm}>{lastQuery}</Text>
          </Text>

          <View style={styles.transportButtonsRow}>
            <Ionicons
              style={styles.transportButtonsStyle}
              name="play-skip-back-outline"
              size={36}
              color={index > 0 ? "orange" : "grey"}
              onPress={handlePrevious}
              disabled={index === 0}
            />
            <Ionicons
              style={styles.transportButtonsStyle}
              name="play-skip-forward-outline"
              size={36}
              color={index < results.length - 1 ? "green" : "grey"}
              onPress={handleNext}
              disabled={index >= results.length - 1}
            />
          </View>

          <Text style={wisdomStyles.resultCount}>
            {index + 1} of {results.length}
          </Text>
        </>
      )}

      <Card>
        {loading ? (
          <View style={{ padding: 10 }}>
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
        ) : (
          <>
            {/* A notice replaces the card's contents outright - without this
                guard, "Please enter a search term." would appear under the
                previous phrase's title. */}
            {!notice && phrase?.title && (
              <Text style={wisdomStyles.title}>{phrase.title}</Text>
            )}
            <Body onPress={showId}>{notice ?? phrase?.phrase ?? ""}</Body>

            {phrase?.audio && (
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
                  <Text style={wisdomStyles.audioError}>{audioError}</Text>
                )}
              </View>
            )}
          </>
        )}
      </Card>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.buttonIcon} onPress={getRandomPhrase}>
          <Ionicons name="bulb-outline" size={48} color="white" />
          <Text style={styles.buttonText}>Generate Wisdom</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.buttonIcon} onPress={handleSearchPress}>
          <MaterialCommunityIcons
            name="comment-search-outline"
            size={48}
            color="white"
          />
          <Text style={styles.buttonText}>Search</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.buttonIcon}
          onPress={() =>
            navigation.navigate("Discuss", { discussPhrase: phrase?.phrase ?? "" })
          }
          disabled={!phrase || loading}
        >
          <Ionicons name="chatbubbles-sharp" size={48} color="white" />
          <Text style={styles.buttonText}>Discuss</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const wisdomStyles = StyleSheet.create({
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
  input: {
    width: "80%",
    fontSize: 16,
    borderColor: "gray",
    borderWidth: 1,
    borderRadius: 5,
    margin: 10,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 12,
    color: "black",
    backgroundColor: "white",
  },
  resultsTopline: {
    fontSize: 24,
    color: "#007BFF",
    textAlign: "center",
    marginVertical: 10,
  },
  resultsTerm: {
    fontStyle: "italic",
    fontWeight: "bold",
  },
  resultCount: {
    fontSize: 15,
    color: "#FF7F00",
    textAlign: "center",
  },
});
