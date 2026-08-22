import { Ionicons } from './LucideIcon';
import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, shadow, spacing } from '../../theme';
import { Text } from './Text';

export interface CardProps {
  children: React.ReactNode;
  /** Makes the whole card a single tap target with a press state. */
  onPress?: () => void;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/** A white surface on the warm background. The app's basic unit of grouping. */
export function Card({ children, onPress, padded = true, style, accessibilityLabel }: CardProps) {
  const content = <View style={[styles.card, padded && styles.padded, style]}>{children}</View>;

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {content}
    </Pressable>
  );
}

/** A titled block. `action` sits opposite the title — usually a "See all". */
export function Section({
  title, subtitle, accent, action, onAction, children, style,
}: {
  title: string;
  subtitle?: string;
  /** A trailing word of `title` to pick out in the brand colour — the rest stays default. */
  accent?: string;
  action?: string;
  onAction?: () => void;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.section, style]}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionTitles}>
          <Text variant="heading">
            {accent && title.endsWith(accent) ? (
              <>
                {title.slice(0, title.length - accent.length)}
                <Text variant="heading" tone="primary">
                  {accent}
                </Text>
              </>
            ) : (
              title
            )}
          </Text>
          {subtitle ? (
            <Text variant="small" tone="secondary" style={styles.sectionSubtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {action && onAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${action}: ${title}`}
            onPress={onAction}
            hitSlop={8}
            style={({ pressed }) => [styles.sectionAction, pressed && { opacity: 0.75 }]}
          >
            <Ionicons name="arrow-forward" size={16} color={colors.textOnPrimary} />
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** A label/value line — the backbone of every summary and receipt in the app. */
export function Row({
  label, value, strong, tone, icon,
}: {
  label: string;
  value?: string | number | null;
  strong?: boolean;
  tone?: 'default' | 'secondary' | 'muted' | 'success' | 'danger' | 'primary';
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLabel}>
        {icon ? <Ionicons name={icon} size={15} color={colors.textMuted} /> : null}
        <Text variant={strong ? 'bodyStrong' : 'body'} tone={strong ? 'default' : 'secondary'}>
          {label}
        </Text>
      </View>
      <Text
        variant={strong ? 'bodyStrong' : 'body'}
        tone={tone ?? 'default'}
        style={styles.rowValue}
      >
        {value ?? '—'}
      </Text>
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

/**
 * A single number with a label, used across both dashboards. The value stays on
 * one line and shrinks rather than wrapping — a stat that wraps stops reading
 * as a stat.
 */
export function StatTile({
  label, value, icon, tone = 'default', style,
}: {
  label: string;
  value: string | number;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'primary';
  style?: StyleProp<ViewStyle>;
}) {
  const accent = {
    default: colors.textSecondary,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    primary: colors.primary,
  }[tone];

  return (
    <View style={[styles.stat, style]}>
      {icon ? (
        <View style={[styles.statIcon, { backgroundColor: `${accent}14` }]}>
          <Ionicons name={icon} size={16} color={accent} />
        </View>
      ) : null}
      <Text variant="title" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
      <Text variant="small" tone="secondary" numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.sm,
  },
  padded: { padding: spacing.lg },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },

  section: { marginBottom: spacing['2xl'] },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  sectionTitles: { flex: 1 },
  sectionSubtitle: { marginTop: 2 },
  sectionAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.lg,
  },
  rowLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  rowValue: { flexShrink: 1, textAlign: 'right' },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.md },

  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 2,
    minWidth: 96,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
});

export default Card;
