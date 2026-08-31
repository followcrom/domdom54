import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {
  StyleSheet,
  Text,
  ScrollView,
  View,
  ActivityIndicator,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
} from "react-native";
import styles from "./styles/Styles";
import colors from "./styles/colors";
import { Banner, Card } from "./components/Layout";
import { PrimaryButton } from "./components/PrimaryButton";
import { Ionicons } from "@expo/vector-icons";
import {
  useRoute,
  useFocusEffect,
  RouteProp,
} from "@react-navigation/native";

// --- Type Definitions ---
type ConversationMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
};

type RootStackParamList = {
  Discuss: { discussPhrase?: string };
};

type DiscussScreenRouteProp = RouteProp<RootStackParamList, "Discuss">;

type APIError = {
  message: string;
  code?: string;
};

// --- Constants ---
const MAX_CONVERSATION_LENGTH = 20;
const REQUEST_TIMEOUT = 30000;
const DISCUSS_API_URL =
  "https://qoynswb93m.execute-api.eu-west-2.amazonaws.com/prod/discuss";

// Presentational chat bubble. Kept at module scope (and memoized) so it isn't
// recreated on every Discuss render, which would remount every bubble.
const MessageBubble = React.memo(
  ({ message }: { message: ConversationMessage }) => {
    const isUser = message.role === "user";
    return (
      <View
        style={[
          discussPageStyles.bubble,
          isUser ? discussPageStyles.userBubble : discussPageStyles.assistantBubble,
        ]}
      >
        <Text
          style={isUser ? discussPageStyles.userText : discussPageStyles.assistantText}
        >
          {message.content}
        </Text>
      </View>
    );
  }
);

