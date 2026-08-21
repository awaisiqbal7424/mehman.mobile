import { Ionicons } from '@expo/vector-icons';
import React, { forwardRef, useState } from 'react';
import {
  Pressable, StyleSheet, TextInput, View,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { colors, HIT_SLOP, MIN_TAP, radius, spacing, type as typeScale } from '../../theme';
import { Text } from './Text';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  /** Shown under the field in red, and marks the border. */
  error?: string;
  /** Shown under the field in grey when there is no error. */
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Turns the field into a password box with a reveal toggle. */
  secure?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  /** Applied to the inner TextInput — used by TextArea to give it height. */
  inputStyle?: StyleProp<TextStyle>;
}

/**
 * A labelled text field.
 *
 * The label sits above the field rather than floating inside it: floating
 * labels look elegant and cost the user the ability to see what a field is
 * while they are typing into it, which matters most on the screens that
 * actually have a lot of fields (host onboarding, checkout).
 */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, hint, icon, secure, containerStyle, inputStyle, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text variant="smallStrong" tone="secondary" style={styles.label}>
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.field,
          rest.multiline && styles.fieldMultiline,
          focused && styles.fieldFocused,
          Boolean(error) && styles.fieldError,
        ]}
      >
        {icon ? <Ionicons name={icon} size={18} color={colors.textMuted} /> : null}

        <TextInput
          ref={ref}
          style={[styles.input, inputStyle]}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secure && !revealed}
          accessibilityLabel={label}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          {...rest}
        />

        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            hitSlop={HIT_SLOP}
            onPress={() => setRevealed((v) => !v)}
          >
            <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text variant="small" tone="danger" style={styles.helper}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="small" tone="muted" style={styles.helper}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

/** A multi-line field for special requests, review text, and quote notes. */
export function TextArea({ minHeight = 110, ...props }: InputProps & { minHeight?: number }) {
  return <Input multiline textAlignVertical="top" inputStyle={{ minHeight }} {...props} />;
}

/**
 * A tappable field that opens something else (a date picker, a sheet) instead
 * of a keyboard. It deliberately looks identical to `Input` so a form reads as
 * one thing.
 */
export function SelectField({
  label, value, placeholder, icon, onPress, error, style,
}: {
  label?: string;
  value?: string | null;
  placeholder: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  error?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.container, style]}>
      {label ? (
        <Text variant="smallStrong" tone="secondary" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label ?? placeholder}${value ? `: ${value}` : ''}`}
        onPress={onPress}
        style={({ pressed }) => [styles.field, Boolean(error) && styles.fieldError, pressed && styles.pressed]}
      >
        {icon ? <Ionicons name={icon} size={18} color={colors.textMuted} /> : null}
        <Text style={styles.selectValue} tone={value ? 'default' : 'muted'} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>
      {error ? (
        <Text variant="small" tone="danger" style={styles.helper}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * A minus/number/plus control for guest counts.
 *
 * The buttons are full 44pt targets and disable at the bounds rather than
 * silently refusing, so it is obvious when a listing has hit its maximum
 * occupancy.
 */
export function Stepper({
  label, sublabel, value, onChange, min = 1, max = 99,
}: {
  label: string;
  sublabel?: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}) {
  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
    if (next !== value) onChange(next);
  };

  return (
    <View style={styles.stepper}>
      <View style={styles.stepperLabels}>
        <Text variant="bodyStrong">{label}</Text>
        {sublabel ? (
          <Text variant="small" tone="muted">
            {sublabel}
          </Text>
        ) : null}
      </View>

      <View style={styles.stepperControls}>
        <StepButton icon="remove" onPress={() => step(-1)} disabled={value <= min} label={`Fewer ${label}`} />
        <Text variant="subheading" style={styles.stepperValue} accessibilityLabel={`${value} ${label}`}>
          {value}
        </Text>
        <StepButton icon="add" onPress={() => step(1)} disabled={value >= max} label={`More ${label}`} />
      </View>
    </View>
  );
}

function StepButton({
  icon, onPress, disabled, label,
}: {
  icon: 'add' | 'remove';
  onPress: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.stepButton,
        disabled && styles.stepButtonDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={18} color={disabled ? colors.borderStrong : colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { marginLeft: spacing.xs },

  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: MIN_TAP + 6,
    paddingHorizontal: spacing.xl,
    // Pill. A field shaped like a control reads as one without needing a heavy
    // border to say so, which is what lets the border stay this light.
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // A pill cannot hold several lines gracefully, so multiline softens to a
  // rounded rectangle instead of stretching the curve.
  fieldMultiline: {
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
  },
  fieldFocused: { borderColor: colors.primary, backgroundColor: colors.surface },
  fieldError: { borderColor: colors.danger },
  pressed: { opacity: 0.8 },

  input: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.text,
    ...typeScale.body,
  },
  selectValue: { flex: 1 },
  helper: { marginLeft: spacing.xs },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    gap: spacing.lg,
  },
  stepperLabels: { flex: 1 },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepperValue: { minWidth: 32, textAlign: 'center' },
  stepButton: {
    width: MIN_TAP,
    height: MIN_TAP,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonDisabled: { borderColor: colors.border, backgroundColor: colors.surfaceMuted },
});

export default Input;
