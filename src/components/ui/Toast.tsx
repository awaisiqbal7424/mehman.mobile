import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, spacing } from '../../theme';
import { Text } from './Text';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const SCHEME: Record<ToastTone, { icon: keyof typeof Ionicons.glyphMap; fg: string }> = {
  success: { icon: 'checkmark-circle', fg: colors.success },
  error: { icon: 'alert-circle', fg: colors.danger },
  info: { icon: 'information-circle', fg: colors.info },
};

/**
 * Transient confirmations, shown from the top.
 *
 * From the top rather than the bottom because the bottom of every important
 * screen in this app is a pinned action bar — a toast over the "Confirm and
 * pay" button would cover the thing it is reporting on. Errors buzz; successes
 * tick.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const insets = useSafeAreaInsets();
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current++;
      setItems((current) => [...current.slice(-2), { id, tone, message }]);

      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(
          tone === 'error'
            ? Haptics.NotificationFeedbackType.Error
            : tone === 'success'
              ? Haptics.NotificationFeedbackType.Success
              : Haptics.NotificationFeedbackType.Warning,
        );
      }

      // Errors linger: they usually carry an instruction worth reading.
      setTimeout(() => dismiss(id), tone === 'error' ? 5000 : 2800);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <View pointerEvents="box-none" style={[styles.host, { top: insets.top + spacing.sm }]}>
        {items.map((item) => (
          <Animated.View key={item.id} entering={FadeInUp.springify().damping(18)} exiting={FadeOutUp}>
            <Pressable
              accessibilityRole="alert"
              accessibilityLabel={item.message}
              onPress={() => dismiss(item.id)}
              style={styles.toast}
            >
              <Ionicons name={SCHEME[item.tone].icon} size={20} color={SCHEME[item.tone].fg} />
              <Text variant="small" style={styles.message}>
                {item.message}
              </Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

/**
 * Never throws when the provider is missing — a toast is feedback, and a
 * missing provider must not be the thing that crashes a booking.
 */
export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  return context ?? NOOP;
}

const NOOP: ToastApi = { success: () => {}, error: () => {}, info: () => {} };

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    gap: spacing.sm,
    zIndex: 100,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadow.lg,
  },
  message: { flex: 1 },
});
