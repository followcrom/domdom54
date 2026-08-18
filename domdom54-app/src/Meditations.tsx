import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import styles from "./styles/Styles";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import MeditationHistory from "./MeditationHistory";

// --- Type Definitions ---

// Define the shape of an individual audio file object
type AudioFile = {
  name: string;
  url: string;
};

// Define the navigation props for this screen
type RootStackParamList = {
  Meditations: undefined;
  MeditationPlayer: { audioUrl: string; title: string };
};

type MeditationsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Meditations"
>;

// Define the props for the custom TabBar component
type TabBarProps = {
  tabs: string[];
  activeTab: number;
  setActiveTab: (index: number) => void;
};

// Define props for the MeditationItem component
type MeditationItemProps = {
  item: AudioFile;
  index: number;
  onPress: (url: string, name: string) => void;
};

// --- Optimized Components ---

const TabBar: React.FC<TabBarProps> = React.memo(({ tabs, activeTab, setActiveTab }) => {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-around",
        paddingTop: 20,
        paddingBottom: 15,
        backgroundColor: "white",
      }}
    >
      {tabs.map((tab, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => setActiveTab(index)}
          accessibilityLabel={`Switch to ${tab} tab`}
        >
          <Text
            style={{
              color: activeTab === index ? "#FF4500" : "grey",
              borderBottomWidth: activeTab === index ? 2 : 0,
              borderBottomColor:
                activeTab === index ? "#FF4500" : "transparent",
              fontSize: 18,
            }}
          >
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
});

// Memoized list item component to prevent unnecessary re-renders
const MeditationItem: React.FC<MeditationItemProps> = React.memo(({ item, index, onPress }) => {
  const handlePress = useCallback(() => {
    onPress(item.url, item.name);
  }, [item.url, item.name, onPress]);

  const itemStyle = useMemo(() => [
    styles.listItem,
    { backgroundColor: index % 2 === 0 ? "#e0e0e0" : "white" },
  ], [index]);

  return (
    <TouchableOpacity
      style={itemStyle}
      accessible={true}
      accessibilityLabel={`Play ${item.name} meditation`}
      onPress={handlePress}
    >
      <Text style={styles.listItemText}>{item.name}</Text>
    </TouchableOpacity>
  );
});

export default function Meditations() {
  const navigation = useNavigation<MeditationsScreenNavigationProp>();
  const [activeTab, setActiveTab] = useState(1); // Start with tab
  const [showHistory, setShowHistory] = useState(false);
  const tabs = ["Short", "Medium", "Long"];
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);

  const fetchAudioFiles = async () => {
    try {
      const urls = [
        "https://followcrom.com/audio/meditations/meditations_short.json",
        "https://followcrom.com/audio/meditations/meditations_medium.json",
        "https://followcrom.com/audio/meditations/meditations_long.json",
      ];
      // Add a cache-busting query parameter
      const url = `${urls[activeTab]}?t=${new Date().getTime()}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error("HTTP error:", response.status);
      } else {
        const data = await response.json();
        setAudioFiles(data);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    fetchAudioFiles();
  }, [activeTab]);

  // Memoized callback to prevent re-creation on every render
  const handlePress = useCallback((url: string, name: string) => {
    navigation.navigate("MeditationPlayer", { audioUrl: url, title: name });
  }, [navigation]);

  // Memoized keyExtractor function
  const keyExtractor = useCallback((item: AudioFile) => item.name, []);

  // Memoized renderItem function
  const renderItem = useCallback(({ item, index }: { item: AudioFile; index: number }) => (
    <MeditationItem item={item} index={index} onPress={handlePress} />
  ), [handlePress]);

  // Memoized content container style
  const contentContainerStyle = useMemo(() => [
    styles.listContainer, 
    { paddingBottom: 50 } // Add padding to the bottom for better scroll experience
  ], []);

  return (
    <View style={medPageStyles.container}>
      <View style={medPageStyles.headerRow}>
        <View style={medPageStyles.tabBarWrapper}>
          <TabBar tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
        </View>
        <TouchableOpacity
          onPress={() => setShowHistory(true)}
          style={medPageStyles.historyButton}
          accessibilityLabel="View meditation history"
        >
          <MaterialCommunityIcons name="history" size={28} color="#007BFF" />
        </TouchableOpacity>
      </View>

      <MeditationHistory visible={showHistory} onClose={() => setShowHistory(false)} />

      <FlatList
        contentContainerStyle={contentContainerStyle}
        data={audioFiles}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
        getItemLayout={(data, index) => ({
          length: 60, // Adjust this to match your actual item height
          offset: 60 * index,
          index,
        })}
      />
    </View>
  );
}

// Corresponding styles
const medPageStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
  },
  tabBarWrapper: {
    flex: 1,
  },
  historyButton: {
    paddingHorizontal: 10,
    paddingTop: 8,
  },
});