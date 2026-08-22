import { Ionicons } from '../../src/components/ui/LucideIcon';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { errorMessage } from '../../src/api/client';
import { bookingApi, paymentApi } from '../../src/api/services';
import {
  Badge, Button, Card, Divider, ErrorState, FooterBar, Header, IconButton, Input,
  Loading, Notice, Row, Screen, Text, useToast,
} from '../../src/components/ui';
import { WALLET_ACCOUNT, whatsAppUrl } from '../../src/constants';
import { colors, radius, spacing } from '../../src/theme';
import { formatDateRange, formatTravelDate, pkr, plural } from '../../src/utils/format';

const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;

/**
 * Pay for a booking.
 *
 * There is no card gateway: the guest transfers to a wallet and uploads the
 * screenshot, and someone at Mehman verifies it. So this screen's real job is
 * to make the transfer impossible to get wrong — the number is one tap to
 * copy, the amount is stated exactly, and nothing here ever marks a payment
 * complete. That decision belongs to whoever checks the receipt.
 */
export default function PaymentScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const router = useRouter();
  const toast = useToast();

  const [receipt, setReceipt] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [reference, setReference] = useState('');
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  /** True when the upload endpoint is not live and WhatsApp is the fallback. */
  const [receiptPending, setReceiptPending] = useState(false);

  const booking = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingApi.getById(bookingId),
    enabled: Boolean(bookingId),
  });

  const total = booking.data?.totalAmount ?? 0;

  const copy = async (label: string, value: string) => {
    await Clipboard.setStringAsync(value);
    toast.success(`${label} copied`);
  };

  const pickReceipt = async (source: 'library' | 'camera') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      toast.error(
        source === 'camera'
          ? 'Allow camera access to photograph your receipt.'
          : 'Allow photo access to attach your receipt.',
      );
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.7,
          });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_RECEIPT_BYTES) {
      setReceiptError('That image is over 8 MB. Try a screenshot rather than a photo.');
      return;
    }

    setReceipt(asset);
    setReceiptError(null);
  };

  const onSubmit = async () => {
    if (!receipt) {
      setReceiptError('Attach a screenshot of your transfer.');
      return;
    }
    if (submitting || !booking.data) return;

    setSubmitting(true);
    try {
      // PENDING until a human has checked the receipt. Nothing in this app
      // marks a payment COMPLETED.
      const payment = await paymentApi.create({
        bookingId,
        userId: booking.data.userId,
        amount: total,
        paymentMethod: 'WALLET',
        status: 'PENDING',
        currency: 'PKR',
        transactionId: reference.trim() || undefined,
      });

      const upload = await paymentApi.uploadReceipt(payment.id, {
        uri: receipt.uri,
        name: receipt.fileName ?? `receipt-${bookingId}.jpg`,
        type: receipt.mimeType ?? 'image/jpeg',
      });

      if (!upload.ok) setReceiptPending(true);
      setDone(true);
      toast.success('Payment submitted for verification');
    } catch (err) {
      toast.error(errorMessage(err, 'We could not record your payment.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (booking.isLoading) return <Loading label="Loading your booking…" />;
  if (booking.isError || !booking.data) {
    return <ErrorState message="We could not find that booking." onRetry={() => void booking.refetch()} />;
  }

  const item = booking.data;
  const when = item.departureDate
    ? formatTravelDate(item.departureDate)
    : formatDateRange(item.checkIn, item.checkOut);

  /* ── submitted ─────────────────────────────────────────────────────── */
  if (done) {
    return (
      <Screen scroll padded>
        <Header title="Payment submitted" onBack={null} />

        <View style={styles.doneBody}>
          <View style={styles.doneIcon}>
            <Ionicons name="checkmark-circle" size={54} color={colors.success} />
          </View>
          <Text variant="title" center>
            We have your receipt
          </Text>
          <Text variant="body" tone="secondary" center>
            Your booking stays held while we verify the transfer. The host confirms once it clears — usually
            within a few hours.
          </Text>

          {receiptPending ? (
            <Notice
              tone="warning"
              icon="logo-whatsapp"
              title="Send the screenshot to us as well"
              message="Receipt uploads are not live yet, so please forward the screenshot on WhatsApp so we can verify it."
              action={
                <Button
                  label="Send on WhatsApp"
                  variant="secondary"
                  size="sm"
                  icon="logo-whatsapp"
                  style={styles.noticeButton}
                  onPress={() =>
                    void Linking.openURL(
                      whatsAppUrl(`Hello Mehman, here is my payment receipt for booking ${bookingId}.`),
                    )
                  }
                />
              }
            />
          ) : null}

          <Button
            label="View my bookings"
            size="lg"
            fullWidth
            onPress={() => router.replace('/(guest)/trips')}
          />
          <Button
            label="Back to exploring"
            variant="ghost"
            fullWidth
            onPress={() => router.replace('/(guest)')}
          />
        </View>
      </Screen>
    );
  }

  /* ── pay ───────────────────────────────────────────────────────────── */
  return (
    <Screen
      scroll
      footer={
        <FooterBar>
          <View style={styles.footerRow}>
            <View>
              <Text variant="small" tone="muted">
                Transfer
              </Text>
              <Text variant="heading">{pkr(total)}</Text>
            </View>
            <Button
              label="I have paid"
              size="lg"
              loading={submitting}
              onPress={onSubmit}
              style={styles.footerButton}
            />
          </View>
        </FooterBar>
      }
    >
      <Header title="Complete payment" onBack={() => router.replace('/(guest)/trips')} />

      <View style={styles.body}>
        {/* ── what is owed ────────────────────────────────────────────── */}
        <Card>
          <View style={styles.bookingHead}>
            <View style={styles.flex}>
              <Text variant="bodyStrong" numberOfLines={2}>
                {item.package?.name ?? item.name ?? 'Your booking'}
              </Text>
              <Text variant="small" tone="muted">
                Reference {String(bookingId).slice(0, 8).toUpperCase()}
              </Text>
            </View>
            <Badge label={item.status ?? 'PENDING'} tone="warning" />
          </View>

          <Divider />
          {when ? <Row label="Travel dates" value={when} icon="calendar-outline" /> : null}
          {item.guestCount ? (
            <Row label="Guests" value={plural(item.guestCount, 'guest')} icon="people-outline" />
          ) : null}
          <Row label="Amount due" value={pkr(total)} strong />
        </Card>

        {/* ── how to pay ──────────────────────────────────────────────── */}
        <View style={styles.block}>
          <Text variant="heading">Step 1 — send the transfer</Text>
          <Text variant="small" tone="secondary">
            Open {WALLET_ACCOUNT.providers.join(' or ')} and send exactly {pkr(total)} to this account. The same
            number works for both wallets.
          </Text>

          <Card style={styles.account}>
            <CopyRow label="Account title" value={WALLET_ACCOUNT.accountTitle} onCopy={copy} />
            <Divider style={styles.thinDivider} />
            <CopyRow label="Account number" value={WALLET_ACCOUNT.accountNumber} onCopy={copy} />
            <Divider style={styles.thinDivider} />
            <CopyRow label="Exact amount" value={String(Math.round(total))} onCopy={copy} prefix="PKR " />
          </Card>
        </View>

        {/* ── proof ───────────────────────────────────────────────────── */}
        <View style={styles.block}>
          <Text variant="heading">Step 2 — attach the receipt</Text>
          <Text variant="small" tone="secondary">
            A screenshot of the confirmation is all we need. This is how we match your transfer to this booking.
          </Text>

          {receipt ? (
            <View style={styles.preview}>
              <Image source={{ uri: receipt.uri }} style={styles.previewImage} contentFit="cover" />
              <IconButton
                icon="close"
                accessibilityLabel="Remove this receipt"
                background="rgba(255,255,255,0.94)"
                style={styles.previewRemove}
                onPress={() => setReceipt(null)}
              />
            </View>
          ) : (
            <View style={styles.pickers}>
              <PickerTile
                icon="images-outline"
                label="Choose a screenshot"
                onPress={() => void pickReceipt('library')}
              />
              <PickerTile icon="camera-outline" label="Take a photo" onPress={() => void pickReceipt('camera')} />
            </View>
          )}

          {receiptError ? (
            <Text variant="small" tone="danger">
              {receiptError}
            </Text>
          ) : null}

          <Input
            label="Transaction ID"
            icon="receipt-outline"
            placeholder="Optional, but it speeds verification up"
            value={reference}
            onChangeText={setReference}
            autoCapitalize="characters"
            containerStyle={styles.reference}
          />
        </View>

        <Notice
          tone="info"
          icon="shield-checkmark-outline"
          title="Your place is held"
          message="This booking stays reserved while we verify your transfer. If anything goes wrong, message us and we will sort it out."
          action={
            <Button
              label="Ask on WhatsApp"
              variant="ghost"
              size="sm"
              icon="logo-whatsapp"
              style={styles.noticeButton}
              onPress={() =>
                void Linking.openURL(whatsAppUrl(`Hello Mehman, I need help paying for booking ${bookingId}.`))
              }
            />
          }
        />
      </View>
    </Screen>
  );
}

/** One copyable line of the account details. */
function CopyRow({
  label, value, prefix = '', onCopy,
}: {
  label: string;
  value: string;
  prefix?: string;
  onCopy: (label: string, value: string) => Promise<void>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Copy ${label}: ${value}`}
      onPress={() => void onCopy(label, value)}
      style={({ pressed }) => [styles.copyRow, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.flex}>
        <Text variant="caption" tone="muted">
          {label.toUpperCase()}
        </Text>
        <Text variant="subheading" numberOfLines={1}>
          {prefix}
          {value}
        </Text>
      </View>
      <View style={styles.copyIcon}>
        <Ionicons name="copy-outline" size={16} color={colors.primary} />
      </View>
    </Pressable>
  );
}

function PickerTile({
  icon, label, onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.pickerTile, pressed && { opacity: 0.8 }]}
    >
      <Ionicons name={icon} size={24} color={colors.primary} />
      <Text variant="smallStrong" center>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: spacing.lg, gap: spacing['2xl'], paddingTop: spacing.sm },

  bookingHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },

  block: { gap: spacing.sm },
  account: { marginTop: spacing.sm, paddingVertical: spacing.xs },
  thinDivider: { marginVertical: 0 },

  copyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  copyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pickers: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  pickerTile: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },

  preview: {
    marginTop: spacing.sm,
    height: 220,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  previewImage: { width: '100%', height: '100%' },
  previewRemove: { position: 'absolute', top: spacing.md, right: spacing.md },

  reference: { marginTop: spacing.md },
  noticeButton: { alignSelf: 'flex-start', marginTop: spacing.sm, paddingHorizontal: 0 },

  footerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  footerButton: { flex: 1 },

  doneBody: { gap: spacing.lg, alignItems: 'center', paddingTop: spacing['3xl'], paddingBottom: spacing.xl },
  doneIcon: { marginBottom: spacing.sm },
});
