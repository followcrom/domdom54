import React from "react";
import {
  Image,
  Text,
  TextProps,
  View,
  ViewProps,
  useWindowDimensions,
} from "react-native";
import styles from "../styles/Styles";

/**
 * Shared landscape-aware primitives.
 *
 * Every screen used to repeat the same three style arrays by hand:
 *
 *   const { width, height } = useWindowDimensions();
 *   const isLandscape = width > height;
 *   <View style={[styles.textContainer, isLandscape && styles.textContainerLandscape]}>
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
        styles.textContainer,
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
