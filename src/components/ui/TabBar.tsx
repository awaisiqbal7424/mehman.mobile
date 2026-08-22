import * as Haptics from 'expo-haptics';
import React, { createContext, useContext } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, spacing, TAB_BAR } from '../../theme';
import { Text } from './Text';

/**
 * Only the parts of the navigator's tab-bar props this component touches.
 *
 * Typed structurally rather than imported from @react-navigation/bottom-tabs:
 * expo-router bundles its own copy of those types, and the two do not line up,
 * so importing either one puts the build at the mercy of which copy resolves.
 */
interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: TabOptions }>;
  navigation: {
    emit(event: { type: 'tabPress'; target: string; canPreventDefault: true }): { defaultPrevented: boolean };
    navigate(name: string): void;
  };
}

interface TabOptions {
  title?: string;
  href?: string | null;
  tabBarLabel?: unknown;
  tabBarBadge?: string | number;
  tabBarButton?: unknown;
  tabBarItemStyle?: unknown;
  tabBarIcon?: (props: { focused: boolean; color: string; size: number }) => React.ReactNode;
}

/**
 * Whether a route is routable but deliberately absent from the bar (Saved, for
 * one — reached from the Explore header instead).
 *
 * `href: null` is how it is declared, but expo-router does not always hand that
 * flag through to a custom tab bar; depending on version it lowers the route to
 * a null `tabBarButton` or a hidden item style instead. All three are checked,
 * because the failure mode is a tab appearing that was asked to be hidden.
 */
function isHidden(options: TabOptions): boolean {
  const itemStyle = options.tabBarItemStyle as { display?: string } | null | undefined;

  return (
    options.href === null ||
    options.tabBarButton === null ||
    itemStyle?.display === 'none'
  );
}

/**
 * How much room the floating tab bar needs at the bottom of a scrolling screen.
 *
 * The bar is absolutely positioned so content passes under its blur, which means
 * nothing reserves space for it. Rather than making every screen remember,
 * `Screen` reads this and pads itself; the value is only non-zero inside a tab
 * navigator, so pushed screens are unaffected.
 */
export const TabBarSpaceContext = createContext(0);
export const useTabBarSpace = () => useContext(TabBarSpaceContext);

/**
 * The app's tab bar: a floating pill, inset from all three edges.
 *
 * Replaces the full-width slab both platforms shipped for a decade. The pill is
 * narrower than the screen, so the thumb has less distance to travel between
 * the two tabs anyone actually alternates between, and the page's photography
 * runs to the edges underneath it instead of stopping at a grey band.
 */
export function FloatingTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.host, { paddingBottom: Math.max(insets.bottom, TAB_BAR.INSET) }]}
      pointerEvents="box-none"
    >
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const options = descriptors[route.key]?.options ?? {};
          if (isHidden(options)) return null;

          const focused = state.index === index;
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : (options.title ?? route.name);

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (focused || event.defaultPrevented) return;
            if (Platform.OS !== 'web') void Haptics.selectionAsync();
            navigation.navigate(route.name);
          };

          return (
            <TabItem
              key={route.key}
              label={label}
              focused={focused}
              badge={options.tabBarBadge}
              icon={options.tabBarIcon}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

function TabItem({
  label, focused, badge, icon, onPress,
}: {
  label: string;
  focused: boolean;
  badge?: string | number;
  icon?: (props: { focused: boolean; color: string; size: number }) => React.ReactNode;
  onPress: () => void;
}) {
  const tint = focused ? colors.primary : colors.textMuted;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.item}
    >
      <View style={styles.iconWrap}>
        {icon?.({ focused, color: tint, size: 22 })}
        {badge !== undefined && badge !== null ? (
          <View style={styles.badge}>
            <Text variant="caption" style={styles.badgeText}>
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text variant="caption" style={[styles.label, { color: tint }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: TAB_BAR.INSET,
    right: TAB_BAR.INSET,
    bottom: 0,
  },
  pill: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    height: TAB_BAR.HEIGHT,
    borderRadius: radius.full,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.xs,
    ...shadow.lg,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minHeight: 56,
    paddingVertical: spacing.sm,
  },
  iconWrap: { alignItems: 'center', justifyContent: 'center', width: 46, height: 24, position: 'relative' },
  label: { fontSize: 12, lineHeight: 16, letterSpacing: 0, textTransform: 'none' },
  badge: {
    position: 'absolute',
    top: -4,
    right: 4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.textOnPrimary, fontSize: 10, lineHeight: 13, letterSpacing: 0 },
});
