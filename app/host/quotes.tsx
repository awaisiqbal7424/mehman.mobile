import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { errorMessage } from '../../src/api/client';
import { customTripApi } from '../../src/api/services';
import {
  Badge, Button, Card, CardSkeleton, Divider, EmptyState, ErrorState, Header, Input,
  Notice, Row, Screen, Sheet, Text, TextArea, useToast,
} from '../../src/components/ui';
import { serviceFeeFor, SERVICE_FEE_LABEL } from '../../src/constants';
import { useAuth } from '../../src/store/auth';
import { colors, spacing } from '../../src/theme';
import type { CustomTrip } from '../../src/types';
import { formatDateRange, formatShortDate, pkr, plural } from '../../src/utils/format';
import { parseJsonArray, TRIP_STATUS } from '../../src/utils/packages';

/**
 * Custom trip requests waiting on a price.
 *
 * The quote sheet shows what the guest will actually be charged next to what
 * the host will actually receive. A host who types "150,000" is thinking about
 * their own take-home, and finding out about the commission only after a guest
 * has accepted is how trust in a marketplace gets lost.
 */
export default function HostQuotesScreen() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const provider = useAuth((s) => s.provider);

  const [quoting, setQuoting] = useState<CustomTrip | null>(null);
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const trips = useQuery({
    queryKey: ['host-trip-requests', provider?.id],
    // Operators see requests assigned to them through the same custom-trip
    // endpoint the guest uses, scoped by the token.
    queryFn: () => customTripApi.mine(provider!.providerOwnerId ?? provider!.id),
    enabled: Boolean(provider),
  });

  const submitQuote = async () => {
    if (!quoting || !price) return;
    setBusy(true);
    try {
      await customTripApi.sendQuote(quoting.id, {
        quotedPrice: Number(price),
        quoteNotes: notes.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['host-trip-requests'] });
      toast.success('Quote sent to the guest');
      setQuoting(null);
      setPrice('');
      setNotes('');
    } catch (err) {
      toast.error(errorMessage(err, 'We could not send that quote.'));
    } finally {
      setBusy(false);
    }
  };

  const guestPays = price ? Number(price) + serviceFeeFor(Number(price)) : 0;

  const items = trips.data ?? [];
  const awaiting = items.filter((trip) => trip.status === 'SUBMITTED');

  return (
    <Screen scroll refreshing={trips.isRefetching} onRefresh={() => void trips.refetch()}>
      <Header
        title="Trip requests"
        subtitle={awaiting.length ? `${awaiting.length} waiting on a price` : undefined}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(host)'))}
      />

      <View style={styles.list}>
        {trips.isLoading ? (
          <CardSkeleton count={2} />
        ) : trips.isError ? (
          <ErrorState message="We could not load trip requests." onRetry={() => void trips.refetch()} />
        ) : items.length ? (
          items.map((trip) => {
            const status = TRIP_STATUS[trip.status ?? ''] ?? {
              label: trip.status ?? '—',
              tone: 'neutral' as const,
            };
            const destinations = parseJsonArray<{ destinationId?: string }>(trip.destinationsJson);
            const needsQuote = trip.status === 'SUBMITTED';

            return (
              <Card key={trip.id}>
                <View style={styles.top}>
                  <View style={styles.flex}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {trip.title ?? 'Custom trip'}
                    </Text>
                    <Text variant="small" tone="muted">
                      Asked {formatShortDate(trip.createdAt)}
                    </Text>
                  </View>
                  <Badge label={status.label} tone={status.tone} />
                </View>

                <Divider />

                <Row
                  label="Dates"
                  value={formatDateRange(trip.startDate, trip.endDate) || 'Flexible'}
                  icon="calendar-outline"
                />
                {trip.durationDays ? (
                  <Row label="Length" value={plural(trip.durationDays, 'day')} icon="time-outline" />
                ) : null}
                <Row
                  label="Travellers"
                  value={`${plural(trip.adultCount ?? trip.guestCount ?? 1, 'adult')}${
                    trip.childCount ? `, ${plural(trip.childCount, 'child', 'children')}` : ''
                  }`}
                  icon="people-outline"
                />
                {trip.originCity ? (
                  <Row label="Travelling from" value={trip.originCity} icon="navigate-outline" />
                ) : null}
                {destinations.length ? (
                  <Row label="Destinations" value={plural(destinations.length, 'place')} icon="map-outline" />
                ) : null}
                <Row label="Stays" value={trip.accommodationPreference} icon="bed-outline" />
                <Row label="Transport" value={trip.transportPreference} icon="car-outline" />
                {trip.budget ? (
                  <Row label="Their budget" value={pkr(trip.budget)} icon="cash-outline" strong />
                ) : null}

                {trip.specialRequirements ? (
                  <View style={styles.note}>
                    <Ionicons name="chatbox-ellipses-outline" size={15} color={colors.textMuted} />
                    <Text variant="small" tone="secondary" style={styles.flex}>
                      {trip.specialRequirements}
                    </Text>
                  </View>
                ) : null}

                {needsQuote ? (
                  <Button
                    label="Send a quote"
                    fullWidth
                    icon="pricetag-outline"
                    style={styles.action}
                    onPress={() => {
                      setQuoting(trip);
                      setPrice(trip.budget ? String(trip.budget) : '');
                    }}
                  />
                ) : trip.quotedPrice ? (
                  <View style={styles.quoted}>
                    <Text variant="small" tone="secondary">
                      You quoted
                    </Text>
                    <Text variant="bodyStrong">{pkr(trip.quotedPrice)}</Text>
                  </View>
                ) : null}
              </Card>
            );
          })
        ) : (
          <EmptyState
            icon="document-text-outline"
            title="No trip requests"
            message="When travellers ask for a custom itinerary that suits your business, it lands here for you to price."
          />
        )}
      </View>

      {/* ── quote sheet ─────────────────────────────────────────────────── */}
      <Sheet
        visible={Boolean(quoting)}
        onClose={() => setQuoting(null)}
        title="Send a quote"
        subtitle={quoting?.title ?? undefined}
        footer={
          <Button
            label="Send to the guest"
            size="lg"
            fullWidth
            disabled={!price || Number(price) <= 0}
            loading={busy}
            onPress={() => void submitQuote()}
          />
        }
      >
        <Input
          label="Your price for the whole trip"
          icon="cash-outline"
          placeholder="0"
          value={price}
          onChangeText={setPrice}
          keyboardType="number-pad"
          hint={quoting?.budget ? `Their budget was ${pkr(quoting.budget)}` : undefined}
        />

        {price ? (
          <Card>
            <Row label="You receive" value={pkr(Number(price))} strong tone="success" />
            <Row label={`Mehman service fee (${SERVICE_FEE_LABEL})`} value={pkr(serviceFeeFor(Number(price)))} />
            <Divider />
            <Row label="The guest pays" value={pkr(guestPays)} strong />
          </Card>
        ) : null}

        <TextArea
          label="What does this cover?"
          placeholder="Transport, hotels, meals, guide, permits — spell it out and you will get fewer questions back."
          value={notes}
          onChangeText={setNotes}
        />

        <Notice
          tone="info"
          icon="information-circle-outline"
          title="The guest decides next"
          message="They can accept, or decline and ask another operator. Nothing is charged until they accept."
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingTop: spacing.sm },

  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  note: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignItems: 'flex-start' },
  action: { marginTop: spacing.lg },
  quoted: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
