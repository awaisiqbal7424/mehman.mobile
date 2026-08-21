import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { hostApi } from '../../src/api/services';
import {
  Badge, Card, Divider, EmptyState, ErrorState, Header, Loading, Notice, Row, Screen,
  StatTile, Text,
} from '../../src/components/ui';
import { colors, radius, spacing } from '../../src/theme';
import { compactPkr, pkr, plural } from '../../src/utils/format';

/**
 * Earnings and payouts.
 *
 * The distinction this screen exists to make clear is between what a host has
 * *earned* and what has actually *reached them*. Guests pay Mehman; Mehman
 * pays out. Showing one number would mean a host either thinks they are owed
 * nothing or thinks they are owed twice.
 */
export default function HostEarningsScreen() {
  const router = useRouter();

  const financials = useQuery({
    queryKey: ['host-financials'],
    queryFn: () => hostApi.financials(),
  });

  if (financials.isLoading) return <Loading label="Working out your earnings…" />;
  if (financials.isError || !financials.data) {
    return <ErrorState message="We could not load your earnings." onRetry={() => void financials.refetch()} />;
  }

  const money = financials.data;
  const months = money.byMonth ?? [];
  const peak = Math.max(...months.map((m) => m.ownerRevenue), 1);

  return (
    <Screen scroll refreshing={financials.isRefetching} onRefresh={() => void financials.refetch()}>
      <Header title="Earnings" onBack={() => (router.canGoBack() ? router.back() : router.replace('/(host)'))} />

      <View style={styles.body}>
        {/* ── the headline ────────────────────────────────────────────── */}
        <Card style={styles.hero}>
          <Text variant="caption" tone="primary">
            EARNED IN TOTAL
          </Text>
          <Text variant="display">{pkr(money.ownerRevenue)}</Text>
          <Text variant="small" tone="secondary">
            After Mehman's commission, across every confirmed booking.
          </Text>
        </Card>

        <View style={styles.stats}>
          <StatTile
            label="Paid out to you"
            value={compactPkr(money.ownerRevenuePaid)}
            icon="checkmark-circle-outline"
            tone="success"
          />
          <StatTile
            label="Still to come"
            value={compactPkr(money.ownerRevenueUnpaid)}
            icon="hourglass-outline"
            tone="warning"
          />
        </View>

        {money.ownerRevenueUnpaid > 0 ? (
          <Notice
            tone="info"
            icon="information-circle-outline"
            title={`${pkr(money.ownerRevenueUnpaid)} on its way`}
            message={`Across ${plural(money.payoutsUnpaidCount, 'booking')}. Payouts are sent to the bank account on your business profile.`}
          />
        ) : null}

        {/* ── payouts ─────────────────────────────────────────────────── */}
        <Card>
          <Text variant="heading" style={styles.cardTitle}>
            Payouts
          </Text>
          <Row label="Bookings paid out" value={String(money.payoutsPaidCount)} icon="checkmark-done-outline" />
          <Row label="Bookings pending" value={String(money.payoutsUnpaidCount)} icon="time-outline" />
          <Divider />
          <Row label="Received" value={pkr(money.ownerRevenuePaid)} tone="success" strong />
          <Row label="Outstanding" value={pkr(money.ownerRevenueUnpaid)} strong />
        </Card>

        {/* ── by month ────────────────────────────────────────────────── */}
        <Card>
          <Text variant="heading" style={styles.cardTitle}>
            Month by month
          </Text>

          {months.length ? (
            months
              .slice()
              .reverse()
              .map((month) => (
                <View key={month.month} style={styles.month}>
                  <View style={styles.monthTop}>
                    <View style={styles.flex}>
                      <Text variant="bodyStrong">{month.month}</Text>
                      <Text variant="small" tone="muted">
                        {plural(month.bookings, 'booking')} · {pkr(month.value)} taken from guests
                      </Text>
                    </View>
                    <Text variant="bodyStrong">{pkr(month.ownerRevenue)}</Text>
                  </View>

                  {/* Two-tone bar: your share against what has actually landed. */}
                  <View style={styles.track}>
                    <View
                      style={[
                        styles.barTotal,
                        { width: `${Math.max(2, (month.ownerRevenue / peak) * 100)}%` },
                      ]}
                    >
                      <View
                        style={[
                          styles.barPaid,
                          {
                            width: `${
                              month.ownerRevenue
                                ? Math.min(100, (month.ownerRevenuePaid / month.ownerRevenue) * 100)
                                : 0
                            }%`,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {month.ownerRevenuePaid < month.ownerRevenue ? (
                    <Badge
                      label={`${pkr(month.ownerRevenue - month.ownerRevenuePaid)} pending`}
                      tone="warning"
                      style={styles.monthBadge}
                    />
                  ) : month.ownerRevenue > 0 ? (
                    <Badge label="Fully paid out" tone="success" style={styles.monthBadge} />
                  ) : null}
                </View>
              ))
          ) : (
            <EmptyState
              icon="bar-chart-outline"
              title="Nothing earned yet"
              message="Your first confirmed booking will show up here."
            />
          )}
        </Card>

        <Text variant="small" tone="muted" style={styles.footnote}>
          Figures come from confirmed and completed bookings. Cancelled bookings are excluded, and a payout is
          marked here once it has been sent.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: spacing.lg, gap: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl },

  hero: { gap: 2 },
  stats: { flexDirection: 'row', gap: spacing.md },
  cardTitle: { marginBottom: spacing.md },

  month: { gap: spacing.sm, paddingVertical: spacing.md },
  monthTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  track: { height: 8, backgroundColor: colors.surfaceMuted, borderRadius: 4, overflow: 'hidden' },
  barTotal: { height: '100%', backgroundColor: colors.warning, borderRadius: 4, overflow: 'hidden' },
  barPaid: { height: '100%', backgroundColor: colors.success, borderRadius: 4 },
  monthBadge: { marginTop: spacing.xs },

  footnote: { marginTop: spacing.sm, paddingHorizontal: spacing.xs },
});
