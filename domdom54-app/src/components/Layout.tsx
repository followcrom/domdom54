import React from "react";
import {
  DimensionValue,
  Image,
  Modal,
  ScrollView,
  StyleProp,
  Text,
  TextProps,
  TouchableOpacity,
  View,
  ViewProps,
  ViewStyle,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styles, { SCREEN_BOTTOM_GAP } from "../styles/Styles";
import colors from "../styles/colors";

/**
 * Shared landscape-aware primitives.
 *
 * Every screen used to repeat the same three style arrays by hand:
 *
 *   const { width, height } = useWindowDimensions();
 *   const isLandscape = width > height;
 *   <View style={[styles.surface, styles.contentWidth, styles.cardPad]}>
 *     <Text style={[styles.textOutput, isLandscape && styles.textOutputLandscape]}>
 *
 * That's four lines of boilerplate per screen and an orientation rule duplicated
 * in a dozen places, so a change to how the app handles landscape meant editing
 * every file that happened to remember to do it. These components own the rule
 * instead, and read the orientation themselves - callers just say what they mean.
 */

/** True when the device is wider than it is tall. */
export function useIsLandscape(): boolean {
  const { width, height } = useWindowDimensions();
  return width > height;
}

/**
 * Body copy. Accepts every Text prop (onPress, numberOfLines, accessibility...)
 * and merges any `style` you pass on top of the defaults, so one-off tweaks
 * still work without reaching for the raw style objects.
 */
export function Body({ style, ...rest }: TextProps) {
  const isLandscape = useIsLandscape();
  return (
    <Text
      {...rest}
      style={[
        styles.textOutput,
        isLandscape && styles.textOutputLandscape,
        style,
      ]}
    />
  );
}

/** The white rounded panel that holds a phrase, a message or a settings row. */
export function Card({ style, ...rest }: ViewProps) {
  const isLandscape = useIsLandscape();
  return (
    <View
      {...rest}
      style={[
        styles.surface,
        styles.contentWidth,
        styles.cardPad,
        isLandscape && styles.textContainerLandscape,
        style,
      ]}
    />
  );
}

/**
 * The header artwork. Wisdom, Discuss and MeditationPlayer all rendered the
 * identical Image with the identical orientation ternary; this is that, once.
 */
export function Banner() {
  const isLandscape = useIsLandscape();
  return (
    <Image
      source={require("../../assets/images/random_wisdom_landscape.jpg")}
      style={isLandscape ? styles.imageLandscape : styles.image}
    />
  );
}

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Share of the screen the sheet takes, e.g. "80%". */
  height: DimensionValue;
  /** Extra header buttons, rendered before the close button. */
  actions?: React.ReactNode;
  /** Style for the scroll content. The bottom padding is added here, not by the caller. */
  contentStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * The bottom sheet used by Meditation History and the Privacy Policy. They were two
 * copies of the same Modal, overlay, header and ScrollView that had started to drift
 * (different gutters, different close-button padding, different bottom padding).
 *
 * The sheet is anchored to the bottom of the screen, so its bottom edge sits under the
 * system navigation/gesture bar; the scroll content is padded by that inset so the last
 * item can be scrolled clear of it.
 */
export function Sheet({
  visible,
  onClose,
  title,
  height,
  actions,
  contentStyle,
  children,
}: SheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.sheetOverlay}>
        <View style={[styles.sheet, { minHeight: height, maxHeight: height }]}>
          <View style={[styles.row, styles.sheetHeader]}>
            <Text style={[styles.title, styles.sheetTitle]}>{title}</Text>
            <View style={styles.sheetActions}>
              {actions}
              <TouchableOpacity
                onPress={onClose}
                style={styles.sheetAction}
                accessibilityRole="button"
                accessibilityLabel={`Close ${title.toLowerCase()}`}
              >
                <Ionicons name="close-circle-outline" size={24} color={colors.brand} />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView
            contentContainerStyle={[
              contentStyle,
              { paddingBottom: SCREEN_BOTTOM_GAP + insets.bottom },
            ]}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
