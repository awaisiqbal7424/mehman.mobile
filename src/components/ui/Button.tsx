import { Ionicons } from './LucideIcon';
import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import {
  ActivityIndicator, Platform, Pressable, StyleSheet, View,
  type GestureResponderEvent, type StyleProp, type ViewStyle,
} from 'react-native';
import { colors, HIT_SLOP, MIN_TAP, radius, shadow, spacing } from '../../theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: Variant;
  size?: Size;
  /** Icon name, drawn before the label. */
  icon?: keyof typeof Ionicons.glyphMap;
  iconAfter?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Announced by screen readers when the label alone is not enough. */
  accessibilityHint?: string;
}

const HEIGHT: Record<Size, number> = { sm: 38, md: MIN_TAP, lg: 54 };
const PAD: Record<Size, number> = { sm: spacing.md, md: spacing.lg, lg: spacing.xl };
const TEXT_VARIANT: Record<Size, 'small' | 'body' | 'subheading'> = {
  sm: 'small',
  md: 'body',
  lg: 'subheading',
};

/**
 * The app's action control.
 *
 * Two decisions worth knowing about:
 *
 * - Pressing fires a light haptic. On a marketplace where a tap can commit
 *   money, the tick confirms the tap landed before the network has answered.
 * - `loading` keeps the button's width and swaps the label for a spinner, so a
 *   slow booking request cannot make the footer jump under the user's thumb.
 */
export function Button({
  label, onPress, variant = 'primary', size = 'md', icon, iconAfter,
  loading = false, disabled = false, fullWidth = false, style, accessibilityHint,
}: ButtonProps) {
  const inert = disabled || loading;

  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      if (inert) return;
      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress?.(event);
    },
    [inert, onPress],
  );

  const scheme = SCHEMES[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inert, busy: loading }}
      hitSlop={size === 'sm' ? HIT_SLOP : undefined}
      onPress={handlePress}
      disabled={inert}
      style={({ pressed }) => [
        styles.base,
        { height: HEIGHT[size], paddingHorizontal: PAD[size], backgroundColor: scheme.bg },
        scheme.border && { borderWidth: 1, borderColor: scheme.border },
        variant === 'primary' && shadow.sm,
        fullWidth && styles.fullWidth,
        pressed && { backgroundColor: scheme.pressed, transform: [{ scale: 0.985 }] },
        inert && styles.inert,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={scheme.fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={size === 'lg' ? 20 : 17} color={scheme.fg} /> : null}
          <Text variant={TEXT_VARIANT[size]} style={[styles.label, { color: scheme.fg }]}>
            {label}
          </Text>
          {iconAfter ? <Ionicons name={iconAfter} size={size === 'lg' ? 20 : 17} color={scheme.fg} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const SCHEMES: Record<Variant, { bg: string; pressed: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, pressed: colors.primaryPressed, fg: colors.textOnPrimary },
  secondary: { bg: colors.primarySoft, pressed: colors.primarySoft, fg: colors.primaryPressed },
  outline: { bg: colors.surface, pressed: colors.surfaceMuted, fg: colors.text, border: colors.borderStrong },
  ghost: { bg: 'transparent', pressed: colors.surfaceMuted, fg: colors.text },
  danger: { bg: colors.danger, pressed: '#B91C1C', fg: colors.textInverse },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { fontWeight: '600' },
  fullWidth: { alignSelf: 'stretch', width: '100%' },
  inert: { opacity: 0.45 },
});

/**
 * A circular icon-only control — back arrows, the wishlist heart, a close X.
 * Always takes an `accessibilityLabel`, because there is no text to fall back
 * on.
 */
export function IconButton({
  icon, onPress, accessibilityLabel, size = 40, color = colors.text,
  background = colors.surface, style,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  accessibilityLabel: string;
  size?: number;
  color?: string;
  background?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={HIT_SLOP}
      onPress={() => {
        if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      style={({ pressed }) => [
        iconStyles.base,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: background },
        pressed && { opacity: 0.7, transform: [{ scale: 0.94 }] },
        style,
      ]}
    >
      <Ionicons name={icon} size={size * 0.5} color={color} />
    </Pressable>
  );
}

const iconStyles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});

export default Button;
