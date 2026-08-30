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
 * Five of these were assembled by hand - three in Wisdom, one in Discuss, one in
 * Contact - each repeating the same wrapper View, the same TouchableOpacity, and
 * the same `disabled ? textDisabled : textInverse` ternary in two or three places.
 * Contact's had drifted into a different shape entirely.
 *
 * The disabled treatment is the reason this is a component rather than just a
 * style: it has to reach the container, the label and the icon at once, and every
 * caller getting that right by hand is exactly how Wisdom's Discuss button ended
 * up non-interactive but still looking enabled.
 */
type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  /**
   * Optional leading icon. Called with the colour the label is using, so the icon
   * dims along with the rest of the button and callers never repeat the ternary.
   * A callback rather than an element because the icons come from two different
   * families (Ionicons and MaterialCommunityIcons).
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
