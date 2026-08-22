import { ChatCircle, Compass, MagnifyingGlass, User } from 'phosphor-react-native';
import { useQuery } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import React from 'react';
import { messageApi } from '../../src/api/services';
import { FloatingTabBar, TabBarSpaceContext } from '../../src/components/ui';
import { TipiIcon } from '../../src/components/ui/LucideIcon';
import { useAuth } from '../../src/store/auth';
import { colors, TAB_BAR } from '../../src/theme';

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
    // The pill floats over the content, so nothing in the layout reserves room
    // for it. This is how every `Screen` below knows to pad itself clear.
    <TabBarSpaceContext.Provider value={TAB_BAR.SPACE}>
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: colors.background },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Explore',
            tabBarIcon: ({ color, focused }) => (
              <Compass size={23} color={String(color)} weight={focused ? 'bold' : 'regular'} />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: ({ color, focused }) => (
              <MagnifyingGlass size={23} color={String(color)} weight={focused ? 'bold' : 'regular'} />
            ),
          }}
        />
        <Tabs.Screen
          name="trips"
          options={{
            title: 'Trips',
            tabBarIcon: ({ color, focused }) => (
              <TipiIcon size={22} color={String(color)} />
            ),
          }}
        />
        <Tabs.Screen
          name="inbox"
          options={{
            title: 'Inbox',
            tabBarBadge: unreadTotal > 0 ? (unreadTotal > 9 ? '9+' : unreadTotal) : undefined,
            tabBarIcon: ({ color, focused }) => (
              <ChatCircle size={21} color={String(color)} weight={focused ? 'bold' : 'regular'} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <User size={22} color={String(color)} weight={focused ? 'bold' : 'regular'} />
            ),
          }}
        />
        {/* Reached from the Explore header and the profile, not from the bar. */}
        <Tabs.Screen name="saved" options={{ href: null }} />
      </Tabs>
    </TabBarSpaceContext.Provider>
  );
}
