import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { messageApi } from '../../src/api/services';
import {
  Avatar, Card, CardSkeleton, EmptyState, ErrorState, PageHeading, Screen, Text,
} from '../../src/components/ui';
import { useAuth } from '../../src/store/auth';
import { colors, spacing } from '../../src/theme';
import type { Conversation } from '../../src/types';
import { formatRelative } from '../../src/utils/format';

/**
 * Inbox — one row per host conversation.
 *
 * Polled on a one-minute interval rather than held open on a socket. The
 * conversation itself is live (see the chat screen); a list of who has written
 * does not need to be, and a background socket is an expensive thing to keep
 * alive on a phone that may be on 3G.
 */
export default function InboxScreen() {
  const router = useRouter();
  const user = useAuth((s) => s.user);

  const conversations = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: () => messageApi.conversations(user!.id),
    enabled: Boolean(user),
    refetchInterval: 60_000,
  });

  const unread = useQuery({
    queryKey: ['unread-count', user?.id],
    queryFn: () => messageApi.unreadCount(),
    enabled: Boolean(user),
    refetchInterval: 60_000,
  });

  if (!user) {
    return (
      <Screen scroll={false}>
        <PageHeading title="Inbox" />
        <EmptyState
          icon="chatbubble-outline"
          title="Sign in to message hosts"
          message="Ask about a route, a pickup, or anything else before you book."
          actionLabel="Sign in"
          onAction={() => router.push('/sign-in?redirect=/(guest)/inbox')}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll refreshing={conversations.isRefetching} onRefresh={() => void conversations.refetch()}>
      <PageHeading title="Inbox" subtitle="Your conversations with hosts" />

      <View style={styles.list}>
        {conversations.isLoading ? (
          <CardSkeleton count={3} />
        ) : conversations.isError ? (
          <ErrorState message="We could not load your messages." onRetry={() => void conversations.refetch()} />
        ) : conversations.data?.length ? (
          conversations.data.map((conversation) => (
            <ConversationRow
              key={conversation.id}
              conversation={conversation}
              unread={unread.data?.byConversation?.[conversation.id] ?? 0}
              onPress={() => router.push(`/chat/${conversation.id}`)}
            />
          ))
        ) : (
          <EmptyState
            icon="chatbubble-ellipses-outline"
            title="No messages yet"
            message="Open a listing and tap the message icon to ask the host anything."
            actionLabel="Explore Pakistan"
            onAction={() => router.push('/(guest)')}
          />
        )}
      </View>
    </Screen>
  );
}

function ConversationRow({
  conversation, unread, onPress,
}: {
  conversation: Conversation;
  unread: number;
  onPress: () => void;
}) {
  // The list endpoint does not join the provider, so the host's own name is the
  // best label available without a second request per row.
  const name = conversation.guest?.firstName
    ? `${conversation.guest.firstName} ${conversation.guest.lastName ?? ''}`.trim()
    : 'Host';

  return (
    <Card padded={false} onPress={onPress} accessibilityLabel={`Conversation with ${name}`}>
      <View style={styles.row}>
        <Avatar uri={conversation.guest?.imageUrl} name={name} size={48} />
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text variant="bodyStrong" numberOfLines={1} style={styles.flex}>
              {name}
            </Text>
            <Text variant="small" tone="muted">
              {formatRelative(conversation.updatedAt ?? conversation.createdAt)}
            </Text>
          </View>
          <Text variant="small" tone={unread > 0 ? 'default' : 'muted'} numberOfLines={1}>
            {unread > 0 ? `${unread} new ${unread === 1 ? 'message' : 'messages'}` : 'Tap to open the conversation'}
          </Text>
        </View>
        {unread > 0 ? <View style={styles.dot} /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingHorizontal: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  rowBody: { flex: 1, gap: 2 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
});
