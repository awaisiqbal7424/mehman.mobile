import { useRouter } from 'expo-router';
import React from 'react';
import { EmptyState, PageHeading, Screen } from '../src/components/ui';

export default function NotificationsScreen() {
  const router = useRouter();

  return (
    <Screen scroll={false}>
      <PageHeading title="Notifications" />
      <EmptyState
        icon="notifications-outline"
        title="No notifications yet"
        message="Updates about bookings, trips, and offers will appear here."
        actionLabel="Explore Pakistan"
        onAction={() => router.replace('/(guest)')}
      />
    </Screen>
  );
}
