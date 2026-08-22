import { Ionicons } from './ui/LucideIcon';
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PLACEHOLDER_IMAGE } from '../constants';
import { colors, radius, spacing } from '../theme';
import type { PackageBooking } from '../types';
import { formatDateRange, formatTravelDate, pkr, plural } from '../utils/format';
import { BOOKING_STATUS, packageImages, typeLabel } from '../utils/packages';
import { Badge, Card, Text } from './ui';

/** A booking, sized so the date and status are readable at a glance. */
export function BookingCard({ booking, onPress }: { booking: PackageBooking; onPress: () => void }) {
  const status = BOOKING_STATUS[booking.status ?? ''] ?? { label: booking.status ?? '—', tone: 'neutral' as const };
  const image = packageImages(booking.package)[0] ?? PLACEHOLDER_IMAGE;
  const when = booking.departureDate
    ? formatTravelDate(booking.departureDate)
    : formatDateRange(booking.checkIn, booking.checkOut);

  const unpaid = booking.status === 'PENDING' && (booking.paidAmount ?? 0) <= 0;

  return (
    <Card padded={false} onPress={onPress} accessibilityLabel={booking.package?.name ?? 'Booking'}>
      <View style={styles.bookingRow}>
        <Image source={{ uri: image }} style={styles.bookingImage} contentFit="cover" transition={200} />
        <View style={styles.bookingBody}>
          <View style={styles.bookingTop}>
            <Text variant="caption" tone="primary">
              {typeLabel(booking.package?.packageType ?? booking.bookingType).toUpperCase()}
            </Text>
            <Badge label={status.label} tone={status.tone} />
          </View>

          <Text variant="bodyStrong" numberOfLines={2}>
            {booking.package?.name ?? booking.name ?? 'Your booking'}
          </Text>

          <View style={styles.bookingMeta}>
            <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
            <Text variant="small" tone="muted" numberOfLines={1}>
              {when || 'Dates to be confirmed'}
            </Text>
          </View>

          <View style={styles.bookingFoot}>
            <Text variant="smallStrong">{pkr(booking.totalAmount)}</Text>
            {booking.guestCount ? (
              <Text variant="small" tone="muted">
                · {plural(booking.guestCount, 'guest')}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {unpaid ? (
        <View style={styles.payStrip}>
          <Ionicons name="alert-circle-outline" size={15} color={colors.warning} />
          <Text variant="small" style={styles.flex}>
            Payment not received yet
          </Text>
          <Text variant="smallStrong" tone="primary">
            Pay now
          </Text>
        </View>
      ) : null}
    </Card>
  );
}


const styles = StyleSheet.create({
  flex: { flex: 1 },
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
});

export default BookingCard;
