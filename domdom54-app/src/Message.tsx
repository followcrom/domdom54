import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Linking,
  ScrollView,
  TouchableOpacity,
  ToastAndroid,
  ActivityIndicator,
  useWindowDimensions,
  Modal,
  Pressable,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAudioPlayback } from "./hooks/useAudioPlayback";
import styles from "./styles/Styles";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// --- Type Definitions ---

// The shape of the message data object
type MessageData = {
  id?: number; // <-- Make id optional
  title: string;
  body: string;
  imageUrl: string | null;
  url: string | null;
  audio: string | null;
};

// Define the navigation and route props for this screen
type RootStackParamList = {
  Message: Partial<MessageData>; // Params are optional
  // Add other screens here
};

type MessageRouteProp = RouteProp<RootStackParamList, "Message">;
type MessageNavigationProp = StackNavigationProp<RootStackParamList>;

const defaultMessage: MessageData = {
    title: "Your Messages",
    body: "You have 0 new messages. Hold tight, wisdom is on the way.",
    id: undefined,
    imageUrl: null,
    url: null,
    audio: null,
};

// --- Component ---

export default function Message() {
  const insets = useSafeAreaInsets();
  const route = useRoute<MessageRouteProp>();
  const navigation = useNavigation<MessageNavigationProp>();

  const [messageData, setMessageData] = useState<MessageData>(defaultMessage);

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // Audio player: handles play/pause, a loading spinner, and load failures.
  const { isPlaying, isLoadingPlayback, audioError, togglePlayPause } =
    useAudioPlayback(messageData.audio);

  // --- Effects ---

  // This effect handles loading/saving the message data
  useEffect(() => {
    const loadMessage = async () => {
      try {
        const savedMessage = await AsyncStorage.getItem("lastMessage");
        if (savedMessage !== null) {
          setMessageData(JSON.parse(savedMessage));
        }
      } catch (error) {
        console.error("Failed to load the message:", error);
      }
    };

    const saveMessage = async (message: MessageData) => {
      try {
        await AsyncStorage.setItem("lastMessage", JSON.stringify(message));
      } catch (error) {
        console.error("Failed to save the message:", error);
      }
    };

    if (route.params && Object.keys(route.params).length > 0) {
      // If we have new params, update the state and save to storage
      const newMessage = { ...defaultMessage, ...route.params };
      setMessageData(newMessage);
      saveMessage(newMessage);
    } else {
      // If no new params, load the last saved message
      loadMessage();
    }
  }, [route.params]);

  const { id, title, body, imageUrl, url, audio } = messageData;

  const showId = () => {
    ToastAndroid.show(id ? id.toString() : "No ID", ToastAndroid.SHORT);
  };

  // Tap the header image to view it full screen; tap anywhere (or Android back)
  // to dismiss. Falls back to the bundled image when the push carries no imageUrl.
  const [isImageFullScreen, setIsImageFullScreen] = useState(false);

  const imageSource = imageUrl
    ? { uri: imageUrl }
    : require("../assets/images/random_wisdom_landscape.jpg");

  // --- Render ---

  return (
<ScrollView contentContainerStyle={[
  styles.container,
  { paddingTop: insets.top, paddingBottom: insets.bottom }
]}>
      <View style={messageStyles.closeContainer}>
        <Ionicons
          name="close-circle-outline"
          size={40}
          color="darkgrey"
          onPress={() => navigation.goBack()}
        />
      </View>
      <Pressable
        onPress={() => setIsImageFullScreen(true)}
        accessibilityRole="imagebutton"
        accessibilityLabel="View image full screen"
        // Must stretch: the parent centres its children, so without an explicit
        // width this wrapper shrinks to fit and the image's width:"100%" has
        // nothing to resolve against, collapsing it to zero.
        style={messageStyles.imagePressable}
      >
        <Image source={imageSource} style={messageStyles.topImage} />
      </Pressable>
        <View style={[styles.textContainer, isLandscape && styles.textContainerLandscape]}>
        {title && <Text style={styles.title}>{title}</Text>}
              <Text
                style={[
                  styles.textOutput,
                  isLandscape && styles.textOutputLandscape,
                ]}
                onPress={showId}>
          {body}
        </Text>

        {audio && audio !== null && (
          <View style={messageStyles.audioContainer}>
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
              <Text style={messageStyles.audioError}>{audioError}</Text>
            )}
          </View>
        )}
        {/* Renders only when the push payload carries a `url`. Senders currently
            omit it, so the button stays hidden — but leaving this live means a
            future URL needs only a payload change, not an app release. */}
        {url && (
          <TouchableOpacity
            style={messageStyles.button}
            onPress={() => Linking.openURL(url)}
            activeOpacity={0.8}
          >
            <View style={messageStyles.buttonContent}>
              <Ionicons 
                name="globe-outline" 
                size={24} 
                color="white" 
                style={messageStyles.buttonIcon}
              />
              <Text style={messageStyles.buttonText}>Visit Link</Text>
              <Ionicons 
                name="arrow-forward" 
                size={20} 
                color="white" 
                style={messageStyles.buttonArrow}
              />
            </View>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={isImageFullScreen}
        transparent={false}
        animationType="fade"
        // Required on Android: without this the hardware/gesture back button
        // cannot dismiss the modal.
        onRequestClose={() => setIsImageFullScreen(false)}
        // Lets the modal draw behind the status bar, which Android 16 enforces.
        statusBarTranslucent
      >
        <Pressable
          style={messageStyles.fullScreenBackdrop}
          onPress={() => setIsImageFullScreen(false)}
          accessibilityRole="button"
          accessibilityLabel="Close full screen image"
        >
          <Image
            source={imageSource}
            style={messageStyles.fullScreenImage}
            resizeMode="contain"
          />
        </Pressable>

        <Ionicons
          name="close-circle"
          size={40}
          color="white"
          onPress={() => setIsImageFullScreen(false)}
          style={[messageStyles.fullScreenClose, { top: insets.top + 10 }]}
        />
      </Modal>
    </ScrollView>
  );
}

const messageStyles = StyleSheet.create({
  closeContainer: {
    padding: 10,
    marginTop: 10, // A little extra than safe area insets
  },
  imagePressable: {
    width: "100%",
  },
  fullScreenBackdrop: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenImage: {
    width: "100%",
    height: "100%",
  },
  fullScreenClose: {
    position: "absolute",
    right: 15,
  },
  audioContainer: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
    width: "60%",
    alignSelf: "center",
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderStyle: "dashed",
    borderColor: "#007BFF",
    padding: 5,
  },
  audioError: {
    color: "#e74c3c",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  topImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  button: {
    width: "85%",
    alignSelf: "center",
    backgroundColor: "#007BFF",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: "center",
    marginVertical: 15,
    shadowColor: "#007BFF",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    transform: [{ scale: 1 }],
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 24,
  },
  buttonIcon: {
    marginRight: 12,
  },
  buttonArrow: {
    marginLeft: 8,
    opacity: 0.8,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});