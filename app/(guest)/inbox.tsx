import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { messageApi } from '../../src/api/services';
import {
  Avatar, Card, CardSkeleton, EmptyState, ErrorState, IconButton, Input, PageHeading, Screen, Text,
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

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

  const filtered = useMemo(() => {
    const list = conversations.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((conversation) => conversationName(conversation).toLowerCase().includes(q));
  }, [conversations.data, query]);

  const toggleSearch = () => {
    setSearchOpen((open) => !open);
    setQuery('');
  };

  if (!user) {
    return (
      <Screen scroll={false}>
        <PageHeading title="Chats" />
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
      <PageHeading
        title="Chats"
        subtitle="Your conversations with hosts"
        right={
          <IconButton
            icon={searchOpen ? 'close' : 'search'}
            accessibilityLabel={searchOpen ? 'Close search' : 'Search conversations'}
            onPress={toggleSearch}
          />
        }
      />

      {searchOpen ? (
        <View style={styles.searchField}>
          <Input
            icon="search"
            placeholder="Search by host name"
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
      ) : null}

      <View style={styles.list}>
        {conversations.isLoading ? (
          <CardSkeleton count={3} />
        ) : conversations.isError ? (
          <ErrorState message="We could not load your messages." onRetry={() => void conversations.refetch()} />
        ) : filtered.length ? (
          filtered.map((conversation) => (
            <ConversationRow
              key={conversation.id}
              conversation={conversation}
              unread={unread.data?.byConversation?.[conversation.id] ?? 0}
              onPress={() => router.push(`/chat/${conversation.id}`)}
            />
          ))
        ) : conversations.data?.length ? (
          <EmptyState
            icon="search-outline"
            title="No matches"
            message="Nobody in your inbox matches that name."
          />
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

/** The list endpoint does not join the provider, so the host's own name is
 * the best label available without a second request per row. */
function conversationName(conversation: Conversation): string {
  return conversation.guest?.firstName
    ? `${conversation.guest.firstName} ${conversation.guest.lastName ?? ''}`.trim()
    : 'Host';
}

function ConversationRow({
  conversation, unread, onPress,
}: {
  conversation: Conversation;
  unread: number;
  onPress: () => void;
}) {
  const name = conversationName(conversation);

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
  searchField: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  list: { paddingHorizontal: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  rowBody: { flex: 1, gap: 2 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
});
