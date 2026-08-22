import { Ionicons } from './LucideIcon';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Platform, RefreshControl, ScrollView, StyleSheet, View,
  type ScrollViewProps, type StyleProp, type ViewStyle,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, spacing } from '../../theme';
import { IconButton } from './Button';
import { useTabBarSpace } from './TabBar';
import { Text } from './Text';

/**
 * The frame every screen sits in.
 *
 * It owns three things screens should not each solve for themselves: the safe
 * area (notch and home indicator), pull-to-refresh, and keeping the content off
 * the keyboard. `footer` pins a bar to the bottom above the home indicator —
 * that is where the booking and payment CTAs live.
 */
export function Screen({
  children, scroll = true, refreshing, onRefresh, footer, padded = false,
  style, contentContainerStyle, edges = 'bottom', background,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  footer?: React.ReactNode;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  /** 'bottom' respects the home indicator; 'none' lets content run to the edge. */
  edges?: 'bottom' | 'none';
  /** Replaces the usual warm gradient with a flat colour, for a screen that wants a plain page (e.g. white). */
  background?: string;
}) {
  const insets = useSafeAreaInsets();
  // Non-zero only inside a tab navigator, so the last card clears the pill.
  const tabSpace = useTabBarSpace();
  const bottomPad = (edges === 'bottom' ? Math.max(insets.bottom, spacing.lg) : 0) + tabSpace;

  const body = scroll ? (
    <ScrollView
      style={[styles.flex, style]}
      contentContainerStyle={[
        padded && styles.padded,
        { paddingBottom: footer ? spacing.lg : bottomPad + spacing.lg },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={Boolean(refreshing)}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padded && styles.padded, style]}>{children}</View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      // On iOS the tab bar already offsets the view; without this the keyboard
      // leaves a gap the height of the bar under the focused field.
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {background ? (
        <View style={[styles.gradient, { backgroundColor: background }]}>
          {body}
          {footer ? (
            <View style={[styles.footer, { paddingBottom: bottomPad }]}>{footer}</View>
          ) : null}
        </View>
      ) : (
        <LinearGradient
          colors={colors.backgroundGradient}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradient}
        >
          {body}
          {footer ? (
            <View style={[styles.footer, { paddingBottom: bottomPad }]}>{footer}</View>
          ) : null}
        </LinearGradient>
      )}
    </KeyboardAvoidingView>
  );
}

/**
 * The in-content header used where the native stack header is not enough — a
 * title, an optional back button, and room for one action on the right.
 */
export function Header({
  title, subtitle, onBack, right, transparent,
}: {
  title: string;
  subtitle?: string;
  /** Omit to use the router's own back behaviour; pass `null` for no button. */
  onBack?: (() => void) | null;
  right?: React.ReactNode;
  transparent?: boolean;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showBack = onBack !== null;

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + spacing.sm },
        !transparent && styles.headerSolid,
      ]}
    >
      {showBack ? (
        <IconButton
          icon="chevron-back"
          accessibilityLabel="Go back"
          background={transparent ? 'rgba(255,255,255,0.92)' : colors.surfaceMuted}
          onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
        />
      ) : (
        <View style={styles.headerSpacer} />
      )}

      <View style={styles.headerTitles}>
        <Text variant="subheading" numberOfLines={1} center>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="small" tone="muted" numberOfLines={1} center>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.headerRight}>{right ?? <View style={styles.headerSpacer} />}</View>
    </View>
  );
}

/**
 * A large greeting header for the two "home" screens. It scrolls away with the
 * content rather than sticking, which gives the photography the full screen.
 */
export function PageHeading({
  title, subtitle, right, style,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.pageHeading, style]}>
      <View style={styles.flex}>
        <Text variant="display">{title}</Text>
        {subtitle ? (
          <Text variant="body" tone="secondary" style={styles.pageSubtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/** The sticky bar at the bottom of detail and checkout screens. */
export function FooterBar({ children }: { children: React.ReactNode }) {
  return <View style={styles.footerInner}>{children}</View>;
}

/** A one-line notice: "Awaiting approval", "Payment pending". */
export function Notice({
  tone = 'info', icon = 'information-circle-outline', title, message, action,
}: {
  tone?: 'info' | 'warning' | 'success' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  const scheme = {
    info: { bg: colors.infoSoft, fg: colors.info },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    success: { bg: colors.successSoft, fg: colors.success },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  }[tone];

  return (
    <View style={[styles.notice, { backgroundColor: scheme.bg }]}>
      <Ionicons name={icon} size={20} color={scheme.fg} style={styles.noticeIcon} />
      <View style={styles.flex}>
        <Text variant="bodyStrong" style={{ color: scheme.fg }}>
          {title}
        </Text>
        {message ? (
          <Text variant="small" tone="secondary" style={styles.noticeMessage}>
            {message}
          </Text>
        ) : null}
        {action}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  gradient: { flex: 1 },
  flex: { flex: 1 },
  padded: { paddingHorizontal: spacing.lg },

  footer: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    ...shadow.lg,
  },
  footerInner: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerSolid: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitles: { flex: 1 },
  headerRight: { minWidth: 40, alignItems: 'flex-end' },
  headerSpacer: { width: 40, height: 40 },

  pageHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  pageSubtitle: { marginTop: spacing.xs },

  notice: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  noticeIcon: { marginTop: 1 },
  noticeMessage: { marginTop: 2 },
});

export default Screen;
