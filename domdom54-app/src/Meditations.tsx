import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from "react-native";
import styles, { LIST_ITEM_HEIGHT, TOP_BAR_HEIGHT } from "./styles/Styles";
import colors from "./styles/colors";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "../App";

// --- Type Definitions ---

// Define the shape of an individual audio file object
type AudioFile = {
  name: string;
  url: string;
};

// The stack's own param list, not a local copy. Note there's no second type
// argument: the local version pinned this to "Meditations", but Meditations is
// a tab inside HomeTabs, not a route on the stack it navigates into.
type MeditationsScreenNavigationProp =
  StackNavigationProp<RootStackParamList>;

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
        alignItems: "center",
        minHeight: TOP_BAR_HEIGHT,
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
              color: activeTab === index ? colors.accentStrong : colors.brand,
              borderBottomWidth: activeTab === index ? 2 : 0,
              borderBottomColor:
                activeTab === index ? colors.accent : "transparent",
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
    { backgroundColor: index % 2 === 0 ? colors.alt : colors.card },
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
  const tabs = ["Short", "10 mins", "Long"];
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
    { paddingBottom: 20 } // Add padding to the bottom for better scroll experience
  ], []);

  return (
    <View style={medPageStyles.container}>
      <View style={medPageStyles.tabBarWrapper}>
        <TabBar tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
      </View>

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
          length: LIST_ITEM_HEIGHT,
          offset: LIST_ITEM_HEIGHT * index,
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
  tabBarWrapper: {
    backgroundColor: colors.brandSurface,
  },
});