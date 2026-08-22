import { Ionicons } from '../../src/components/ui/LucideIcon';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { errorMessage } from '../../src/api/client';
import { availabilityApi, packageApi } from '../../src/api/services';
import { Calendar, type DateRange } from '../../src/components/Calendar';
import {
  Badge, Button, Card, ConfirmSheet, Divider, EmptyState, ErrorState, Input, Loading,
  Notice, PageHeading, Row, Screen, Sheet, Text, useToast,
} from '../../src/components/ui';
import { useAuth } from '../../src/store/auth';
import { colors, radius, spacing } from '../../src/theme';
import { formatShortDate, formatTravelDate, pkr, plural, toApiDate } from '../../src/utils/format';
import { isSlotBased, typeLabel } from '../../src/utils/packages';

/**
 * The host's availability.
 *
 * The screen changes shape with the listing type, because the two are genuinely
 * different jobs. A tour host opens departures — specific dates with a number
 * of seats. A stay host closes nights they are not free. Forcing both into one
 * calendar metaphor is what makes availability tools confusing.
 */
export default function HostCalendarScreen() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const provider = useAuth((s) => s.provider);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [range, setRange] = useState<DateRange>({ start: null, end: null });
  const [slotOpen, setSlotOpen] = useState(false);
  const [slotDate, setSlotDate] = useState<Date | null>(null);
  const [seats, setSeats] = useState('12');
  const [priceOverride, setPriceOverride] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const listings = useQuery({
    queryKey: ['host-listings', provider?.id],
    queryFn: () => packageApi.getAll({ providerId: provider!.id }),
    enabled: Boolean(provider),
  });

  // The backend does not actually filter `/api/provider-packages` by the
  // `providerId` query param — it returns every provider's packages — so this
  // filters client-side to keep a host's calendar to their own listings.
  const myListings = listings.data?.filter((item) => item.providerId === provider?.id);

  useEffect(() => {
    if (!selectedId && myListings?.length) setSelectedId(myListings[0].id);
  }, [myListings, selectedId]);

  const selected = myListings?.find((item) => item.id === selectedId);
  const slotBased = isSlotBased(selected?.packageType);

  const slots = useQuery({
    queryKey: ['host-slots', selectedId],
    queryFn: () => availabilityApi.tourSlots(selectedId!),
    enabled: Boolean(selectedId) && slotBased,
  });

  const stayCalendar = useQuery({
    queryKey: ['host-availability', selectedId],
    queryFn: () => availabilityApi.forPackage(selectedId!),
    enabled: Boolean(selectedId) && !slotBased,
  });

  const blockedDates = useMemo(() => {
    const closed = new Set<string>();
    stayCalendar.data?.forEach((entry) => {
      if (entry.isAvailable === false || entry.availabilityType === 'STAY_BLOCKED') {
        closed.add(entry.date.slice(0, 10));
      }
    });
    return closed;
  }, [stayCalendar.data]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['host-slots', selectedId] });
    await queryClient.invalidateQueries({ queryKey: ['host-availability', selectedId] });
  };

  const addDeparture = async () => {
    if (!slotDate || !selectedId) return;
    setBusy(true);
    try {
      await availabilityApi.create({
        packageId: selectedId,
        providerId: provider?.id,
        availabilityType: 'TOUR_DEPARTURE',
        date: toApiDate(slotDate),
        totalSpots: Number(seats) || 1,
        isAvailable: true,
        priceOverride: priceOverride ? Number(priceOverride) : undefined,
      });
      await refresh();
      toast.success('Departure opened');
      setSlotOpen(false);
      setSlotDate(null);
      setPriceOverride('');
    } catch (err) {
      toast.error(errorMessage(err, 'We could not open that date.'));
    } finally {
      setBusy(false);
    }
  };

  const removeDeparture = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await availabilityApi.remove(removing);
      await refresh();
      toast.success('Departure removed');
      setRemoving(null);
    } catch (err) {
      toast.error(errorMessage(err, 'We could not remove that departure.'));
    } finally {
      setBusy(false);
    }
  };

  const applyRange = async (mode: 'block' | 'open') => {
    if (!range.start || !selectedId) return;
    setBusy(true);
    const payload = {
      packageId: selectedId,
      startDate: toApiDate(range.start),
      endDate: toApiDate(range.end ?? range.start),
    };
    try {
      if (mode === 'block') await availabilityApi.block(payload);
      else await availabilityApi.open(payload);
      await refresh();
      toast.success(mode === 'block' ? 'Those nights are now closed' : 'Those nights are now open');
      setRange({ start: null, end: null });
    } catch (err) {
      toast.error(errorMessage(err, 'We could not update those dates.'));
    } finally {
      setBusy(false);
    }
  };

  if (listings.isLoading) return <Loading label="Loading your listings…" />;
  if (listings.isError) {
    return <ErrorState message="We could not load your listings." onRetry={() => void listings.refetch()} />;
  }

  if (!myListings?.length) {
    return (
      <Screen scroll={false}>
        <PageHeading title="Calendar" />
        <EmptyState
          icon="albums-outline"
          title="No listings yet"
          message="Create a listing first, then you can open dates for it."
          actionLabel="Create a listing"
          onAction={() => router.push('/host/listing/new')}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll refreshing={slots.isRefetching || stayCalendar.isRefetching} onRefresh={() => void refresh()}>
      <PageHeading title="Calendar" subtitle="Open the dates you can take guests" />

      {/* ── which listing ───────────────────────────────────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.picker}>
        {myListings.map((listing) => {
          const active = listing.id === selectedId;
          return (
            <Pressable
              key={listing.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => {
                setSelectedId(listing.id);
                setRange({ start: null, end: null });
              }}
              style={[styles.pickerItem, active && styles.pickerItemOn]}
            >
              <Text variant="caption" tone={active ? 'primary' : 'muted'}>
                {typeLabel(listing.packageType).toUpperCase()}
              </Text>
              <Text variant="smallStrong" numberOfLines={1}>
                {listing.name ?? 'Listing'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.body}>
        {slotBased ? (
          /* ── tour departures ───────────────────────────────────────── */
          <>
            <Notice
              tone="info"
              icon="information-circle-outline"
              title="Departures"
              message="Each date you open is a departure with its own number of seats. Guests can only book the dates listed here."
            />

            <Button
              label="Open a new departure"
              size="lg"
              fullWidth
              icon="add"
              onPress={() => {
                setSlotDate(null);
                setSlotOpen(true);
              }}
            />

            {slots.isLoading ? (
              <Loading />
            ) : slots.data?.length ? (
              <View style={styles.slots}>
                {slots.data.map((slot) => {
                  const booked = slot.bookedSpots ?? 0;
                  const total = slot.totalSpots ?? 0;
                  const left = slot.availableSpots ?? Math.max(0, total - booked);

                  return (
                    <Card key={slot.id}>
                      <View style={styles.slotTop}>
                        <View style={styles.flex}>
                          <Text variant="bodyStrong">{formatTravelDate(slot.date)}</Text>
                          <Text variant="small" tone="muted">
                            {booked} of {total} seats taken
                          </Text>
                        </View>
                        <Badge
                          label={left > 0 ? `${plural(left, 'seat')} left` : 'Sold out'}
                          tone={left > 0 ? 'success' : 'warning'}
                        />
                      </View>

                      {/* Fill bar: how full this departure is, at a glance. */}
                      <View style={styles.fillTrack}>
                        <View
                          style={[
                            styles.fillBar,
                            { width: `${total ? Math.min(100, (booked / total) * 100) : 0}%` },
                          ]}
                        />
                      </View>

                      <View style={styles.slotFoot}>
                        {slot.priceOverride ? (
                          <Text variant="small" tone="secondary">
                            Priced at {pkr(slot.priceOverride)}
                          </Text>
                        ) : (
                          <Text variant="small" tone="muted">
                            Standard price
                          </Text>
                        )}
                        {booked === 0 ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Remove the departure on ${formatShortDate(slot.date)}`}
                            hitSlop={8}
                            onPress={() => setRemoving(slot.id)}
                          >
                            <Text variant="smallStrong" tone="danger">
                              Remove
                            </Text>
                          </Pressable>
                        ) : (
                          <Text variant="small" tone="muted">
                            Has bookings
                          </Text>
                        )}
                      </View>
                    </Card>
                  );
                })}
              </View>
            ) : (
              <EmptyState
                icon="calendar-outline"
                title="No departures open"
                message="Guests cannot book this tour until you open at least one date."
              />
            )}
          </>
        ) : (
          /* ── stay availability ─────────────────────────────────────── */
          <>
            <Notice
              tone="info"
              icon="information-circle-outline"
              title="Your nights"
              message="Every night is open by default. Pick a range and close it when you are not free — a red dot marks a closed night."
            />

            <Card>
              <Calendar range={range} onChange={setRange} blockedDates={blockedDates} />
            </Card>

            {range.start ? (
              <Card>
                <Row
                  label="Selected"
                  value={
                    range.end
                      ? `${formatShortDate(range.start)} → ${formatShortDate(range.end)}`
                      : formatShortDate(range.start)
                  }
                  strong
                />
                <Divider />
                <View style={styles.rangeActions}>
                  <Button
                    label="Close these nights"
                    variant="outline"
                    style={styles.flex}
                    loading={busy}
                    onPress={() => void applyRange('block')}
                  />
                  <Button
                    label="Open them"
                    style={styles.flex}
                    loading={busy}
                    onPress={() => void applyRange('open')}
                  />
                </View>
              </Card>
            ) : null}

            <Button
              label="Seasonal pricing"
              variant="outline"
              fullWidth
              icon="pricetags-outline"
              onPress={() => router.push(`/host/pricing/${selectedId}`)}
            />
          </>
        )}
      </View>

      {/* ── new departure sheet ─────────────────────────────────────────── */}
      <Sheet
        visible={slotOpen}
        onClose={() => setSlotOpen(false)}
        title="Open a departure"
        subtitle={selected?.name ?? undefined}
        footer={
          <Button
            label={slotDate ? `Open ${formatShortDate(slotDate)}` : 'Pick a date first'}
            size="lg"
            fullWidth
            disabled={!slotDate}
            loading={busy}
            onPress={() => void addDeparture()}
          />
        }
      >
        <Calendar
          range={{ start: slotDate, end: null }}
          onChange={(next) => setSlotDate(next.start)}
        />
        <Divider />
        <Input
          label="Seats available"
          icon="people-outline"
          value={seats}
          onChangeText={setSeats}
          keyboardType="number-pad"
          hint="How many guests can join this departure?"
        />
        <Input
          label="Price for this date"
          icon="cash-outline"
          placeholder="Leave blank to use the listing price"
          value={priceOverride}
          onChangeText={setPriceOverride}
          keyboardType="number-pad"
          hint={priceOverride ? pkr(Number(priceOverride)) : undefined}
        />
      </Sheet>

      <ConfirmSheet
        visible={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={() => void removeDeparture()}
        title="Remove this departure?"
        message="It will disappear from the listing and guests will no longer be able to book it."
        confirmLabel="Remove"
        destructive
        loading={busy}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  picker: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  pickerItem: {
    width: 160,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 2,
  },
  pickerItemOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },

  body: { paddingHorizontal: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl },

  slots: { gap: spacing.md },
  slotTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  fillTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceMuted,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  fillBar: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  slotFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.md,
  },

  rangeActions: { flexDirection: 'row', gap: spacing.md },
});
