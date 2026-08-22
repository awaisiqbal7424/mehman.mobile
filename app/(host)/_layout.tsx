import { Calendar, CalendarBlank, House, SquaresFour, User } from 'phosphor-react-native';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { FloatingTabBar, TabBarSpaceContext } from '../../src/components/ui';
import { useAuth } from '../../src/store/auth';
import { colors, TAB_BAR } from '../../src/theme';

/**
 * The host's tabs.
 *
 * Guarded rather than merely hidden: an account without an approved business is
 * bounced back to the traveller side. Deep links, a stale saved role, or an
 * approval that was later withdrawn all end up here, and none of them should
 * land someone in a panel whose every request would 403.
 */
export default function HostTabsLayout() {
  const providerStatus = useAuth((s) => s.providerStatus);
  const user = useAuth((s) => s.user);

  if (!user || providerStatus !== 'approved') return <Redirect href="/(guest)" />;

  return (
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
            title: 'Today',
            tabBarIcon: ({ color, focused, size }) => (
              <House size={size} color={String(color)} weight={focused ? 'bold' : 'regular'} />
            ),
          }}
        />
        <Tabs.Screen
          name="bookings"
          options={{
            title: 'Bookings',
            tabBarIcon: ({ color, focused, size }) => (
              <CalendarBlank size={size} color={String(color)} weight={focused ? 'bold' : 'regular'} />
            ),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ color, focused, size }) => (
              <Calendar size={size} color={String(color)} weight={focused ? 'bold' : 'regular'} />
            ),
          }}
        />
        <Tabs.Screen
          name="listings"
          options={{
            title: 'Listings',
            tabBarIcon: ({ color, focused, size }) => (
              <SquaresFour size={size} color={String(color)} weight={focused ? 'bold' : 'regular'} />
            ),
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused, size }) => (
              <User size={size} color={String(color)} weight={focused ? 'bold' : 'regular'} />
            ),
          }}
        />
      </Tabs>
    </TabBarSpaceContext.Provider>
  );
}
