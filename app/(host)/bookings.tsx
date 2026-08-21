import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { errorMessage } from '../../src/api/client';
import { bookingApi, hostApi } from '../../src/api/services';
import {
  Badge, Button, Card, CardSkeleton, Chip, ConfirmSheet, Divider, EmptyState, ErrorState,
  PageHeading, Row, Screen, Sheet, Text, useToast,
} from '../../src/components/ui';
import { colors, spacing } from '../../src/theme';
import type { HostBooking } from '../../src/types';
import { formatDateRange, formatShortDate, formatTravelDate, pkr, plural } from '../../src/utils/format';
import { BOOKING_STATUS, typeLabel } from '../../src/utils/packages';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'To confirm' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

/**
 * The host's booking list.
 *
 * Confirming, completing and cancelling all go through a confirmation sheet.
 * These write to a guest's plans and, in the cancel case, their money — none of
 * them should be one stray tap away on a phone that lives in a pocket.
 */
export default function HostBookingsScreen() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ status?: string; focus?: string }>();

  const [status, setStatus] = useState(params.status ?? '');
  const [detail, setDetail] = useState<HostBooking | null>(null);
  const [action, setAction] = useState<{ booking: HostBooking; next: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (params.status) setStatus(params.status);
  }, [params.status]);

  const bookings = useQuery({
    queryKey: ['host-bookings', status],
    queryFn: () => hostApi.bookings({ status: status || undefined, size: 50 }),
  });

  // A dashboard tap can name a booking to open straight away.
  useEffect(() => {
    if (!params.focus || !bookings.data?.items) return;
    const match = bookings.data.items.find((b) => b.id === params.focus);
    if (match) setDetail(match);
  }, [bookings.data, params.focus]);

  const applyStatus = async () => {
    if (!action) return;
    setBusy(true);
    try {
      await bookingApi.setStatus(action.booking.id, action.next);
      await queryClient.invalidateQueries({ queryKey: ['host-bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['host-dashboard'] });
      toast.success(
        action.next === 'CONFIRMED'
          ? 'Booking confirmed — the guest has been told'
          : action.next === 'COMPLETED'
            ? 'Marked as completed'
            : 'Booking cancelled',
      );
      setAction(null);
      setDetail(null);
    } catch (err) {
      toast.error(errorMessage(err, 'We could not update that booking.'));
    } finally {
      setBusy(false);
    }
  };

  const items = bookings.data?.items ?? [];

  return (
    <Screen scroll refreshing={bookings.isRefetching} onRefresh={() => void bookings.refetch()}>
      <PageHeading
        title="Bookings"
        subtitle={bookings.data ? `${bookings.data.totalCount} in total` : undefined}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {FILTERS.map((filter) => (
          <Chip
            key={filter.value || 'all'}
            label={filter.label}
            selected={status === filter.value}
            onPress={() => setStatus(filter.value)}
          />
        ))}
      </ScrollView>

      <View style={styles.list}>
        {bookings.isLoading ? (
          <CardSkeleton count={3} />
        ) : bookings.isError ? (
          <ErrorState message="We could not load your bookings." onRetry={() => void bookings.refetch()} />
        ) : items.length ? (
          items.map((booking) => {
            const tone = BOOKING_STATUS[booking.status ?? ''] ?? {
              label: booking.status ?? '—',
              tone: 'neutral' as const,
            };
            const when = booking.departureDate
              ? formatTravelDate(booking.departureDate)
              : formatDateRange(booking.checkIn, booking.checkOut);

            return (
              <Card key={booking.id} padded={false}>
                {/* The summary opens the detail sheet; the quick action below
                    sits outside it, so neither control swallows the other. */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={booking.guestName ?? 'Booking'}
                  onPress={() => setDetail(booking)}
                  style={({ pressed }) => [styles.cardInner, pressed && { opacity: 0.9 }]}
                >
                <View style={styles.rowTop}>
                  <View style={styles.flex}>
                    <Text variant="caption" tone="primary">
                      {typeLabel(booking.bookingType).toUpperCase()}
                    </Text>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {booking.packageName ?? booking.name ?? 'Booking'}
                    </Text>
                  </View>
                  <Badge label={tone.label} tone={tone.tone} />
                </View>

                <View style={styles.rowMeta}>
                  <MetaItem icon="person-outline" text={booking.guestName ?? 'Guest'} />
                  <MetaItem icon="calendar-outline" text={when || 'Dates pending'} />
                  <MetaItem icon="people-outline" text={plural(booking.guestCount ?? 1, 'guest')} />
                </View>

                <Divider />
                </Pressable>

                <View style={styles.rowFoot}>
                  <View>
                    <Text variant="caption" tone="muted">
                      YOUR SHARE
                    </Text>
                    <Text variant="bodyStrong">{pkr(booking.ownerRevenue ?? booking.baseAmount)}</Text>
                  </View>

                  {booking.status === 'PENDING' ? (
                    <Button
                      label="Confirm"
                      size="sm"
                      icon="checkmark"
                      onPress={() => setAction({ booking, next: 'CONFIRMED' })}
                    />
                  ) : booking.ownerPayoutPaid ? (
                    <Badge label="Paid out" tone="success" icon="checkmark-circle" />
                  ) : booking.status === 'CONFIRMED' || booking.status === 'COMPLETED' ? (
                    <Badge label="Payout pending" tone="warning" />
                  ) : null}
                </View>
              </Card>
            );
          })
        ) : (
          <EmptyState
            icon="calendar-outline"
            title={status ? 'Nothing in this state' : 'No bookings yet'}
            message={
              status
                ? 'Try another filter to see the rest.'
                : 'Bookings land here the moment a guest makes one.'
            }
            actionLabel={status ? 'Show all' : 'Open dates'}
            onAction={status ? () => setStatus('') : () => router.push('/(host)/calendar')}
          />
        )}
      </View>

      {/* ── detail sheet ────────────────────────────────────────────────── */}
      <Sheet
        visible={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.packageName ?? 'Booking'}
        subtitle={detail ? `Reference ${detail.id.slice(0, 8).toUpperCase()}` : undefined}
        footer={
          detail ? (
            <View style={styles.sheetActions}>
              {detail.status === 'PENDING' ? (
                <>
                  <Button
                    label="Decline"
                    variant="outline"
                    style={styles.flex}
                    onPress={() => setAction({ booking: detail, next: 'CANCELLED' })}
                  />
                  <Button
                    label="Confirm"
                    style={styles.flex}
                    onPress={() => setAction({ booking: detail, next: 'CONFIRMED' })}
                  />
                </>
              ) : detail.status === 'CONFIRMED' ? (
                <>
                  <Button
                    label="Cancel"
                    variant="outline"
                    style={styles.flex}
                    onPress={() => setAction({ booking: detail, next: 'CANCELLED' })}
                  />
                  <Button
                    label="Mark completed"
                    style={styles.flex}
                    onPress={() => setAction({ booking: detail, next: 'COMPLETED' })}
                  />
                </>
              ) : (
                <Button label="Close" variant="outline" fullWidth onPress={() => setDetail(null)} />
              )}
            </View>
          ) : undefined
        }
      >
        {detail ? (
          <>
            <Row label="Status" value={BOOKING_STATUS[detail.status ?? '']?.label ?? detail.status} strong />
            <Row
              label={detail.departureDate ? 'Departure' : 'Dates'}
              value={
                detail.departureDate
                  ? formatTravelDate(detail.departureDate)
                  : formatDateRange(detail.checkIn, detail.checkOut)
              }
            />
            {detail.nightsCount ? <Row label="Nights" value={plural(detail.nightsCount, 'night')} /> : null}
            <Row label="Guests" value={plural(detail.guestCount ?? 1, 'guest')} />
            <Row label="Booked" value={formatShortDate(detail.createdAt)} />

            <Divider />
            <Text variant="caption" tone="muted">
              GUEST
            </Text>
            <Row label="Name" value={detail.guestName} />
            <Row label="Phone" value={detail.guestPhone} />
            <Row label="Email" value={detail.guestEmail} />

            {detail.guestPhone ? (
              <View style={styles.contactButtons}>
                <Button
                  label="Call"
                  variant="outline"
                  size="sm"
                  icon="call-outline"
                  style={styles.flex}
                  onPress={() => void Linking.openURL(`tel:${detail.guestPhone}`)}
                />
                <Button
                  label="WhatsApp"
                  variant="outline"
                  size="sm"
                  icon="logo-whatsapp"
                  style={styles.flex}
                  onPress={() =>
                    void Linking.openURL(
                      `https://wa.me/${(detail.guestPhone ?? '').replace(/[^0-9]/g, '').replace(/^0/, '92')}`,
                    )
                  }
                />
              </View>
            ) : null}

            {detail.specialRequests ? (
              <>
                <Divider />
                <Text variant="caption" tone="muted">
                  GUEST'S NOTE
                </Text>
                <Text variant="small" tone="secondary">
                  {detail.specialRequests}
                </Text>
              </>
            ) : null}

            <Divider />
            <Text variant="caption" tone="muted">
              MONEY
            </Text>
            <Row label="Guest paid" value={pkr(detail.totalAmount)} />
            {detail.commissionPercentage ? (
              <Row label="Mehman commission" value={`${detail.commissionPercentage}%`} />
            ) : null}
            <Row label="Your share" value={pkr(detail.ownerRevenue ?? detail.baseAmount)} strong />
            <Row
              label="Payout"
              value={detail.ownerPayoutPaid ? `Paid ${formatShortDate(detail.ownerPayoutPaidAt)}` : 'Pending'}
              tone={detail.ownerPayoutPaid ? 'success' : 'default'}
            />
          </>
        ) : null}
      </Sheet>

      <ConfirmSheet
        visible={Boolean(action)}
        onClose={() => setAction(null)}
        onConfirm={() => void applyStatus()}
        title={
          action?.next === 'CONFIRMED'
            ? 'Confirm this booking?'
            : action?.next === 'COMPLETED'
              ? 'Mark as completed?'
              : 'Cancel this booking?'
        }
        message={
          action?.next === 'CONFIRMED'
            ? 'The guest is told straight away and the dates are held for them.'
            : action?.next === 'COMPLETED'
              ? 'This closes the booking and opens it up for the guest to review.'
              : 'The guest is told straight away, and any payment they made will need refunding. This cannot be undone.'
        }
        confirmLabel={
          action?.next === 'CONFIRMED' ? 'Confirm' : action?.next === 'COMPLETED' ? 'Mark completed' : 'Cancel booking'
        }
        cancelLabel="Not now"
        destructive={action?.next === 'CANCELLED'}
        loading={busy}
      />
    </Screen>
  );
}

function MetaItem({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={13} color={colors.textMuted} />
      <Text variant="small" tone="secondary" numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  filters: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  list: { paddingHorizontal: spacing.lg, gap: spacing.md },

  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  rowMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, maxWidth: '48%' },
  cardInner: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  rowFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },

  sheetActions: { flexDirection: 'row', gap: spacing.md },
  contactButtons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
});
