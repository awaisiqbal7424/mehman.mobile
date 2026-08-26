import { Ionicons } from '../../src/components/ui/LucideIcon';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { messageApi } from '../../src/api/services';
import { EmptyState, ErrorState, Header, Loading, Text, useToast } from '../../src/components/ui';
import { useLiveMessages } from '../../src/hooks/useLiveMessages';
import { useAuth } from '../../src/store/auth';
import { colors, radius, spacing, type as typeScale } from '../../src/theme';
import type { Message } from '../../src/types';
import { formatShortDate, formatTime } from '../../src/utils/format';

/**
 * One conversation.
 *
 * The list is inverted — newest at the bottom, which is where a chat belongs —
 * and a sent message appears immediately with a "sending" state rather than
 * waiting for the server. On a slow connection that gap is a second or two, and
 * a message box that empties into nothing feels broken.
 */
export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const user = useAuth((s) => s.user);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  /** Drives the pill → rounded-rectangle switch on the composer as it grows past one line. */
  const [inputHeight, setInputHeight] = useState(44);
  /** Messages posted from this device that the server has not echoed yet. */
  const [pending, setPending] = useState<Message[]>([]);
  const listRef = useRef<FlatList<Message>>(null);

  const thread = useQuery({
    queryKey: ['thread', id],
    queryFn: () => messageApi.thread(id),
    enabled: Boolean(id),
    // A fallback for when the socket cannot connect.
    refetchInterval: 20_000,
  });

  // Who this is with. Read from the inbox list the guest already loaded rather
  // than fetched again — a header that says "Conversation" tells you nothing,
  // but it is not worth a request of its own.
  const conversations = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: () => messageApi.conversations(user!.id),
    enabled: Boolean(user),
    staleTime: 60_000,
  });
  const conversation = conversations.data?.find((c) => c.id === id);
  const title = conversation?.otherPartyName ?? conversation?.providerName ?? 'Conversation';

  const appendLive = useCallback(
    (message: Message) => {
      queryClient.setQueryData<Message[]>(['thread', id], (current) => {
        if (!current) return [message];
        if (current.some((m) => m.id === message.id)) return current;
        return [...current, message];
      });
      setPending((current) => current.filter((m) => m.content !== message.content));
      // The row's preview and ordering come from the server, so let it recompute.
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    [id, queryClient],
  );

  useLiveMessages(id, appendLive);

  // Clearing the badge is best-effort; failing to do it must not break the chat.
  useEffect(() => {
    if (id && user) {
      void messageApi
        .markRead(id, user.id)
        .then(() => queryClient.invalidateQueries({ queryKey: ['unread-count'] }))
        .catch(() => {});
    }
  }, [id, queryClient, user]);

  const send = async () => {
    const content = draft.trim();
    if (!content || sending || !user) return;

    const optimistic: Message = {
      id: `pending-${Date.now()}`,
      conversationId: id,
      senderId: user.id,
      content,
      sentAt: new Date().toISOString(),
    };

    setDraft('');
    setInputHeight(44);
    setPending((current) => [...current, optimistic]);
    setSending(true);

    try {
      const saved = await messageApi.send({ conversationId: id, senderId: user.id, content });
      setPending((current) => current.filter((m) => m.id !== optimistic.id));
      queryClient.setQueryData<Message[]>(['thread', id], (current) =>
        current ? [...current, saved] : [saved],
      );
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch {
      setPending((current) => current.filter((m) => m.id !== optimistic.id));
      setDraft(content); // give them their words back rather than losing them
      toast.error('That message did not send. Try again.');
    } finally {
      setSending(false);
    }
  };

  if (thread.isLoading) return <Loading label="Opening the conversation…" />;
  if (thread.isError) {
    return <ErrorState message="We could not open this conversation." onRetry={() => void thread.refetch()} />;
  }

  // Inverted list: newest first in the data, newest at the bottom on screen.
  const messages = [...(thread.data ?? []), ...pending].reverse();

  return (
    <View style={styles.root}>
      <Header
        title={title}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(guest)/inbox'))}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        // 'height' on Android: `adjustResize` alone was not reliably
        // resizing the layout under `edgeToEdgeEnabled` (see app.json),
        // which left the composer sitting under the keyboard instead of
        // riding above it.
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 56 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          inverted
          keyExtractor={(item) => item.id}
          keyboardDismissMode="interactive"
          contentContainerStyle={styles.thread}
          renderItem={({ item, index }) => {
            const mine = item.senderId === user?.id;
            // `messages` is newest-first, so the "next" item is the older one.
            const older = messages[index + 1];
            const showDate = !older || !sameDay(older.sentAt, item.sentAt);

            return (
              <View>
                {showDate ? (
                  <Text variant="caption" tone="muted" center style={styles.dateStamp}>
                    {formatShortDate(item.sentAt)}
                  </Text>
                ) : null}
                <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text variant="body" tone={mine ? 'inverse' : 'default'}>
                      {item.content}
                    </Text>
                    <View style={styles.bubbleFoot}>
                      <Text variant="caption" style={mine ? styles.timeMine : styles.timeTheirs}>
                        {formatTime(item.sentAt)}
                      </Text>
                      {item.id.startsWith('pending-') ? (
                        <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.75)" />
                      ) : null}
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <EmptyState
                icon="chatbubble-ellipses-outline"
                title="Say salaam"
                message="Ask about pickup, timings, or anything you want to know before booking."
              />
            </View>
          }
        />

        {/* ── composer ────────────────────────────────────────────────── */}
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <TextInput
            style={[styles.input, { borderRadius: inputHeight > 50 ? radius.xl : radius.full }]}
            value={draft}
            onChangeText={setDraft}
            onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height)}
            placeholder="Write a message…"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={2000}
            accessibilityLabel="Message"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !draft.trim() || sending }}
            disabled={!draft.trim() || sending}
            onPress={send}
            style={({ pressed }) => [
              styles.send,
              (!draft.trim() || sending) && styles.sendOff,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Ionicons name="send" size={18} color={colors.textOnPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const sameDay = (a?: string, b?: string) => {
  if (!a || !b) return false;
  return new Date(a).toDateString() === new Date(b).toDateString();
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },

  thread: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },
  dateStamp: { marginVertical: spacing.md },

  bubbleRow: { flexDirection: 'row', marginBottom: spacing.xs },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },

  bubble: { maxWidth: '80%', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.xl },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  bubbleTheirs: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  bubbleFoot: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-end', marginTop: 3 },
  timeMine: { color: 'rgba(255,255,255,0.75)' },
  timeTheirs: { color: colors.textMuted },

  empty: { transform: [{ scaleY: -1 }] },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.surfaceMuted,
    // Border radius is set inline from `inputHeight`: a pill for one line,
    // easing into a rounded rectangle once the message wraps, rather than
    // stretching a fixed pill curve into a stadium shape as it grows.
    color: colors.text,
    ...typeScale.body,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOff: { backgroundColor: colors.borderStrong },
});
