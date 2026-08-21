import React from 'react';
import { StyleSheet, Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { colors, type as typeScale } from '../../theme';

type Variant = keyof typeof typeScale;
type Tone = 'default' | 'secondary' | 'muted' | 'primary' | 'inverse' | 'success' | 'warning' | 'danger';

export interface TextProps extends RNTextProps {
  variant?: Variant;
  tone?: Tone;
  center?: boolean;
  /** Shorthand for the common "one line, ellipsised" case. */
  truncate?: boolean;
}

const TONE: Record<Tone, string> = {
  default: colors.text,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  primary: colors.primary,
  inverse: colors.textInverse,
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
};

/**
 * The app's only text component.
 *
 * Screens never set fontSize or fontWeight directly: they name a role
 * ("heading", "small") and a tone. That is what keeps thirty-odd screens
 * looking like one app, and it makes a change to the type scale a one-file
 * edit rather than a hunt.
 */
export function Text({
  variant = 'body',
  tone = 'default',
  center,
  truncate,
  style,
  ...rest
}: TextProps) {
  return (
    <RNText
      // Respect the reader's font-size setting, but stop runaway scaling from
      // breaking layouts that have to fit a price and a button on one row.
      maxFontSizeMultiplier={1.4}
      numberOfLines={truncate ? 1 : rest.numberOfLines}
      style={[
        typeScale[variant],
        { color: TONE[tone] },
        center && styles.center,
        variant === 'caption' && styles.caption,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  caption: { textTransform: 'uppercase' },
});

export default Text;
