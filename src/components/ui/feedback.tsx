import { Ionicons } from './LucideIcon';
import { Image } from 'expo-image';
import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import { colors, radius, spacing } from '../../theme';
import { Button } from './Button';
import { Text } from './Text';

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const TONE_COLORS: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.surfaceMuted, fg: colors.textSecondary },
  primary: { bg: colors.primarySoft, fg: colors.primaryPressed },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  info: { bg: colors.infoSoft, fg: colors.info },
};

/** A small status label: booking state, package type, "Verified". */
export function Badge({
  label, tone = 'neutral', icon, style,
}: {
  label: string;
  tone?: Tone;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}) {
  const { bg, fg } = TONE_COLORS[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      {icon ? <Ionicons name={icon} size={12} color={fg} /> : null}
      <Text variant="smallStrong" style={{ color: fg }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** A selectable filter chip. Used for search tabs, sorts, and status filters. */
export function Chip({
  label, selected, onPress, icon,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.chipOn : styles.chipOff,
        pressed && { opacity: 0.75 },
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={14} color={selected ? colors.textOnPrimary : colors.textSecondary} />
      ) : null}
      <Text variant="smallStrong" style={{ color: selected ? colors.textOnPrimary : colors.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * A shimmering placeholder.
 *
 * Loading states show the *shape* of what is coming rather than a centred
 * spinner: it makes a slow connection — the normal case on a mountain road —
 * feel like progress rather than a stall.
 */
export function Skeleton({ height = 16, width, style }: { height?: number; width?: number | `${number}%`; style?: StyleProp<ViewStyle> }) {
  const shimmer = useSharedValue(0.4);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [shimmer]);

  const animated = useAnimatedStyle(() => ({ opacity: shimmer.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.skeleton, { height, width: width ?? '100%', borderRadius: height > 40 ? radius.lg : radius.sm }, animated, style]}
    />
  );
}

/** The card skeleton, matched to `PackageCard` so the swap is not a jump. */
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.skeletonList}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.skeletonCard}>
          <Skeleton height={168} />
          <Skeleton height={18} width="70%" />
          <Skeleton height={14} width="45%" />
        </View>
      ))}
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={colors.primary} />
      {label ? (
        <Text variant="small" tone="muted" style={styles.centeredText}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Shown when a list came back empty. Always says what the person can do next —
 * an empty screen with no exit is where sessions end.
 */
export function EmptyState({
  icon = 'compass-outline', title, message, actionLabel, onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.centered}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <Text variant="heading" center>
        {title}
      </Text>
      {message ? (
        <Text variant="body" tone="secondary" center style={styles.emptyMessage}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={styles.emptyAction} />
      ) : null}
    </View>
  );
}

/**
 * Shown when a request failed. Distinct from `EmptyState` on purpose: "nothing
 * here" and "we could not reach the server" call for different reactions, and
 * this one always offers a retry.
 */
export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={styles.centered}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.dangerSoft }]}>
        <Ionicons name="cloud-offline-outline" size={30} color={colors.danger} />
      </View>
      <Text variant="heading" center>
        Something went wrong
      </Text>
      <Text variant="body" tone="secondary" center style={styles.emptyMessage}>
        {message ?? 'We could not load this just now.'}
      </Text>
      {onRetry ? <Button label="Try again" variant="outline" onPress={onRetry} style={styles.emptyAction} /> : null}
    </View>
  );
}

/** A round profile image that falls back to initials rather than a broken box. */
export function Avatar({
  uri, name, size = 44,
}: {
  uri?: string | null;
  name?: string;
  size?: number;
}) {
  const label = (name ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceMuted }}
        contentFit="cover"
        transition={180}
        accessibilityLabel={name ? `${name}'s photo` : 'Profile photo'}
      />
    );
  }

  return (
    <View
      style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}
      accessibilityLabel={name}
    >
      <Text variant={size > 48 ? 'heading' : 'smallStrong'} style={{ color: colors.primaryPressed }}>
        {label}
      </Text>
    </View>
  );
}

/** A star and a number. Hidden entirely when a listing has no rating yet. */
export function Rating({
  value, count, size = 14, compact,
}: {
  value?: number | null;
  count?: number | null;
  size?: number;
  compact?: boolean;
}) {
  if (!value) return null;
  return (
    <View
      style={styles.rating}
      accessibilityLabel={`Rated ${value.toFixed(1)} out of 5${count ? ` from ${count} reviews` : ''}`}
    >
      <Ionicons name="star" size={size} color={colors.star} />
      <Text variant="smallStrong">{value.toFixed(1)}</Text>
      {count && !compact ? (
        <Text variant="small" tone="muted">
          ({count})
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
    borderRadius: radius.full,
  },
  chipOn: { backgroundColor: colors.primary },
  chipOff: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },

  skeleton: { backgroundColor: colors.surfaceMuted },
  skeletonList: { gap: spacing['2xl'], paddingHorizontal: spacing.lg },
  skeletonCard: { gap: spacing.sm },

  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['4xl'],
    gap: spacing.sm,
  },
  centeredText: { marginTop: spacing.sm },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyMessage: { maxWidth: 320 },
  emptyAction: { marginTop: spacing.lg },

  avatarFallback: {
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
