import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  ScrollView,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  useWindowDimensions,
  ToastAndroid,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import styles from "./styles/Styles";
import { useFocusEffect } from "@react-navigation/native";

// --- Type Definitions ---

type SearchResult = {
  id: number;
  phrase: string;
  title: string;
};

// --- Component ---

export default function Search() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [outputText, setOutputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phraseId, setPhraseId] = useState(0);

  // This effect resets the screen's state whenever it comes into focus
  useFocusEffect(
    useCallback(() => {
      // Reset on focus
      setOutputText("");
      setSearchQuery("");
      setSearchResults([]);
      setCurrentIndex(0);
      setSearchPerformed(false);
      setLastQuery("");
      setLoading(false);
      
      // No cleanup needed since we reset on focus
    }, [])
  );

  const handleSearch = () => {
    const searchTerm = searchQuery.trim();

    if (!searchTerm) {
      setOutputText("Please enter a search term.");
      setSearchPerformed(true);
      return;
    }

    setLoading(true);
    setSearchPerformed(true);
    setLastQuery(searchTerm);
    setSearchResults([]); // Clear previous results

    fetch(
      "https://c7h8lmqr9l.execute-api.eu-west-2.amazonaws.com/searchPhraseStage/searchphrase",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchTerm }),
      }
    )
      .then((response) => response.json())
      .then((data) => {
        const responseBody = JSON.parse(data.body);
        setLoading(false);
        if (responseBody.Items && responseBody.Items.length > 0) {
          setSearchResults(responseBody.Items);
          setCurrentIndex(0);
          setOutputText(responseBody.Items[0].phrase);
          setPhraseId(responseBody.Items[0].id);
        } else {
          setOutputText(`No matches found for '${searchTerm}'.`);
        }
        setSearchQuery(""); // Clear the input field
      })
      .catch((error) => {
        console.error("Error:", error);
        setOutputText("An error occurred during the search.");
        setLoading(false);
      });
  };

  const handleNext = () => {
    if (currentIndex < searchResults.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setOutputText(searchResults[newIndex].phrase);
      setPhraseId(searchResults[newIndex].id);
  }
};

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setOutputText(searchResults[newIndex].phrase);
      setPhraseId(searchResults[newIndex].id);
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

      {searchPerformed && searchResults.length > 0 && (
        <Text style={searchPageStyles.resultsTopline}>
          Results for:{" "}
          <Text style={{ fontStyle: "italic", fontWeight: "bold" }}>
            {lastQuery}
          </Text>
        </Text>
      )}

      {searchPerformed && searchResults.length > 0 && (
        <View style={styles.transportButtonsRow}>
          <Ionicons
            style={styles.transportButtonsStyle}
            name="play-skip-back-outline"
            size={36}
            color={currentIndex > 0 ? "orange" : "grey"}
            onPress={handlePrevious}
            disabled={currentIndex === 0}
          />
          <Ionicons
            style={styles.transportButtonsStyle}
            name="play-skip-forward-outline"
            size={36}
            color={currentIndex < searchResults.length - 1 ? "green" : "grey"}
            onPress={handleNext}
            disabled={currentIndex >= searchResults.length - 1}
          />
        </View>
      )}

      {searchPerformed && searchResults.length > 0 && (
        <Text style={searchPageStyles.result}>
          {currentIndex + 1} of {searchResults.length}
        </Text>
      )}
      {searchPerformed && (
        <View style={[styles.textContainer, isLandscape && styles.textContainerLandscape]} onTouchEnd={showId}>
          {loading ? (
            <View style={{ padding: 10 }}>
              <ActivityIndicator size="large" color="#0000ff" />
            </View>
          ) : (
            <>
              {searchResults[currentIndex]?.title && (
                <Text style={styles.title}>
                  {searchResults[currentIndex].title}
                </Text>
              )}
              <Text
                style={[
                  styles.textOutput,
                  isLandscape && styles.textOutputLandscape,
                ]}
              >
                {outputText}
              </Text>
            </>
          )}
        </View>
      )}

      <TextInput
        style={searchPageStyles.input}
        value={searchQuery}
        accessibilityLabel="Search input field"
        onChangeText={setSearchQuery}
        onSubmitEditing={handleSearch}
        autoCorrect={false}
        autoCapitalize="none"
        placeholder="Search for wisdom ..."
        placeholderTextColor="#888"
      />

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.buttonIcon} onPress={handleSearch}>
          <MaterialCommunityIcons
            name="comment-search-outline"
            size={48}
            color="white"
          />
          <Text style={styles.buttonText}>Search</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const searchPageStyles = StyleSheet.create({
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
  result: {
    justifyContent: "center",
    alignItems: "center",
    fontSize: 15,
    color: "#FF7F00",
    textAlign: "center",
  },
  resultsTopline: {
    fontSize: 24,
    color: "#007BFF",
    textAlign: "center",
    marginVertical: 10,
  },
});
