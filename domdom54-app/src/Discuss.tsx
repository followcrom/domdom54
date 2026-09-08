import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {
  StyleSheet,
  Text,
  ScrollView,
  View,
  ActivityIndicator,
  TextInput,
  Pressable,
  Keyboard,
  KeyboardAvoidingView,
} from "react-native";
import styles from "./styles/Styles";
import colors from "./styles/colors";
import { Banner, Card } from "./components/Layout";
import { Ionicons } from "@expo/vector-icons";
import {
  useRoute,
  useFocusEffect,
  RouteProp,
} from "@react-navigation/native";
import type { TabParamList } from "./navigation/Tabs";

// --- Type Definitions ---
type ConversationMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
};

// Discuss is a tab, so its params come from the tab navigator's own list rather
// than a local restatement of them. The optional `discussPhrase` this file had
// always declared is now what TabParamList says too, so the two can no longer
// disagree about whether a phrase is guaranteed.
type DiscussScreenRouteProp = RouteProp<TabParamList, "Discuss">;

type APIError = {
  message: string;
  code?: string;
};

// --- Constants ---
const MAX_CONVERSATION_LENGTH = 20;
const REQUEST_TIMEOUT = 30000;
// The Lambda behind this URL relays to DeepSeek, which the privacy policy names
// explicitly (docs/privacy-policy.html) - change the provider and that page must change too.
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
    setLoading(false);
  }, []);

  // Reset and fetch initial response
  const resetAndFetch = useCallback(async (phrase: string) => {
    try {
      resetState(); // Clear state first
      setLoading(true);

      // The phrase goes up BEFORE the request, not after it. It is already known -
      // it arrived in the route params - so making the user stare at an empty card
      // until the model answers was never necessary.
      addToConversation("user", phrase);

      const initialPrompt = `Provide a concise, insightful expansion on the following quote without restating it: "${phrase}"`;

      const messages: ConversationMessage[] = [
        systemMessage,
        { role: "user", content: initialPrompt, timestamp: Date.now() }
      ];

      const response = await fetchOpenAIResponse(messages);

      addToConversation("assistant", response);
      
      // Auto-scroll to show response
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
    } catch (error: any) {
      console.error("Reset and fetch error:", error);
      // Into the conversation, where it is actually rendered. This used to go to
      // `outputText`, which nothing displayed - so a failed request left the screen
      // blank and silent.
      addToConversation(
        "assistant",
        "followCrom says: I apologize, but I'm having trouble connecting to my wisdom right now. Please try again."
      );
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

      // Same order as above: the user's turn appears immediately, the reply follows.
      addToConversation("user", trimmedInput);
      setUserInput("");

      const response = await fetchOpenAIResponse(messages);

      addToConversation("assistant", response);
      
      // Auto-scroll to show new response
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
    } catch (error: any) {
      console.error("Follow-up error:", error);
      addToConversation("assistant", `Error: ${error.message}`);
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

  // Send is available when there is something to send and nothing in flight. Named
  // once so the button's enabled state, its tint and its accessibilityState cannot
  // drift apart.
  const canSend = !loading && userInput.trim().length > 0;

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
          {/* The bubbles always render, and the spinner always sits under them.
              There used to be two spinners behind a length check - a large one that
              replaced the conversation entirely while it was empty, and a small one
              underneath once it was not. Since the user's turn now goes up before
              the request, the first case only ever meant "blank screen". */}
          <View style={{ paddingHorizontal: 10 }}>
            {conversationHistory.map((msg, index) => (
              <MessageBubble key={`${msg.timestamp}-${index}`} message={msg} />
            ))}
          </View>

          {loading && (
            <View style={discussPageStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.brand} />
              <Text style={discussPageStyles.loadingText}>
                followCrom is thinking...
              </Text>
            </View>
          )}
        </Card>

        {/* Send lives in the field's own row now.
            It was a 300pt PrimaryButton two gaps below a TextInput that sat in its
            own Card, and it greyed out when the field was empty. That is the right
            behaviour - every chat composer disables send on an empty field - but a
            disabled control only explains itself when the thing it depends on is
            next to it. Two Cards apart, the grey read as arbitrary.
            Nothing about the states changed here; only the distance. */}
        <View style={[styles.surface, styles.contentWidth, discussPageStyles.composer]}>
          <TextInput
            ref={textInputRef}
            style={discussPageStyles.input}
            accessibilityLabel="Input field for talking to followCrom"
            placeholder="Ask followCrom..."
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

          {/* Pressable rather than TouchableOpacity, with an explicit circular
              ripple. Android draws its own press/focus highlight otherwise, and on a
              small view that highlight is square and can outlive the touch until
              focus moves elsewhere - which is the artefact you are seeing. Giving it
              a bounded ripple of our own replaces that drawable; `overflow: hidden`
              on the style clips whatever is left to the circle. Unverified from
              here - if it persists, it is a platform quirk and not worth chasing. */}
          <Pressable
            style={[
              discussPageStyles.send,
              !canSend && discussPageStyles.sendDisabled,
            ]}
            android_ripple={{ color: colors.divider, radius: 22, borderless: false }}
            onPress={handleFollowUp}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel="Ask followCrom"
            accessibilityHint="Send your message to followCrom for wisdom"
            accessibilityState={{ disabled: !canSend }}
          >
            {/* No spinner here. The conversation card above already shows one -
                two spinners for one request reads as two things happening, and
                swapping this button's contents mid-press is also what left a
                highlight behind on Android. */}
            <Ionicons
              name="arrow-up"
              size={24}
              color={canSend ? colors.textInverse : colors.textDisabled}
            />
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Enhanced styles for Discuss component
const discussPageStyles = StyleSheet.create({
  // The composer: one white row holding the field and its send button, so "nothing
  // to send" is legible without a word of explanation. Composed on top of
  // styles.surface and styles.contentWidth, so only what differs lives here -
  // radius 26 is half the row's height, which is what makes it read as a single
  // control rather than a panel.
  composer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 26,
  },

  // No border of its own - the composer row is the control's outline.
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    color: colors.textPrimary,
    paddingVertical: 10,
    paddingRight: 10,
    minHeight: 44,
  },

  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brandStrong,
    borderWidth: 1.5,
    borderColor: colors.brandStrong,
    alignItems: "center",
    justifyContent: "center",
    // Clips anything the platform draws behind the control - Android's focus and
    // press highlights are square and outlive the touch on a view this small.
    overflow: "hidden",
  },

  // Same treatment as a disabled PrimaryButton: a white fill with a visible outline,
  // not a dimmed blue, which reads as broken rather than unavailable.
  sendDisabled: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  loadingContainer: {
    paddingTop: 14,
    paddingBottom: 4,
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