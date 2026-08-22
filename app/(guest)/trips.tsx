import { Ionicons } from '../../src/components/ui/LucideIcon';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { bookingApi, customTripApi } from '../../src/api/services';
import { BookingCard } from '../../src/components/BookingCard';
import {
  Badge, Button, Card, CardSkeleton, EmptyState, ErrorState, PageHeading, Screen, Text,
} from '../../src/components/ui';
import { PLACEHOLDER_IMAGE } from '../../src/constants';
import { useAuth } from '../../src/store/auth';
import { colors, radius, spacing } from '../../src/theme';
import type { CustomTrip, PackageBooking } from '../../src/types';
import { formatDateRange, formatTravelDate, pkr, plural } from '../../src/utils/format';
import { BOOKING_STATUS, packageImages, TRIP_STATUS, typeLabel } from '../../src/utils/packages';

type Segment = 'upcoming' | 'past' | 'requests';

/**
 * Trips — everything the traveller has booked or asked for.
 *
 * Upcoming and past are split because they are read for different reasons: an
 * upcoming trip is a thing you are about to do and might need to change, a past
 * one is a receipt and a review you owe someone. Custom trip requests get their
 * own segment since they are a conversation, not yet a booking.
 */
export default function TripsScreen() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [segment, setSegment] = useState<Segment>('upcoming');

  const bookings = useQuery({
    queryKey: ['my-bookings', user?.id],
    queryFn: () => bookingApi.mine(user!.id),
    enabled: Boolean(user),
  });

  const trips = useQuery({
    queryKey: ['my-custom-trips', user?.id],
    queryFn: () => customTripApi.mine(user!.id),
    enabled: Boolean(user),
  });

  const { upcoming, past } = useMemo(() => split(bookings.data ?? []), [bookings.data]);

  if (!user) {
    return (
      <Screen scroll={false}>
        <PageHeading title="Your trips" />
        <EmptyState
          icon="briefcase-outline"
          title="Sign in to see your trips"
          message="Your bookings, custom trip requests and receipts all live here."
          actionLabel="Sign in"
          onAction={() => router.push('/sign-in?redirect=/(guest)/trips')}
        />
      </Screen>
    );
  }

  const refreshing = bookings.isRefetching || trips.isRefetching;
  const onRefresh = () => {
    void bookings.refetch();
    void trips.refetch();
  };

  const segments: { key: Segment; label: string; count: number }[] = [
    { key: 'upcoming', label: 'Upcoming', count: upcoming.length },
    { key: 'past', label: 'Past', count: past.length },
    { key: 'requests', label: 'Requests', count: trips.data?.length ?? 0 },
  ];

  return (
    <Screen scroll refreshing={refreshing} onRefresh={onRefresh}>
      <PageHeading title="Your trips" />

      {/* ── segmented control ─────────────────────────────────────────── */}
      <View style={styles.segments}>
        {segments.map((option) => {
          const active = segment === option.key;
          return (
            <Pressable
              key={option.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setSegment(option.key)}
              style={[styles.segment, active && styles.segmentOn]}
            >
              <Text variant="smallStrong" tone={active ? 'default' : 'muted'}>
                {option.label}
              </Text>
              {option.count > 0 ? (
                <View style={[styles.segmentCount, active && styles.segmentCountOn]}>
                  <Text variant="caption" tone={active ? 'inverse' : 'muted'}>
                    {option.count}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.list}>
        {segment === 'requests' ? (
          trips.isLoading ? (
            <CardSkeleton count={2} />
          ) : trips.isError ? (
            <ErrorState onRetry={() => void trips.refetch()} />
          ) : trips.data?.length ? (
            trips.data.map((trip) => (
              <CustomTripCard key={trip.id} trip={trip} onPress={() => router.push(`/trip/${trip.id}`)} />
            ))
          ) : (
            <EmptyState
              icon="sparkles-outline"
              title="No trip requests yet"
              message="Tell us where you want to go and verified operators will send you a price."
              actionLabel="Build a trip"
              onAction={() => router.push('/trip-builder')}
            />
          )
        ) : bookings.isLoading ? (
          <CardSkeleton count={2} />
        ) : bookings.isError ? (
          <ErrorState onRetry={() => void bookings.refetch()} />
        ) : (segment === 'upcoming' ? upcoming : past).length ? (
          (segment === 'upcoming' ? upcoming : past).map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onPress={() => router.push(`/booking/${booking.id}`)}
            />
          ))
        ) : (
          <EmptyState
            icon={segment === 'upcoming' ? 'airplane-outline' : 'time-outline'}
            title={segment === 'upcoming' ? 'Nothing booked yet' : 'No past trips'}
            message={
              segment === 'upcoming'
                ? 'When you book a tour or a stay, it will appear here with everything you need for the day.'
                : 'Trips you have completed will be kept here.'
            }
            actionLabel={segment === 'upcoming' ? 'Explore Pakistan' : undefined}
            onAction={segment === 'upcoming' ? () => router.push('/(guest)') : undefined}
          />
        )}
      </View>
    </Screen>
  );
}

function CustomTripCard({ trip, onPress }: { trip: CustomTrip; onPress: () => void }) {
  const status = TRIP_STATUS[trip.status ?? ''] ?? { label: trip.status ?? 'Draft', tone: 'neutral' as const };
  const quoteReady = trip.status === 'QUOTE_SENT';

  return (
    <Card onPress={onPress} accessibilityLabel={trip.title ?? 'Custom trip'}>
      <View style={styles.tripTop}>
        <View style={styles.flex}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {trip.title ?? 'Custom trip'}
          </Text>
          <Text variant="small" tone="muted">
            {formatDateRange(trip.startDate, trip.endDate) || 'Dates flexible'}
          </Text>
        </View>
        <Badge label={status.label} tone={status.tone} />
      </View>

      <View style={styles.tripMeta}>
        {trip.guestCount ? (
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={14} color={colors.textMuted} />
            <Text variant="small" tone="muted">
              {plural(trip.guestCount, 'guest')}
            </Text>
          </View>
        ) : null}
        {trip.durationDays ? (
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <Text variant="small" tone="muted">
              {plural(trip.durationDays, 'day')}
            </Text>
          </View>
        ) : null}
        {trip.assignedOperator?.name ? (
          <View style={styles.metaItem}>
            <Ionicons name="business-outline" size={14} color={colors.textMuted} />
            <Text variant="small" tone="muted" numberOfLines={1}>
              {trip.assignedOperator.name}
            </Text>
          </View>
        ) : null}
      </View>

      {quoteReady && trip.quotedPrice ? (
        // Not a button: the whole card already opens the quote, and a control
        // inside a control is unreachable to a screen reader.
        <View style={styles.quoteStrip}>
          <View style={styles.flex}>
            <Text variant="caption" tone="muted">
              OPERATOR'S QUOTE
            </Text>
            <Text variant="subheading">{pkr(trip.quotedPrice)}</Text>
          </View>
          <View style={styles.quoteCta}>
            <Text variant="smallStrong" tone="primary">
              Review
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </View>
        </View>
      ) : null}
    </Card>
  );
}

/**
 * Splits bookings into upcoming and past.
 *
 * "Past" means the travel date has gone, or the booking was cancelled or
 * completed — a cancelled trip next month does not belong in a list someone
 * scans to see what they are doing next.
 */
function split(bookings: PackageBooking[]): { upcoming: PackageBooking[]; past: PackageBooking[] } {
  const now = Date.now();
  const upcoming: PackageBooking[] = [];
  const past: PackageBooking[] = [];

  bookings.forEach((booking) => {
    const dateValue = booking.departureDate ?? booking.checkOut ?? booking.checkIn;
    const finished = booking.status === 'CANCELLED' || booking.status === 'COMPLETED';
    const gone = dateValue ? new Date(dateValue).getTime() < now : false;
    (finished || gone ? past : upcoming).push(booking);
  });

  const key = (b: PackageBooking) =>
    new Date(b.departureDate ?? b.checkIn ?? b.createdAt ?? 0).getTime();

  upcoming.sort((a, b) => key(a) - key(b));
  past.sort((a, b) => key(b) - key(a));

  return { upcoming, past };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  segments: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: 4,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  segmentOn: { backgroundColor: colors.surface },
  segmentCount: {
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    alignItems: 'center',
  },
  segmentCountOn: { backgroundColor: colors.primary },

  list: { paddingHorizontal: spacing.lg, gap: spacing.lg },

  bookingRow: { flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  bookingImage: { width: 92, height: 108, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  bookingBody: { flex: 1, gap: 3 },
  bookingTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  bookingMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  bookingFoot: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginTop: 'auto' },

  payStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.warningSoft,
  },

  tripTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  tripMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },

  quoteCta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  quoteStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
