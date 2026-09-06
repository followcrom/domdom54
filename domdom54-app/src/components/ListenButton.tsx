import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "../styles/Styles";
import colors from "../styles/colors";

/**
 * The audio control that Wisdom and Messages both render under their copy.
 *
 * Presentational on purpose: the screens keep calling `useAudioPlayback` themselves
 * and pass its result in. Owning the hook here would mean it mounted and unmounted
 * with the control, and the control is rendered conditionally on there being audio -
 * so a phrase that arrives without audio would tear down a player that might still
 * be playing the previous one.
 *
 * Three appearances, two states, one shape. Idle, playing and loading are all the
 * same pill at the same size - only the colour, the glyph and the label change - so
 * nothing on the card moves when you tap it or when playback is being prepared.
 *
 * The spinner is boxed at 32x32, the size of the icon it stands in for, because an
 * ActivityIndicator is smaller than that and would otherwise pull the pill's width in
 * while loading.
 */
type ListenButtonProps = {
  isPlaying: boolean;
  isLoadingPlayback: boolean;
  audioError: string | null;
  onToggle: () => void;
};

export function ListenButton({
  isPlaying,
  isLoadingPlayback,
  audioError,
  onToggle,
}: ListenButtonProps) {
  const label = isLoadingPlayback ? "Loading" : isPlaying ? "Pause" : "Listen";

  return (
    <View style={styles.audioWrap}>
      <TouchableOpacity
        style={[styles.audioContainer, isPlaying && styles.audioContainerPlaying]}
        onPress={onToggle}
        disabled={isLoadingPlayback}
        accessibilityRole="button"
        // The label carries the state because the colour cannot: to a screen reader
        // "accentStrong" is nothing at all.
        accessibilityLabel={label}
        accessibilityState={{ selected: isPlaying, disabled: isLoadingPlayback }}
      >
        <View style={styles.audioGlyph}>
          {isLoadingPlayback ? (
            <ActivityIndicator size="small" color={colors.brand} />
          ) : (
            <Ionicons
              name={isPlaying ? "pause-circle-outline" : "play-circle-outline"}
              size={32}
              color={isPlaying ? colors.accentStrong : colors.brandStrong}
            />
          )}
        </View>
        <Text style={[styles.audioLabel, isPlaying && styles.audioLabelPlaying]}>
          {label}
        </Text>
      </TouchableOpacity>

      {audioError && <Text style={styles.audioError}>{audioError}</Text>}
    </View>
  );
}
