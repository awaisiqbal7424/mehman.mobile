import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { errorMessage } from '../../src/api/client';
import { customTripApi } from '../../src/api/services';
import {
  Badge, Button, Card, ConfirmSheet, Divider, ErrorState, Header, Loading, Notice, Row,
  Screen, Sheet, Text, TextArea, useToast,
} from '../../src/components/ui';
import { colors, radius, spacing } from '../../src/theme';
import { formatDateRange, formatShortDate, pkr, plural } from '../../src/utils/format';
import { parseJsonArray, TRIP_STATUS } from '../../src/utils/packages';

/**
 * A custom trip request, and the operator's answer to it.
 *
 * When a quote is in, this screen is a decision: accept and it becomes a real
 * booking to pay for, decline and the request stays open for another operator.
 * Both need a reason to be visible before the tap, so the quote's breakdown and
 * notes are shown in full rather than behind a "details" link.
 */
export default function CustomTripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [acceptOpen, setAcceptOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const trip = useQuery({
    queryKey: ['custom-trip', id],
    queryFn: () => customTripApi.getById(id),
    enabled: Boolean(id),
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['custom-trip', id] });
    await queryClient.invalidateQueries({ queryKey: ['my-custom-trips'] });
  };

  const onAccept = async () => {
    setBusy(true);
    try {
      const booking = await customTripApi.acceptQuote(id);
      await refresh();
      setAcceptOpen(false);
      toast.success('Quote accepted — now settle the payment');
      // Accepting produces a real booking, so the journey continues at payment.
      if (booking?.id) router.replace(`/payment/${booking.id}`);
    } catch (err) {
      toast.error(errorMessage(err, 'We could not accept that quote.'));
    } finally {
      setBusy(false);
    }
  };

  const onReject = async () => {
    setBusy(true);
    try {
      await customTripApi.rejectQuote(id, reason.trim() || 'Not quite what I was looking for');
      await refresh();
      setRejectOpen(false);
      setReason('');
      toast.success('The operator has been told');
    } catch (err) {
      toast.error(errorMessage(err, 'We could not send that.'));
    } finally {
      setBusy(false);
    }
  };

  const onCancel = async () => {
    setBusy(true);
    try {
      await customTripApi.cancel(id, 'Cancelled by the guest');
      await refresh();
      setCancelOpen(false);
      toast.success('Request cancelled');
      router.replace('/(guest)/trips');
    } catch (err) {
      toast.error(errorMessage(err, 'We could not cancel that request.'));
    } finally {
      setBusy(false);
    }
  };

  if (trip.isLoading) return <Loading label="Loading your request…" />;
  if (trip.isError || !trip.data) {
    return <ErrorState message="We could not find that request." onRetry={() => void trip.refetch()} />;
  }

  const item = trip.data;
  const status = TRIP_STATUS[item.status ?? ''] ?? { label: item.status ?? 'Draft', tone: 'neutral' as const };
  const quoteReady = item.status === 'QUOTE_SENT';
  const cancellable = item.status === 'DRAFT' || item.status === 'SUBMITTED' || item.status === 'QUOTE_SENT';
  const quoteLines = parseJsonArray<{ label?: string; amount?: number; note?: string }>(item.quoteDetailsJson);

  return (
    <View style={styles.root}>
      <Screen
        scroll
        refreshing={trip.isRefetching}
        onRefresh={() => void trip.refetch()}
        footer={
          quoteReady ? (
            <View style={styles.footer}>
              <Button
                label="Decline"
                variant="outline"
                onPress={() => setRejectOpen(true)}
                style={styles.declineButton}
              />
              <Button
                label={`Accept ${pkr(item.quotedPrice)}`}
                size="lg"
                onPress={() => setAcceptOpen(true)}
                style={styles.flex}
              />
            </View>
          ) : undefined
        }
      >
        <Header
          title={item.title ?? 'Custom trip'}
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/(guest)/trips'))}
        />

        <View style={styles.body}>
          {/* ── where it stands ─────────────────────────────────────────── */}
          {item.status === 'SUBMITTED' ? (
            <Notice
              tone="info"
              icon="paper-plane-outline"
              title="With our operators"
              message="Verified tour operators are putting a price together. You will get a notification the moment one lands — usually within a day."
            />
          ) : quoteReady ? (
            <Notice
              tone="success"
              icon="pricetag-outline"
              title="A quote is in"
              message="Look it over below. Accepting turns this into a booking you can pay for."
            />
          ) : item.status === 'CONFIRMED' ? (
            <Notice
              tone="success"
              icon="checkmark-circle-outline"
              title="Confirmed"
              message="Your operator has everything they need and will be in touch before you travel."
            />
          ) : item.status === 'CANCELLED' ? (
            <Notice
              tone="danger"
              icon="close-circle-outline"
              title="Cancelled"
              message={item.cancellationReason ?? 'This request was cancelled.'}
            />
          ) : null}

          {/* ── the quote ───────────────────────────────────────────────── */}
          {item.quotedPrice ? (
            <Card style={styles.quoteCard}>
              <View style={styles.quoteHead}>
                <View style={styles.flex}>
                  <Text variant="caption" tone="primary">
                    OPERATOR'S QUOTE
                  </Text>
                  <Text variant="display">{pkr(item.quotedPrice)}</Text>
                  {item.guestCount ? (
                    <Text variant="small" tone="secondary">
                      {pkr(Math.round(item.quotedPrice / item.guestCount))} per person ·{' '}
                      {plural(item.guestCount, 'traveller')}
                    </Text>
                  ) : null}
                </View>
                <Badge label={status.label} tone={status.tone} />
              </View>

              {item.assignedOperator?.name ? (
                <>
                  <Divider />
                  <Row label="Quoted by" value={item.assignedOperator.name} icon="business-outline" />
                  {item.quotedAt ? (
                    <Row label="Received" value={formatShortDate(item.quotedAt)} icon="time-outline" />
                  ) : null}
                </>
              ) : null}

              {quoteLines.length ? (
                <>
                  <Divider />
                  <Text variant="caption" tone="muted">
                    WHAT IT COVERS
                  </Text>
                  {quoteLines.map((line, index) => (
                    <Row
                      key={`${line.label}-${index}`}
                      label={line.label ?? `Item ${index + 1}`}
                      value={line.amount ? pkr(line.amount) : line.note}
                    />
                  ))}
                </>
              ) : null}

              {item.quoteNotes ? (
                <View style={styles.quoteNotes}>
                  <Text variant="caption" tone="muted">
                    NOTE FROM THE OPERATOR
                  </Text>
                  <Text variant="body" tone="secondary">
                    {item.quoteNotes}
                  </Text>
                </View>
              ) : null}
            </Card>
          ) : null}

          {/* ── what was asked for ──────────────────────────────────────── */}
          <Card>
            <View style={styles.cardHead}>
              <Text variant="heading">Your request</Text>
              {!item.quotedPrice ? <Badge label={status.label} tone={status.tone} /> : null}
            </View>
            <Row label="Trip type" value={item.tripType} />
            <Row label="Dates" value={formatDateRange(item.startDate, item.endDate) || 'Flexible'} />
            {item.durationDays ? <Row label="Length" value={plural(item.durationDays, 'day')} /> : null}
            <Row
              label="Travellers"
              value={`${plural(item.adultCount ?? item.guestCount ?? 1, 'adult')}${
                item.childCount ? `, ${plural(item.childCount, 'child', 'children')}` : ''
              }`}
            />
            {item.originCity ? <Row label="From" value={item.originCity} /> : null}
            <Divider />
            <Row label="Stays" value={item.accommodationPreference} />
            <Row label="Transport" value={item.transportPreference} />
            <Row label="Meals" value={item.mealPreference} />
            {item.budget ? <Row label="Your budget" value={pkr(item.budget)} /> : null}

            {item.specialRequirements ? (
              <>
                <Divider />
                <Text variant="caption" tone="muted">
                  YOUR NOTES
                </Text>
                <Text variant="small" tone="secondary">
                  {item.specialRequirements}
                </Text>
              </>
            ) : null}
          </Card>

          {cancellable ? (
            <Button
              label="Cancel this request"
              variant="ghost"
              fullWidth
              onPress={() => setCancelOpen(true)}
            />
          ) : null}
        </View>
      </Screen>

      <ConfirmSheet
        visible={acceptOpen}
        onClose={() => setAcceptOpen(false)}
        onConfirm={() => void onAccept()}
        title={`Accept ${pkr(item.quotedPrice)}?`}
        message="This turns your request into a confirmed booking with the operator. You will be taken to payment next."
        confirmLabel="Accept quote"
        loading={busy}
      />

      <ConfirmSheet
        visible={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => void onCancel()}
        title="Cancel this request?"
        message="Operators will stop working on it. You can always build a new one."
        confirmLabel="Cancel request"
        cancelLabel="Keep it"
        destructive
        loading={busy}
      />

      <Sheet
        visible={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Decline this quote"
        subtitle="Telling them why helps them come back with something better"
        footer={
          <Button label="Send" size="lg" fullWidth loading={busy} onPress={() => void onReject()} />
        }
      >
        <TextArea
          label="Reason"
          placeholder="Over my budget, wrong dates, I want a different route…"
          value={reason}
          onChangeText={setReason}
        />
        <View style={styles.hintRow}>
          <Ionicons name="information-circle-outline" size={15} color={colors.textMuted} />
          <Text variant="small" tone="muted" style={styles.flex}>
            Your request stays open, so another operator can still quote for it.
          </Text>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  body: { paddingHorizontal: spacing.lg, gap: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl },

  quoteCard: { gap: spacing.xs, borderColor: colors.primary, borderWidth: 1 },
  quoteHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  quoteNotes: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    gap: spacing.xs,
  },

  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },

  hintRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },

  footer: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  declineButton: { minWidth: 110 },
});
