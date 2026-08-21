import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { setSessionExpiredHandler } from '../src/api/client';
import { ToastProvider } from '../src/components/ui';
import { useAuth } from '../src/store/auth';
import { useWishlist } from '../src/store/wishlist';
import { colors } from '../src/theme';

void SplashScreen.preventAutoHideAsync();

/**
 * One client for the whole app.
 *
 * The retry and staleness settings are tuned for the network this app actually
 * runs on: patchy 3G in the northern valleys. Retrying twice with a backoff
 * turns a dropped packet into a pause rather than an error screen, and a
 * one-minute stale window means moving between tabs does not refetch a
 * catalogue that has not changed.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </ToastProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const router = useRouter();
  const initialising = useAuth((s) => s.initialising);
  const bootstrap = useAuth((s) => s.bootstrap);
  const handleSessionExpired = useAuth((s) => s.handleSessionExpired);
  const clearWishlist = useWishlist((s) => s.clear);
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    // The API client cannot know about navigation; it calls this instead.
    setSessionExpiredHandler(() => {
      handleSessionExpired();
      clearWishlist();
      router.replace('/sign-in');
    });

    void bootstrap();
  }, [bootstrap, clearWishlist, handleSessionExpired, router]);

  useEffect(() => {
    // Held until the session is known, so nobody sees a flash of the signed-out
    // home screen before their own one loads.
    if (!initialising) void SplashScreen.hideAsync();
  }, [initialising]);

  if (initialising) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
      <Stack.Screen name="(guest)" options={{ animation: 'fade' }} />
      <Stack.Screen name="(host)" options={{ animation: 'fade' }} />
      <Stack.Screen name="package/[id]" />
      <Stack.Screen name="provider/[id]" />
      <Stack.Screen name="booking/[id]" />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="trip/[id]" />
      {/* Sheet-style presentations for the flows that interrupt browsing. */}
      <Stack.Screen name="checkout" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="payment/[bookingId]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="trip-builder" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