// --- Component ---
export default function Discuss() {
  const route = useRoute<DiscussScreenRouteProp>();
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // State management
  const [outputText, setOutputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [currentPhrase, setCurrentPhrase] = useState<string>("");

  // System message - memoized to prevent recreation
  const systemMessage = useMemo<ConversationMessage>(() => ({
    role: "system",
    content: "You are followCrom the Wise, a sage of wisdom. Offer concise, insightful guidance. Speak calmly, use humour when needed, and ensure clarity. Begin replies with 'followCrom says:', imparting profound truths succinctly.",
    timestamp: Date.now(),
  }), []);

  // --- Utility: Reset state ---
  const resetState = useCallback(() => {
    console.log("Resetting Discuss state...");

    // Cancel any API request in progress
    abortControllerRef.current?.abort();

    // Reset UI state
    setConversationHistory([]);
    setUserInput("");
    setOutputText("");
    setLoading(false);
  }, []);

  // Reset and fetch initial response
  const resetAndFetch = useCallback(async (phrase: string) => {
    try {
      resetState(); // Clear state first
      setLoading(true);

      const initialPrompt = `Provide a concise, insightful expansion on the following quote without restating it: "${phrase}"`;
      
      const messages: ConversationMessage[] = [
        systemMessage,
        { role: "user", content: initialPrompt, timestamp: Date.now() }
      ];

      const response = await fetchOpenAIResponse(messages);
      
      setOutputText(response);
      addToConversation("user", phrase);
      addToConversation("assistant", response);
      
      // Auto-scroll to show response
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
    } catch (error: any) {
      console.error("Reset and fetch error:", error);
      const errorMessage = "followCrom says: I apologize, but I'm having trouble connecting to my wisdom right now. Please try again.";
      setOutputText(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [systemMessage, resetState]); // Removed circular dependencies

  // --- Watch for discussPhrase changes ---
  useEffect(() => {
    const newPhrase = route.params?.discussPhrase;
    
    if (newPhrase && newPhrase !== currentPhrase) {
      console.log("New phrase detected:", newPhrase);
      setCurrentPhrase(newPhrase);
      resetAndFetch(newPhrase);
    }
  }, [route.params?.discussPhrase, currentPhrase, resetAndFetch]);

  // --- Handle screen focus/blur for cleanup only ---
  useFocusEffect(
    useCallback(() => {
      console.log("Discuss screen focused");
      
      // Return cleanup function for when screen loses focus
      return () => {
        console.log("Discuss screen blurred: Cleaning up requests");
        // Only cancel ongoing requests, don't reset conversation
        abortControllerRef.current?.abort();
        setLoading(false);
      };
    }, [])
  );

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      console.log("Discuss screen unmounted: Full cleanup");
      resetState();
    };
  }, [resetState]);

  // Optimized conversation management
  const addToConversation = useCallback((role: "user" | "assistant", content: string) => {
    const newMessage: ConversationMessage = {
      role,
      content,
      timestamp: Date.now(),
    };

    setConversationHistory(prevHistory => {
      const updatedHistory = [...prevHistory, newMessage];
      // Keep conversation history manageable
      if (updatedHistory.length > MAX_CONVERSATION_LENGTH) {
        // Keep system message and recent messages
        return [systemMessage, ...updatedHistory.slice(-MAX_CONVERSATION_LENGTH + 1)];
      }
      return updatedHistory;
    });
  }, [systemMessage]);

  // Calls the backend proxy, which holds the provider key and adds the system
  // prompt server-side. We only send the user/assistant turns.
  const fetchOpenAIResponse = useCallback(async (
    messages: ConversationMessage[]
  ): Promise<string> => {
    abortControllerRef.current = new AbortController();
    const timeoutId = setTimeout(() => abortControllerRef.current?.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(DISCUSS_API_URL, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: messages
            .filter(({ role, content }) => role !== "system" && typeof content === "string")
            .map(({ role, content }) => ({ role, content })),
        }),
        signal: abortControllerRef.current.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const json = await response.json();

      if (!json.reply) {
        throw new Error("Invalid response from server");
      }

      return json.reply;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error("Request timed out. Please try again.");
      }

      console.error("Discuss API Error:", error);
      throw error;
    }
  }, []);

  // Handle follow-up questions
  const handleFollowUp = useCallback(async () => {
    const trimmedInput = userInput.trim();
    
    if (!trimmedInput) {
      return;
    }

    if (loading) {
      return; // Prevent multiple simultaneous requests
    }

    try {
      setLoading(true);
      Keyboard.dismiss();

      // Build messages array including conversation history
      const messages: ConversationMessage[] = [
        systemMessage,
        ...conversationHistory,
        { role: "user", content: trimmedInput, timestamp: Date.now() }
      ];

      const response = await fetchOpenAIResponse(messages);
      
      setOutputText(response);
      addToConversation("user", trimmedInput);
      addToConversation("assistant", response);
      
      setUserInput("");
      
      // Auto-scroll to show new response
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
    } catch (error: any) {
      console.error("Follow-up error:", error);
      setOutputText(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [userInput, loading, systemMessage, conversationHistory, fetchOpenAIResponse, addToConversation]);

  // Handle input submission
  const handleSubmitEditing = useCallback(() => {
    if (!loading && userInput.trim()) {
      handleFollowUp();
    }
  }, [handleFollowUp, loading, userInput]);

  return (
    <KeyboardAvoidingView
      behavior="height"
      style={{ flex: 1 }}
      keyboardVerticalOffset={90}
    >
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        <Banner />

        <Card>
            <View style={{ paddingHorizontal: 10 }}>
            {loading && conversationHistory.length === 0 ? (
              <View style={discussPageStyles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.brand} />
              <Text style={discussPageStyles.loadingText}>
                followCrom is thinking...
              </Text>
              </View>
            ) : (
              conversationHistory.map((msg, index) => (
              <MessageBubble key={`${msg.timestamp}-${index}`} message={msg} />
              ))
            )}
            </View>
          {loading && conversationHistory.length > 0 && (
            <ActivityIndicator size="small" style={{ margin: 10 }} color={colors.brand} />
          )}
        </Card>

        <Card>
          <TextInput
            ref={textInputRef}
            style={[styles.input, styles.shadowSm, discussPageStyles.input]}
            accessibilityLabel="Input field for talking to followCrom"
            placeholder="Talk to followCrom..."
            value={userInput}
            onChangeText={setUserInput}
            onSubmitEditing={handleSubmitEditing}
            placeholderTextColor={colors.textSecondary}
            multiline={false}
            returnKeyType="send"
            blurOnSubmit={true}
            editable={!loading}
            maxLength={500}
          />
        </Card>

        <PrimaryButton
          label={loading ? "Asking..." : "Ask away!"}
          onPress={handleFollowUp}
          disabled={loading || !userInput.trim()}
          accessibilityLabel="Ask followCrom"
          accessibilityHint="Send your message to followCrom for wisdom"
          renderIcon={(color) => (
            <Ionicons name="chatbubbles-sharp" size={48} color={color} />
          )}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Enhanced styles for Discuss component
const discussPageStyles = StyleSheet.create({
  input: {
    width: "100%",
    padding: 12,
    minHeight: 44,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  bubble: {
    padding: 12,
    borderRadius: 18,
    marginVertical: 5,
    maxWidth: '85%',
  },
  userBubble: {
    backgroundColor: colors.brandStrong,
    alignSelf: 'flex-end',
  },
  assistantBubble: {
    backgroundColor: colors.divider,
    alignSelf: 'flex-start',
  },
  userText: {
    color: colors.textInverse,
    fontSize: 16,
  },
  assistantText: {
    color: colors.textPrimary,
    fontSize: 16,
  },
});