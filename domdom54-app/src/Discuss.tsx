import React, { useState, useCallback, useRef, useEffect } from "react";
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
  LayoutChangeEvent,
} from "react-native";
import styles from "./styles/Styles";
import colors from "./styles/colors";
import { Banner, Card } from "./components/Layout";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useRoute,
  useFocusEffect,
  RouteProp,
} from "@react-navigation/native";
import type { TabParamList } from "./navigation/Tabs";

// --- Type Definitions ---
type ConversationMessage = {
  role: "user" | "assistant";
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
  // Where this screen's top actually sits on screen, measured rather than derived
  // from the header's style - see the KeyboardAvoidingView below.
  const rootRef = useRef<View>(null);
  const [screenTop, setScreenTop] = useState(0);
  const measureScreenTop = useCallback(() => {
    rootRef.current?.measureInWindow((_x, y) => setScreenTop(y));
  }, []);
  // measureInWindow on Android counts from BELOW the status bar, but the keyboard's
  // screenY counts from the top of the screen. Measured on device: screenTop 66.1
  // (the header alone) against a keyboard top of 494.9 from the screen's top edge.
  // Adding the status bar puts both in the same frame.
  const insets = useSafeAreaInsets();
  const keyboardOffset = screenTop + insets.top;

  // State management
  const [loading, setLoading] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [currentPhrase, setCurrentPhrase] = useState<string>("");

  // There is no system prompt in the app. The Lambda behind DISCUSS_API_URL adds
  // followCrom's persona server-side, so that is the place to change it. A copy used
  // to live here, but it was stripped before every request (so editing it did
  // nothing) and the history trim put it back into the conversation, where past 20
  // messages it was rendered as a followCrom bubble.

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
        "followCrom says: I apologize, but I couldn't process that request. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [resetState]);

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

  // The composer is the last thing in the scroll content, so when the keyboard
  // opens, scrolling to the end is what keeps the field and the latest reply in
  // view. This runs on the ScrollView's onLayout, NOT on keyboardDidShow: that event
  // arrives before the KeyboardAvoidingView's padding has shrunk the viewport, so a
  // scroll made then lands at the end of the old, taller viewport and the shrink
  // that follows clips the bottom of the composer behind the keyboard's top edge.
  // onLayout fires once the viewport has its new height. The trigger is the viewport
  // getting SHORTER, not Keyboard.isVisible(): the isVisible check never let the
  // scroll happen on device (the composer was left 8pt past the viewport's bottom
  // edge, i.e. not scrolled at all). A shrink is exactly the case that needs it -
  // the keyboard taking room - and a grow (keyboard closing) is left alone.
  const viewportHeightRef = useRef(0);
  const scrollToEndOnShrink = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    const shrank = viewportHeightRef.current > 0 && h < viewportHeightRef.current;
    viewportHeightRef.current = h;
    if (shrank) {
      // Next frame, so the scroll runs against the content laid out at the new size.
      requestAnimationFrame(() => scrollViewRef.current?.scrollToEnd({ animated: true }));
    }
  }, []);

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
        return updatedHistory.slice(-MAX_CONVERSATION_LENGTH);
      }
      return updatedHistory;
    });
  }, []);

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
            .filter(({ content }) => typeof content === "string")
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
  }, [userInput, loading, conversationHistory, fetchOpenAIResponse, addToConversation]);

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
    // With edge-to-edge on, Android no longer resizes the window for the keyboard,
    // so this view has to make the room itself.
    // "padding", not "height": height mode resizes the view and then measures that
    // shrunk size on the next keyboard event, so the error compounds and the screen
    // ends up squashed under the banner, often staying that way after the keyboard
    // closes. Padding leaves the view's own size alone.
    // The offset is how far this view's top sits below the top of the screen:
    // measured with measureInWindow, plus the status bar (see keyboardOffset).
    <View ref={rootRef} style={discussPageStyles.flex} onLayout={measureScreenTop}>
    <KeyboardAvoidingView
      behavior="padding"
      style={discussPageStyles.flex}
      keyboardVerticalOffset={keyboardOffset}
    >
      <ScrollView 
        ref={scrollViewRef}
        onLayout={scrollToEndOnShrink}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        <Banner />

        <Card style={discussPageStyles.conversationCard}>
          {/* The bubbles always render, and the spinner always sits under them.
              There used to be two spinners behind a length check - a large one that
              replaced the conversation entirely while it was empty, and a small one
              underneath once it was not. Since the user's turn now goes up before
              the request, the first case only ever meant "blank screen". */}
          {/* No wrapper gutter here: `cardPad` already owns the card's interior,
              and a second paddingHorizontal on top of it inset the bubbles twice. */}
          {conversationHistory.map((msg, index) => (
            <MessageBubble key={`${msg.timestamp}-${index}`} message={msg} />
          ))}

          {loading && (
            <View style={discussPageStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.brand} />
              <Text style={[styles.secondaryText, discussPageStyles.loadingText]}>
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
              !canSend && styles.buttonContainerDisabled,
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
    </View>
  );
}

// Enhanced styles for Discuss component
const discussPageStyles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  // The composer: one white row holding the field and its send button, so "nothing
  // to send" is legible without a word of explanation. Composed on top of
  // styles.surface and styles.contentWidth, so only what differs lives here -
  // radius 26 is half the row's height, which is what makes it read as a single
  // control rather than a panel.
  // The first and last bubble bring their own marginVertical, so the card's shared
  // vertical padding lands on top of it and the conversation floats. Trimmed here
  // rather than in `cardPad`, which every other screen's card relies on.
  conversationCard: {
    paddingTop: 6,
    paddingBottom: 8,
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    // No marginBottom: the gap above the tab bar is `styles.container`'s paddingBottom.
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

  // Disabled uses `styles.buttonContainerDisabled` directly - the same white fill and
  // outline as a disabled PrimaryButton.
  loadingContainer: {
    paddingTop: 14,
    paddingBottom: 4,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
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