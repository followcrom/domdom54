import React from "react";
import {
  StyleProp,
  Text,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import styles, { BUTTON_ICON_SIZE } from "../styles/Styles";
import colors from "../styles/colors";

/**
 * The app's blue button, everywhere.
 *
 * A component rather than just a style because the disabled treatment has to reach
 * the container, the label and the icon at once - callers doing that by hand is how
 * one button ended up non-interactive while still looking enabled.
 */
type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  /**
   * Leading icon. Called with the colour AND the size the button wants, so neither
   * can drift per caller - Contact was drawing its icon at 48 while Wisdom drew the
   * same glyph at 28, which is exactly the kind of thing a shared component should
   * make impossible. A callback rather than an element because the icons come from
   * two families (Ionicons and MaterialCommunityIcons).
   */
  renderIcon: (color: string, size: number) => React.ReactNode;
  disabled?: boolean;
  /** Merged onto the container, for one-off spacing. */
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export function PrimaryButton({
  label,
  onPress,
  renderIcon,
  disabled = false,
  style,
  accessibilityLabel,
  accessibilityHint,
}: PrimaryButtonProps) {
  const tint = disabled ? colors.textDisabled : colors.textInverse;

  // The whole control is the TouchableOpacity now. It used to be a View wrapping a
  // TouchableOpacity that only covered the icon and label, so the button's padding
  // was not part of its tap target - the corners of a 300pt control did nothing.
  return (
    <TouchableOpacity
      style={[
        styles.buttonContainer,
        disabled && styles.buttonContainerDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
    >
      {renderIcon(tint, BUTTON_ICON_SIZE)}
      <Text
        style={[
          styles.buttonText,
          disabled && styles.buttonTextDisabled,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
