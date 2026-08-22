import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, spacing } from '../../theme';
import { Button, IconButton } from './Button';
import { Text } from './Text';

/**
 * A bottom sheet.
 *
 * Built on the platform Modal rather than a gesture library: the sheets in this
 * app are all short, decision-shaped things (pick a departure, choose a
 * wallet, confirm a cancellation), and none of them want a drag handle that
 * invites a half-open state. Tapping the scrim or the X closes; there is no
 * ambiguous middle.
 *
 * The slide is React Native's own Animated rather than Reanimated's layout
 * animations. Reanimated's `entering`/`exiting` do not run inside a Modal on
 * web, which left the sheet mounted but invisible — and the sheet is how the
 * booking flow, every confirmation and half the host actions are reached, so it
 * has to behave the same on all three platforms.
 */
export function Sheet({
  visible, onClose, title, subtitle, children, footer, scroll = true,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  scroll?: boolean;
}) {
  // 0 = fully off the bottom, 1 = settled. Driven natively where possible;
  // `translateY` uses a percentage-free interpolation so the sheet's own height
  // does not have to be measured first.
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? 240 : 160,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress, visible]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [520, 0] });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/*
        A Modal opens its own native window on Android, and insets from the
        app-level SafeAreaProvider do not reliably reach inside it — this is
        what let the sheet's own padding come out as 0 and leave its footer
        (the "Choose a date" button, a slot list) sitting under the phone's
        own gesture bar or nav buttons. A SafeAreaProvider re-declared inside
        the Modal re-measures insets for that window instead of inheriting a
        stale value from outside it.
      */}
      <SafeAreaProvider>
        <Animated.View style={[styles.scrim, { opacity: progress }]}>
          <Pressable style={styles.scrimTap} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        </Animated.View>

        <SheetPanel
          title={title}
          subtitle={subtitle}
          footer={footer}
          scroll={scroll}
          onClose={onClose}
          translateY={translateY}
        >
          {children}
        </SheetPanel>
      </SafeAreaProvider>
    </Modal>
  );
}

function SheetPanel({
  title, subtitle, footer, scroll, onClose, translateY, children,
}: {
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
  scroll: boolean;
  onClose: () => void;
  translateY: Animated.AnimatedInterpolation<number>;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Animated.View
      style={[
        styles.sheet,
        // A minimum comfortably clear of any Android nav bar even on the
        // rare device that still reports a 0 inset here.
        { paddingBottom: Math.max(insets.bottom, spacing.xl), transform: [{ translateY }] },
      ]}
    >
      <View style={styles.grabber} />

      {title ? (
        <View style={styles.head}>
          <View style={styles.headTitles}>
            <Text variant="heading">{title}</Text>
            {subtitle ? (
              <Text variant="small" tone="secondary" style={styles.headSubtitle}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <IconButton
            icon="close"
            accessibilityLabel="Close"
            background={colors.surfaceMuted}
            onPress={onClose}
          />
        </View>
      ) : null}

      {scroll ? (
        <ScrollView
          style={styles.bodyScroll}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.body}>{children}</View>
      )}

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </Animated.View>
  );
}

/**
 * A yes/no sheet for anything destructive — cancelling a booking, deleting a
 * listing, signing out. Destructive confirmations are always a sheet, never an
 * OS alert, so the wording and the consequences are ours to state.
 */
export function ConfirmSheet({
  visible, onClose, onConfirm, title, message, confirmLabel = 'Confirm',
  cancelLabel = 'Not now', destructive, loading,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      scroll={false}
      footer={
        <View style={styles.confirmActions}>
          <Button label={cancelLabel} variant="outline" onPress={onClose} style={styles.confirmButton} />
          <Button
            label={confirmLabel}
            variant={destructive ? 'danger' : 'primary'}
            loading={loading}
            onPress={onConfirm}
            style={styles.confirmButton}
          />
        </View>
      }
    >
      {message ? (
        <Text variant="body" tone="secondary">
          {message}
        </Text>
      ) : null}
    </Sheet>
  );
}

/** A list of options inside a sheet — sort orders, wallets, cancellation reasons. */
export function SheetOption({
  label, description, selected, onPress,
}: {
  label: string;
  description?: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.option, selected && styles.optionOn, pressed && { opacity: 0.8 }]}
    >
      <View style={styles.optionText}>
        <Text variant="bodyStrong">{label}</Text>
        {description ? (
          <Text variant="small" tone="secondary">
            {description}
          </Text>
        ) : null}
      </View>
      <View style={[styles.radio, selected && styles.radioOn]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.scrim },
  scrimTap: { flex: 1 },

  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '88%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingTop: spacing.sm,
    ...shadow.lg,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.md,
  },

  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  headTitles: { flex: 1 },
  headSubtitle: { marginTop: 2 },

  bodyScroll: { flexGrow: 0 },
  body: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.md },

  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  confirmActions: { flexDirection: 'row', gap: spacing.md },
  confirmButton: { flex: 1 },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionText: { flex: 1, gap: 2 },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
});

export default Sheet;
