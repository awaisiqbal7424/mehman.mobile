import { Ionicons } from '../src/components/ui/LucideIcon';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { aiApi, AiError, MAX_MESSAGE_LENGTH, type AiLanguage, type AiMode, type AiTurn } from '../src/api/ai';
import { EmptyState, Header, Text } from '../src/components/ui';
import { useSettingsStore, buildWhatsAppUrl } from '../src/store/settingsStore';
import { colors, radius, shadow, spacing } from '../src/theme';

/**
 * TravelBuddy.
 *
 * A full screen rather than the floating panel the website uses — on a phone a widget
 * that overlaps the tab bar is in the way, and the keyboard needs the whole height
 * anyway. Bubbles, composer and inverted list all match `app/chat/[id].tsx`, so it reads
 * as another conversation rather than a different product.
 *
 * Two modes, one screen:
 *   /assistant                  — travel guidance and Mehman questions
 *   /assistant?mode=listing     — helps a host draft listing copy
 */

/**
 * The brand's square mark, used as TravelBuddy's face. The wordmark is ~4.4:1 and turns
 * to mush at this size; `assets/brand/` carries square marks for exactly this.
 * `accessibilityElementsHidden` because every place it appears already has a real label
 * on the control beside it.
 */
function MehmanMark({ size, tone = 'white' }: { size: number; tone?: 'white' | 'orange' }) {
  return (
    <Image
      source={
        tone === 'white'
          ? require('../assets/brand/mehman-mark-white-transparent.png')
          : require('../assets/brand/mehman-mark-orange-transparent.png')
      }
      style={{ width: size, height: size }}
      contentFit="contain"
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

interface ChatMessage extends AiTurn {
  id: string;
  /** Renders a "talk to a person" card under the bubble. */
  escalated?: boolean;
  /** Renders as a retryable error. */
  failed?: boolean;
  language?: AiLanguage;
}

const SUGGESTIONS: Record<AiMode, Record<AiLanguage, string[]>> = {
  // Planning first, policy second. TravelBuddy can help someone work out where and when
  // to go; if the openers are all about refund windows, nobody discovers that.
  support: {
    en: [
      'When is the best time to visit Hunza?',
      'I have 5 days and want mountains — where should I go?',
      'What do the cancellation policies mean?',
    ],
    ur: [
      'ہنزہ جانے کا بہترین وقت کون سا ہے؟',
      'میرے پاس 5 دن ہیں اور پہاڑ دیکھنے ہیں — کہاں جاؤں؟',
      'کینسلیشن پالیسی کا کیا مطلب ہے؟',
    ],
  },
  listing: {
    en: [
      'Help me write a listing for a 4-day Hunza tour',
      'Rewrite my description so it is clearer',
      'What should I put in the highlights?',
    ],
    ur: [
      'ہنزہ کے 4 دن کے ٹور کی لسٹنگ لکھنے میں مدد کریں',
      'میری تفصیل کو مزید واضح لکھیں',
      'ہائی لائٹس میں کیا لکھنا چاہیے؟',
    ],
  },
};

const COPY = {
  en: {
    supportTitle: 'TravelBuddy',
    listingTitle: 'TravelBuddy',
    placeholder: 'Ask about a place, a trip, or how Mehman works…',
    listingPlaceholder: 'Tell me about your tour or stay…',
    emptyTitle: 'Where do you want to go?',
    emptyBody: 'Ask me where to go, when to go, or anything about Mehman — in English or Urdu. I can get things wrong, so check roads, permits and weather before you travel. Payments and account security always go to a person.',
    listingEmptyTitle: 'Let us write your listing',
    listingEmptyBody: 'Tell me the facts — where it is, how long, what is included — and I will draft a title, summary and highlights. I only use what you tell me.',
    talkToHuman: 'Talk to a person on WhatsApp',
    retry: 'Try again',
    thinking: 'Thinking…',
    switchLanguage: 'اردو میں بات کریں',
  },
  ur: {
    supportTitle: 'ٹریول بڈی',
    listingTitle: 'ٹریول بڈی',
    placeholder: 'کسی جگہ، سفر یا مہمان کے بارے میں پوچھیں…',
    listingPlaceholder: 'اپنے ٹور یا قیام کے بارے میں بتائیں…',
    emptyTitle: 'آپ کہاں جانا چاہتے ہیں؟',
    emptyBody: 'مجھ سے پوچھیں کہاں جانا ہے، کب جانا ہے، یا مہمان کے بارے میں کچھ بھی — اردو یا انگریزی میں۔ میں غلطی کر سکتا ہوں، اس لیے سفر سے پہلے سڑکوں، اجازت ناموں اور موسم کی تصدیق ضرور کریں۔ ادائیگی اور اکاؤنٹ کی حفاظت ہمیشہ کسی فرد کے پاس جاتی ہے۔',
    listingEmptyTitle: 'آئیے آپ کی لسٹنگ لکھیں',
    listingEmptyBody: 'مجھے حقائق بتائیں — جگہ، دورانیہ، کیا شامل ہے — اور میں عنوان، خلاصہ اور ہائی لائٹس تیار کر دوں گا۔ میں صرف وہی لکھوں گا جو آپ بتائیں گے۔',
    talkToHuman: 'واٹس ایپ پر کسی فرد سے بات کریں',
    retry: 'دوبارہ کوشش کریں',
    thinking: 'سوچ رہا ہوں…',
    switchLanguage: 'Switch to English',
  },
} as const;

let counter = 0;
const nextId = () => `ai-${Date.now()}-${counter++}`;

export default function AssistantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode: modeParam } = useLocalSearchParams<{ mode?: string }>();
  const mode: AiMode = modeParam === 'listing' ? 'listing' : 'support';

  const whatsAppNumber = useSettingsStore((s) => s.whatsAppNumber);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputHeight, setInputHeight] = useState(44);

  /**
   * `preference` is null until the person taps the language button, and null is what is
   * sent — it means "work it out from what I wrote". Always sending a language would
   * make the server's detection dead code, so someone typing Urdu into a screen that
   * happened to show English would be answered in English forever. `uiLanguage` is only
   * what this screen's own labels are written in, and follows the reply until a choice
   * is made.
   */
  const [preference, setPreference] = useState<AiLanguage | null>(null);
  const [uiLanguage, setUiLanguage] = useState<AiLanguage>('en');
  const language = preference ?? uiLanguage;
  const copy = COPY[language];

  const listRef = useRef<FlatList<ChatMessage>>(null);

  const status = useQuery({
    queryKey: ['ai-status'],
    queryFn: aiApi.status,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  /** Failed sends are ours, not context — they never go back to the server. */
  const history = useMemo<AiTurn[]>(
    () => messages.filter((m) => !m.failed).map((m) => ({ role: m.role, content: m.content })),
    [messages],
  );

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || sending || message.length > MAX_MESSAGE_LENGTH) return;

      setMessages((current) => [...current, { id: nextId(), role: 'user', content: message }]);
      setDraft('');
      setInputHeight(44);
      setSending(true);

      try {
        const reply = await aiApi.ask({
          message,
          mode,
          language: preference ?? undefined,
          sessionId,
          history,
        });

        if (reply.language) setUiLanguage(reply.language);
        if (reply.sessionId) setSessionId(reply.sessionId);

        setMessages((current) => [
          ...current,
          {
            id: nextId(),
            role: 'assistant',
            content: reply.message,
            escalated: reply.escalated,
            language: reply.language,
          },
        ]);
      } catch (error) {
        const failure =
          error instanceof AiError
            ? error.message
            : 'Something went wrong reaching the assistant. Please try again.';
        setMessages((current) => [
          ...current,
          { id: nextId(), role: 'assistant', content: failure, failed: true },
        ]);
      } finally {
        setSending(false);
      }
    },
    [history, mode, preference, sending, sessionId],
  );

  /** Drops the failed reply and the question behind it, then asks again. */
  const retry = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    setMessages((current) => {
      const trimmed = [...current];
      while (trimmed.length && trimmed[trimmed.length - 1].id !== lastUser.id) trimmed.pop();
      trimmed.pop();
      return trimmed;
    });
    void send(lastUser.content);
  }, [messages, send]);

  const openWhatsApp = useCallback(() => {
    void Linking.openURL(
      buildWhatsAppUrl(
        whatsAppNumber,
        language === 'ur' ? 'السلام علیکم، مجھے مدد چاہیے۔' : 'Hi Mehman, I need help with something.',
      ),
    );
  }, [language, whatsAppNumber]);

  const title = mode === 'listing' ? copy.listingTitle : copy.supportTitle;

  // Newest first, because the list is inverted.
  const ordered = useMemo(() => [...messages].reverse(), [messages]);

  if (status.data && !status.data.available) {
    // Nothing to talk to. Say so once rather than letting every message fail.
    return (
      <View style={styles.root}>
        <Header title={title} onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <View style={styles.unavailable}>
          <EmptyState
            icon="chatbubble-ellipses-outline"
            title="The assistant is not available"
            message="You can still reach a person on WhatsApp, and everything else in the app works as normal."
          />
          <Pressable accessibilityRole="button" onPress={openWhatsApp} style={styles.handover}>
            <Ionicons name="logo-whatsapp" size={18} color={colors.textOnPrimary} />
            <Text variant="smallStrong" tone="inverse">{copy.talkToHuman}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Header
        title={title}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        // The label is always the language you would switch *to*, written in that
        // language — the one form that needs no translation to understand.
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.switchLanguage}
            onPress={() => {
              const next: AiLanguage = language === 'en' ? 'ur' : 'en';
              setPreference(next);
              setUiLanguage(next);
            }}
            style={styles.langButton}
          >
            <Text variant="smallStrong" tone="primary">{language === 'en' ? 'اردو' : 'EN'}</Text>
          </Pressable>
        }
      />

      <KeyboardAvoidingView
        style={styles.flex}
        // Matches app/chat/[id].tsx — 'height' on Android because adjustResize alone is
        // not reliable under edgeToEdgeEnabled.
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 56 : 0}
      >
        <FlatList
          ref={listRef}
          data={ordered}
          inverted
          keyExtractor={(item) => item.id}
          keyboardDismissMode="interactive"
          contentContainerStyle={styles.thread}
          ListHeaderComponent={
            sending ? (
              <View style={styles.typing}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text variant="small" tone="muted">{copy.thinking}</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const mine = item.role === 'user';
            const rtl = item.language === 'ur';

            if (item.failed) {
              return (
                <View style={styles.rowTheirs}>
                  <View style={styles.errorBlock}>
                    <View style={[styles.bubble, styles.bubbleError]}>
                      <Text variant="small" tone="danger">{item.content}</Text>
                    </View>
                    <Pressable accessibilityRole="button" onPress={retry} style={styles.retry}>
                      <Ionicons name="refresh-outline" size={14} color={colors.primary} />
                      <Text variant="smallStrong" tone="primary">{copy.retry}</Text>
                    </Pressable>
                  </View>
                </View>
              );
            }

            return (
              <View style={mine ? styles.rowMine : styles.rowTheirs}>
                {/* The bare mark beside TravelBuddy's own turns — no disc behind it,
                    same as the launcher on the web. In a two-party thread it is what
                    tells you who is talking at a glance; bubble colour alone does that
                    job less well once answers get long. */}
                {!mine ? <MehmanMark size={22} tone="orange" /> : null}
                <View style={styles.messageBlock}>
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text
                      variant="body"
                      tone={mine ? 'inverse' : 'default'}
                      // Urdu reads right to left; an English answer in the same thread
                      // must not be dragged along with it.
                      style={rtl ? styles.rtl : undefined}
                    >
                      {item.content}
                    </Text>
                  </View>
                  {item.escalated ? (
                    <Pressable accessibilityRole="button" onPress={openWhatsApp} style={styles.handover}>
                      <Ionicons name="logo-whatsapp" size={18} color={colors.textOnPrimary} />
                      <Text variant="smallStrong" tone="inverse">{copy.talkToHuman}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            messages.length === 0 && !sending ? (
              <View style={styles.empty}>
                {/* Not `EmptyState` here: it takes an icon name, and this is the one
                    screen where the brand mark itself should be the face. */}
                <View style={styles.introBlock}>
                  <MehmanMark size={56} tone="orange" />
                  <Text variant="heading" center>
                    {mode === 'listing' ? copy.listingEmptyTitle : copy.emptyTitle}
                  </Text>
                  <Text variant="body" tone="secondary" center style={styles.introBody}>
                    {mode === 'listing' ? copy.listingEmptyBody : copy.emptyBody}
                  </Text>
                </View>
                <View style={styles.suggestions}>
                  {SUGGESTIONS[mode][language].map((suggestion) => (
                    <Pressable
                      key={suggestion}
                      accessibilityRole="button"
                      onPress={() => void send(suggestion)}
                      style={({ pressed }) => [styles.suggestion, pressed && styles.suggestionPressed]}
                    >
                      <Text variant="small">{suggestion}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null
          }
        />

        {/* ── composer ────────────────────────────────────────────────── */}
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <TextInput
            style={[
              styles.input,
              { borderRadius: inputHeight > 50 ? radius.xl : radius.full },
              language === 'ur' && styles.rtl,
            ]}
            value={draft}
            onChangeText={setDraft}
            onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height)}
            placeholder={mode === 'listing' ? copy.listingPlaceholder : copy.placeholder}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={MAX_MESSAGE_LENGTH}
            accessibilityLabel={mode === 'listing' ? copy.listingPlaceholder : copy.placeholder}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !draft.trim() || sending }}
            disabled={!draft.trim() || sending}
            onPress={() => void send(draft)}
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },

  langButton: {
    minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },

  thread: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },

  rowMine: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing.xs },
  rowTheirs: {
    flexDirection: 'row', justifyContent: 'flex-start', marginBottom: spacing.xs,
    gap: spacing.sm, alignItems: 'flex-end',
  },
  messageBlock: { maxWidth: '85%', gap: spacing.sm, alignItems: 'flex-start' },
  errorBlock: { maxWidth: '85%', gap: spacing.xs, alignItems: 'flex-start' },


  bubble: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.xl },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  bubbleTheirs: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  bubbleError: {
    backgroundColor: colors.dangerSoft,
    borderBottomLeftRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.danger,
  },

  /** Urdu is right-to-left; English in the same thread stays left-aligned. */
  rtl: { writingDirection: 'rtl', textAlign: 'right' },

  retry: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs },

  handover: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.full,
    paddingHorizontal: spacing.lg, minHeight: 44, justifyContent: 'center',
    ...shadow.sm,
  },

  typing: {
    // The list is inverted, so its header sits at the bottom — and so does this.
    transform: [{ scaleY: -1 }],
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.md,
  },

  empty: { transform: [{ scaleY: -1 }], gap: spacing.lg, paddingTop: spacing['2xl'] },
  introBlock: { alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
  // The mark sits above the heading with a little more air than the default gap, so it
  // reads as a mark rather than as part of the sentence.
  introBody: { paddingHorizontal: spacing.sm },
  suggestions: { gap: spacing.sm, paddingHorizontal: spacing.sm },
  suggestion: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 44, justifyContent: 'center',
  },
  suggestionPressed: { borderColor: colors.primary, backgroundColor: colors.primarySoft },

  unavailable: { flex: 1, justifyContent: 'center', gap: spacing.xl, padding: spacing.xl },

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
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.surfaceMuted,
    color: colors.text,
    fontSize: 17,
    lineHeight: 22,
  },
  send: {
    width: 44, height: 44, borderRadius: radius.full,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  sendOff: { backgroundColor: colors.borderStrong },
});
