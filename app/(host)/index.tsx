import { Ionicons } from '../../src/components/ui/LucideIcon';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { hostApi } from '../../src/api/services';
import {
  Avatar, Badge, Card, EmptyState, ErrorState, PageHeading, Rating, Screen, Skeleton,
  StatTile, Text,
} from '../../src/components/ui';
import { useAuth } from '../../src/store/auth';
import { colors, radius, spacing } from '../../src/theme';
import { compactPkr, formatDateRange, formatShortDate, formatTravelDate, pkr, plural } from '../../src/utils/format';
import { BOOKING_STATUS } from '../../src/utils/packages';

/**
 * The host's home screen.
 *
 * Money first, then what is coming up, then what needs an answer. That ordering
 * is deliberate and comes from the web panel: a host opens this screen to find
 * out how they are doing and what they owe someone a reply on — not to admire a
 * chart.
 */
export default function HostDashboardScreen() {
  const router = useRouter();
  const provider = useAuth((s) => s.provider);

  const dashboard = useQuery({
    queryKey: ['host-dashboard'],
    queryFn: () => hostApi.dashboard(),
  });

  const financials = useQuery({
    queryKey: ['host-financials'],
    queryFn: () => hostApi.financials(),
  });

  const refreshing = dashboard.isRefetching || financials.isRefetching;
  const onRefresh = () => {
    void dashboard.refetch();
    void financials.refetch();
  };

  if (dashboard.isError) {
    return <ErrorState message="We could not load your dashboard." onRetry={() => void dashboard.refetch()} />;
  }

  const data = dashboard.data;
  const money = financials.data;

  return (
    <Screen scroll refreshing={refreshing} onRefresh={onRefresh}>
      <PageHeading
        title={`Salaam, ${provider?.name ?? 'host'}`}
        subtitle="Here is how your hosting is going"
      />

      {/* ── earnings ────────────────────────────────────────────────────── */}
      <View style={styles.section}>
        {financials.isLoading || !money ? (
          <Skeleton height={148} />
        ) : (
          <Card style={styles.earnings}>
            <Text variant="caption" tone="primary">
              YOUR EARNINGS
            </Text>
            <Text variant="display">{pkr(money.ownerRevenue)}</Text>
            <Text variant="small" tone="secondary">
              {pkr(data?.earningsThisMonth ?? 0)} this month
            </Text>

            {/* A single bar reads faster than two numbers side by side. */}
            <View style={styles.payoutBar}>
              <View
                style={[
                  styles.payoutPaid,
                  { flex: Math.max(money.ownerRevenuePaid, 1) },
                ]}
              />
              <View
                style={[
                  styles.payoutUnpaid,
                  { flex: Math.max(money.ownerRevenueUnpaid, 1) },
                ]}
              />
            </View>

            <View style={styles.payoutLegend}>
              <LegendDot color={colors.success} label={`${pkr(money.ownerRevenuePaid)} paid out`} />
              <LegendDot color={colors.warning} label={`${pkr(money.ownerRevenueUnpaid)} pending`} />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="See your earnings in detail"
              onPress={() => router.push('/host/earnings')}
              style={({ pressed }) => [styles.earningsLink, pressed && { opacity: 0.6 }]}
            >
              <Text variant="smallStrong" tone="primary">
                See the breakdown
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </Pressable>
          </Card>
        )}
      </View>

      {/* ── the numbers ─────────────────────────────────────────────────── */}
      <View style={styles.section}>
        {dashboard.isLoading || !data ? (
          <Skeleton height={92} />
        ) : (
          <View style={styles.stats}>
            <StatTile
              label="Awaiting your answer"
              value={data.bookingCounts.pending}
              icon="hourglass-outline"
              tone={data.bookingCounts.pending > 0 ? 'warning' : 'default'}
            />
            <StatTile label="Confirmed" value={data.bookingCounts.confirmed} icon="checkmark-circle-outline" tone="success" />
            <StatTile label="Live listings" value={`${data.activePackages}/${data.totalPackages}`} icon="albums-outline" />
          </View>
        )}
      </View>

      {/* ── needs attention ─────────────────────────────────────────────── */}
      {data && data.bookingCounts.pending > 0 ? (
        <View style={styles.section}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${plural(data.bookingCounts.pending, 'booking')} need confirming`}
            onPress={() => router.push('/(host)/bookings?status=PENDING')}
            style={({ pressed }) => [styles.alert, pressed && { opacity: 0.92 }]}
          >
            <Ionicons name="alert-circle" size={22} color={colors.warning} />
            <View style={styles.flex}>
              <Text variant="bodyStrong">
                {plural(data.bookingCounts.pending, 'booking needs', 'bookings need')} confirming
              </Text>
              <Text variant="small" tone="secondary">
                Guests are waiting on you. A quick yes keeps them from booking elsewhere.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}

      {data && data.unreadMessages > 0 ? (
        <View style={styles.section}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${plural(data.unreadMessages, 'unread message')}`}
            onPress={() => router.push('/host/messages')}
            style={({ pressed }) => [styles.alert, styles.alertInfo, pressed && { opacity: 0.92 }]}
          >
            <Ionicons name="chatbubble-ellipses" size={22} color={colors.info} />
            <View style={styles.flex}>
              <Text variant="bodyStrong">{plural(data.unreadMessages, 'unread message')}</Text>
              <Text variant="small" tone="secondary">
                Guests who are still deciding.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}

      {/* ── what is coming ──────────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text variant="heading">Coming up</Text>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push('/(host)/bookings')}>
            <Text variant="smallStrong" tone="primary">
              All bookings
            </Text>
          </Pressable>
        </View>

        {dashboard.isLoading ? (
          <Skeleton height={120} />
        ) : data?.upcoming?.length ? (
          <View style={styles.upcoming}>
            {data.upcoming.slice(0, 5).map((booking) => {
              const status = BOOKING_STATUS[booking.status ?? ''] ?? {
                label: booking.status ?? '—',
                tone: 'neutral' as const,
              };
              const when = booking.departureDate
                ? formatTravelDate(booking.departureDate)
                : formatDateRange(booking.checkIn, booking.checkOut);

              return (
                <Card key={booking.id} onPress={() => router.push(`/(host)/bookings?focus=${booking.id}`)}>
                  <View style={styles.upcomingTop}>
                    <View style={styles.flex}>
                      <Text variant="bodyStrong" numberOfLines={1}>
                        {booking.name ?? 'Booking'}
                      </Text>
                      <Text variant="small" tone="muted" numberOfLines={1}>
                        {booking.guestName ?? 'Guest'} · {plural(booking.guestCount ?? 1, 'guest')}
                      </Text>
                    </View>
                    <Badge label={status.label} tone={status.tone} />
                  </View>
                  <View style={styles.upcomingFoot}>
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                      <Text variant="small" tone="secondary">
                        {when || 'Dates pending'}
                      </Text>
                    </View>
                    <Text variant="smallStrong">{pkr(booking.totalAmount)}</Text>
                  </View>
                </Card>
              );
            })}
          </View>
        ) : (
          <EmptyState
            icon="calendar-outline"
            title="Nothing booked yet"
            message="Bookings appear here as soon as guests make them. Open dates on your calendar so they can."
            actionLabel="Open dates"
            onAction={() => router.push('/(host)/calendar')}
          />
        )}
      </View>

      {/* ── recent reviews ──────────────────────────────────────────────── */}
      {data?.recentReviews?.length ? (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text variant="heading">Recent reviews</Text>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push('/host/reviews')}>
              <Text variant="smallStrong" tone="primary">
                All reviews
              </Text>
            </Pressable>
          </View>

          <View style={styles.upcoming}>
            {data.recentReviews.slice(0, 3).map((review) => (
              <Card key={review.id} onPress={() => router.push('/host/reviews')}>
                <View style={styles.reviewHead}>
                  <Avatar name={review.customerFullName ?? 'Guest'} size={34} />
                  <View style={styles.flex}>
                    <Text variant="smallStrong" numberOfLines={1}>
                      {review.customerFullName ?? 'A guest'}
                    </Text>
                    <Text variant="small" tone="muted">
                      {formatShortDate(review.reviewDate)}
                    </Text>
                  </View>
                  <Rating value={review.rating} compact />
                </View>
                {review.comment ? (
                  <Text variant="small" tone="secondary" numberOfLines={3} style={styles.reviewComment}>
                    {review.comment}
                  </Text>
                ) : null}
                {!review.hostResponse ? (
                  <Text variant="small" tone="primary" style={styles.reviewComment}>
                    Tap to reply
                  </Text>
                ) : null}
              </Card>
            ))}
          </View>
        </View>
      ) : null}

      {/* ── the year so far ─────────────────────────────────────────────── */}
      {money?.byMonth?.length ? (
        <View style={styles.section}>
          <Text variant="heading" style={styles.sectionHead}>
            Earnings by month
          </Text>
          <Card>
            <MonthBars months={money.byMonth} />
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

/**
 * A small bar chart of monthly earnings.
 *
 * Drawn with plain views rather than a charting library: it is twelve bars with
 * no axes, no tooltips and no interaction, and shipping a chart engine to a
 * phone for that would cost more than it returns.
 */
function MonthBars({ months }: { months: { month: string; ownerRevenue: number }[] }) {
  const recent = months.slice(-6);
  const peak = Math.max(...recent.map((m) => m.ownerRevenue), 1);

  return (
    <View style={styles.chart}>
      {recent.map((month) => (
        <View key={month.month} style={styles.chartColumn}>
          <Text variant="caption" tone="muted">
            {compactPkr(month.ownerRevenue)}
          </Text>
          <View style={styles.chartTrack}>
            <View
              style={[
                styles.chartBar,
                { height: `${Math.max(4, (month.ownerRevenue / peak) * 100)}%` },
              ]}
            />
          </View>
          <Text variant="caption" tone="muted">
            {month.month.slice(-2)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text variant="small" tone="secondary">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl, gap: spacing.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },

  earnings: { gap: 2 },
  payoutBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: spacing.lg },
  payoutPaid: { backgroundColor: colors.success },
  payoutUnpaid: { backgroundColor: colors.warning },
  payoutLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  earningsLink: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: spacing.lg },

  stats: { flexDirection: 'row', gap: spacing.md },

  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.warningSoft,
  },
  alertInfo: { backgroundColor: colors.infoSoft },

  upcoming: { gap: spacing.md },
  upcomingTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  upcomingFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },

  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  reviewComment: { marginTop: spacing.sm },

  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, height: 150 },
  chartColumn: { flex: 1, alignItems: 'center', gap: spacing.xs, height: '100%' },
  chartTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  chartBar: { width: '100%', backgroundColor: colors.primary, borderRadius: radius.sm, minHeight: 4 },
});
