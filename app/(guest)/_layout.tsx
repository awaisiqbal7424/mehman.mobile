import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { messageApi } from '../../src/api/services';
import { useAuth } from '../../src/store/auth';
import { colors, spacing } from '../../src/theme';

/**
 * The traveller's five tabs.
 *
 * Saved listings deliberately do not get one: they are reached from the heart
 * in the Explore header and from the profile. Five tabs is the point where
 * labels start truncating on a small phone, and Inbox earns its place more —
 * a marketplace booking is a conversation with a host, not a vending machine.
 */
export default function GuestTabsLayout() {
  const user = useAuth((s) => s.user);

  const unread = useQuery({
    queryKey: ['unread-count', user?.id],
    queryFn: () => messageApi.unreadCount(),
    enabled: Boolean(user),
    refetchInterval: 60_000,
  });

  const unreadTotal = unread.data?.total ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.bar,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'compass' : 'compass-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trips',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'briefcase' : 'briefcase-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarBadge: unreadTotal > 0 ? (unreadTotal > 9 ? '9+' : unreadTotal) : undefined,
          tabBarBadgeStyle: styles.badge,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={23} color={color} />
          ),
        }}
      />
      {/* Reached from the Explore header and the profile, not from the bar. */}
      <Tabs.Screen name="saved" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: Platform.OS === 'ios' ? 86 : 64,
    paddingTop: spacing.sm,
    elevation: 0,
  },
  label: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  item: { paddingVertical: 2 },
  badge: { backgroundColor: colors.primary, fontSize: 10, fontWeight: '700' },
});
