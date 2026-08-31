import React from "react";
import {
  StyleProp,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import styles from "../styles/Styles";
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
   * Optional leading icon. Called with the colour the label is using, so the icon
   * dims with the button. A callback rather than an element because the icons come
   * from two families (Ionicons and MaterialCommunityIcons).
   */
  renderIcon?: (color: string) => React.ReactNode;
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
  return (
    <View
      style={[
        styles.buttonContainer,
        disabled && styles.buttonContainerDisabled,
        style,
      ]}
    >
      <TouchableOpacity
        style={styles.buttonIcon}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
      >
        {renderIcon?.(tint)}
        <Text
          style={[
            styles.buttonText,
            !renderIcon && styles.buttonTextNoIcon,
            disabled && styles.buttonTextDisabled,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
