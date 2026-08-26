import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { messageApi } from '../../src/api/services';
import {
  Avatar, Card, CardSkeleton, ConfirmSheet, EmptyState, ErrorState, IconButton, Input, PageHeading,
  Screen, Text, useToast,
} from '../../src/components/ui';
import { Ionicons } from '../../src/components/ui/LucideIcon';
import { useLiveInbox } from '../../src/hooks/useLiveInbox';
import { useAuth } from '../../src/store/auth';
import { useChats } from '../../src/store/chats';
import { colors, spacing } from '../../src/theme';
import type { Conversation } from '../../src/types';
import { formatRelative } from '../../src/utils/format';

/**
 * Inbox — one row per host conversation.
 *
 * Live over ChatHub's per-user group while the app is in the foreground, with
 * the poll kept as a fallback for when the socket cannot connect. Waiting up to
 * a minute to find out someone had replied was the single thing that made the
 * inbox feel dead.
 */
export default function InboxScreen() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuth((s) => s.user);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadHidden = useChats((s) => s.load);
  const hide = useChats((s) => s.hide);
  const isHidden = useChats((s) => s.isHidden);

  useEffect(() => {
    void loadHidden();
  }, [loadHidden]);

  useLiveInbox(Boolean(user));

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
    const list = (conversations.data ?? []).filter((c) => !isHidden(c.id, c.updatedAt ?? c.createdAt));
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((conversation) =>
      `${conversationName(conversation)} ${conversation.lastMessage ?? ''}`.toLowerCase().includes(q));
  }, [conversations.data, isHidden, query]);

  const toggleSearch = () => {
    setSearchOpen((open) => !open);
    setQuery('');
  };

  const onConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await messageApi.removeConversation(deleteTarget.id);
    } finally {
      // Hidden locally either way — see useChats for why a 404 here still
      // means "gone from your list", just not guaranteed gone for the host.
      await hide(deleteTarget.id);
      setDeleting(false);
      setDeleteTarget(null);
      toast.success('Conversation deleted');
    }
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
              unread={unread.data?.byConversation?.[conversation.id] ?? conversation.unread ?? 0}
              onPress={() => router.push(`/chat/${conversation.id}`)}
              onDelete={() => setDeleteTarget(conversation)}
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

      <ConfirmSheet
        visible={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void onConfirmDelete()}
        title="Delete this conversation?"
        message={`This removes it from your Chats list${deleteTarget ? ` with ${conversationName(deleteTarget)}` : ''}. If they message you again, it will come back.`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
      />
    </Screen>
  );
}

/** The list endpoint now resolves the other participant and falls back to the
 * business name, so a row shows who you are actually talking to. The older
 * shapes are kept as fallbacks so a stale cached payload still renders. */
function conversationName(conversation: Conversation): string {
  if (conversation.otherPartyName) return conversation.otherPartyName;
  if (conversation.providerName) return conversation.providerName;
  return conversation.guest?.firstName
    ? `${conversation.guest.firstName} ${conversation.guest.lastName ?? ''}`.trim()
    : 'Host';
}

function ConversationRow({
  conversation, unread, onPress, onDelete,
}: {
  conversation: Conversation;
  unread: number;
  onPress: () => void;
  onDelete: () => void;
}) {
  const name = conversationName(conversation);

  return (
    // The delete button is a sibling of the row's own press target, not a
    // child of it — a control nested inside another control is unreachable
    // to a screen reader (see PackageCard's heart for the same pattern).
    <Card padded={false}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Conversation with ${name}`}
          onPress={onPress}
          style={({ pressed }) => [styles.rowMain, pressed && { opacity: 0.85 }]}
        >
          <Avatar uri={conversation.otherPartyImageUrl ?? conversation.guest?.imageUrl} name={name} size={48} />
          <View style={styles.rowBody}>
            <View style={styles.rowTop}>
              <Text variant="bodyStrong" numberOfLines={1} style={styles.flex}>
                {name}
              </Text>
              <Text variant="small" tone="muted">
                {formatRelative(conversation.lastMessageAt ?? conversation.updatedAt ?? conversation.createdAt)}
              </Text>
            </View>
            <Text variant="small" tone={unread > 0 ? 'default' : 'muted'} numberOfLines={1}>
              {conversation.lastMessage
                ? `${conversation.lastMessageMine ? 'You: ' : ''}${conversation.lastMessage}`
                : 'Tap to open the conversation'}
            </Text>
          </View>
          {unread > 0 ? <View style={styles.dot} /> : null}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete conversation with ${name}`}
          hitSlop={10}
          onPress={onDelete}
          style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  searchField: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  list: { paddingHorizontal: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  rowBody: { flex: 1, gap: 2 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
  deleteButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.lg },
});
