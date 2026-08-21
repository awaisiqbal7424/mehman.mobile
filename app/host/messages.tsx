import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { messageApi } from '../../src/api/services';
import {
  Avatar, Card, CardSkeleton, EmptyState, ErrorState, Header, Screen, Text,
} from '../../src/components/ui';
import { colors, spacing } from '../../src/theme';
import { formatRelative } from '../../src/utils/format';

/**
 * The host's inbox.
 *
 * A separate endpoint from the guest one — `/api/provider/conversations` scopes
 * to the signed-in business — but the same chat screen underneath, so a message
 * looks and behaves identically whichever side of the marketplace you are on.
 */
export default function HostMessagesScreen() {
  const router = useRouter();

  const conversations = useQuery({
    queryKey: ['host-conversations'],
    queryFn: () => messageApi.hostConversations(),
    refetchInterval: 60_000,
  });

  const unread = useQuery({
    queryKey: ['host-unread'],
    queryFn: () => messageApi.unreadCount(),
    refetchInterval: 60_000,
  });

  return (
    <Screen scroll refreshing={conversations.isRefetching} onRefresh={() => void conversations.refetch()}>
      <Header
        title="Messages"
        subtitle={unread.data?.total ? `${unread.data.total} unread` : undefined}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(host)'))}
      />

      <View style={styles.list}>
        {conversations.isLoading ? (
          <CardSkeleton count={3} />
        ) : conversations.isError ? (
          <ErrorState message="We could not load your messages." onRetry={() => void conversations.refetch()} />
        ) : conversations.data?.length ? (
          conversations.data.map((conversation) => {
            const guestName = conversation.guest
              ? `${conversation.guest.firstName ?? ''} ${conversation.guest.lastName ?? ''}`.trim()
              : 'Guest';
            const count = unread.data?.byConversation?.[conversation.id] ?? 0;

            return (
              <Card
                key={conversation.id}
                padded={false}
                onPress={() => router.push(`/chat/${conversation.id}`)}
                accessibilityLabel={`Conversation with ${guestName}`}
              >
                <View style={styles.row}>
                  <Avatar uri={conversation.guest?.imageUrl} name={guestName} size={48} />
                  <View style={styles.body}>
                    <View style={styles.top}>
                      <Text variant="bodyStrong" numberOfLines={1} style={styles.flex}>
                        {guestName || 'Guest'}
                      </Text>
                      <Text variant="small" tone="muted">
                        {formatRelative(conversation.updatedAt ?? conversation.createdAt)}
                      </Text>
                    </View>
                    <Text variant="small" tone={count > 0 ? 'default' : 'muted'} numberOfLines={1}>
                      {count > 0
                        ? `${count} new ${count === 1 ? 'message' : 'messages'}`
                        : conversation.bookingId
                          ? 'About a booking'
                          : 'Tap to open'}
                    </Text>
                  </View>
                  {count > 0 ? <View style={styles.dot} /> : null}
                </View>
              </Card>
            );
          })
        ) : (
          <EmptyState
            icon="chatbubbles-outline"
            title="No messages yet"
            message="Guests message you from your listings. A quick reply is the single biggest thing that turns an enquiry into a booking."
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  body: { flex: 1, gap: 2 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
});
