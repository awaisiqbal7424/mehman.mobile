import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { errorMessage } from '../../../src/api/client';
import { packageApi, seasonalPricingApi } from '../../../src/api/services';
import { Calendar, type DateRange } from '../../../src/components/Calendar';
import {
  Badge, Button, Card, CardSkeleton, ConfirmSheet, Divider, EmptyState, ErrorState, Header,
  Input, Notice, Row, Screen, Sheet, Text, useToast,
} from '../../../src/components/ui';
import { colors, spacing } from '../../../src/theme';
import type { SeasonalPricing } from '../../../src/types';
import { formatShortDate, pkr, plural, toApiDate } from '../../../src/utils/format';

/**
 * Seasonal pricing for a stay.
 *
 * A season is a date range with its own nightly rate — cherry blossom in Hunza,
 * Eid week, the dead of winter. The list is what the host reads; the sheet is
 * where they set one. Overlaps are the host's business to resolve, but the
 * screen shows the ranges in date order so a clash is visible rather than
 * buried.
 */
export default function SeasonalPricingScreen() {
  const { packageId } = useLocalSearchParams<{ packageId: string }>();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<SeasonalPricing | null>(null);
  const [deleting, setDeleting] = useState<SeasonalPricing | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  const [minNights, setMinNights] = useState('');
  const [range, setRange] = useState<DateRange>({ start: null, end: null });

  const listing = useQuery({
    queryKey: ['package', packageId],
    queryFn: () => packageApi.getById(packageId),
    enabled: Boolean(packageId),
  });

  const seasons = useQuery({
    queryKey: ['seasonal-pricing', packageId],
    queryFn: () => seasonalPricingApi.forPackage(packageId),
    enabled: Boolean(packageId),
  });

  const openEditor = (season?: SeasonalPricing) => {
    setEditing(season ?? null);
    setName(season?.name ?? '');
    setRate(season ? String(season.pricePerNight) : '');
    setMinNights(season?.minNights ? String(season.minNights) : '');
    setRange(
      season
        ? { start: new Date(season.startDate), end: new Date(season.endDate) }
        : { start: null, end: null },
    );
    setEditorOpen(true);
  };

  const save = async () => {
    if (!range.start || !range.end || !rate) return;
    setBusy(true);
    try {
      const payload = {
        packageId,
        name: name.trim() || 'Season',
        startDate: toApiDate(range.start),
        endDate: toApiDate(range.end),
        pricePerNight: Number(rate),
        minNights: minNights ? Number(minNights) : undefined,
        pricingType: 'FIXED',
        isActive: true,
      };

      if (editing) await seasonalPricingApi.update(editing.id, payload);
      else await seasonalPricingApi.create(payload);

      await queryClient.invalidateQueries({ queryKey: ['seasonal-pricing', packageId] });
      toast.success(editing ? 'Season updated' : 'Season added');
      setEditorOpen(false);
    } catch (err) {
      toast.error(errorMessage(err, 'We could not save that season.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await seasonalPricingApi.remove(deleting.id);
      await queryClient.invalidateQueries({ queryKey: ['seasonal-pricing', packageId] });
      toast.success('Season removed');
      setDeleting(null);
    } catch (err) {
      toast.error(errorMessage(err, 'We could not remove that season.'));
    } finally {
      setBusy(false);
    }
  };

  const basePrice = listing.data?.pricePerNight ?? 0;
  const ordered = [...(seasons.data ?? [])].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );

  return (
    <Screen scroll refreshing={seasons.isRefetching} onRefresh={() => void seasons.refetch()}>
      <Header
        title="Seasonal pricing"
        subtitle={listing.data?.name ?? undefined}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(host)/calendar'))}
      />

      <View style={styles.body}>
        <Notice
          tone="info"
          icon="pricetags-outline"
          title={`Standard rate ${pkr(basePrice)} a night`}
          message="Any night not covered by a season below is charged at your standard rate."
        />

        <Button label="Add a season" size="lg" fullWidth icon="add" onPress={() => openEditor()} />

        {seasons.isLoading ? (
          <CardSkeleton count={2} />
        ) : seasons.isError ? (
          <ErrorState message="We could not load your seasons." onRetry={() => void seasons.refetch()} />
        ) : ordered.length ? (
          ordered.map((season) => {
            const higher = season.pricePerNight > basePrice;
            return (
              <Card key={season.id} padded={false}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${season.name ?? 'season'}`}
                  onPress={() => openEditor(season)}
                  style={({ pressed }) => [styles.cardInner, pressed && { opacity: 0.9 }]}
                >
                <View style={styles.top}>
                  <View style={styles.flex}>
                    <Text variant="bodyStrong">{season.name ?? 'Season'}</Text>
                    <Text variant="small" tone="muted">
                      {formatShortDate(season.startDate)} → {formatShortDate(season.endDate)}
                    </Text>
                  </View>
                  <Badge
                    label={season.isActive ? 'Active' : 'Off'}
                    tone={season.isActive ? 'success' : 'neutral'}
                  />
                </View>

                <Divider />

                <Row
                  label="Rate per night"
                  value={pkr(season.pricePerNight)}
                  strong
                  tone={higher ? 'success' : 'default'}
                />
                {basePrice ? (
                  <Row
                    label="Against standard"
                    value={`${higher ? '+' : ''}${Math.round(
                      ((season.pricePerNight - basePrice) / basePrice) * 100,
                    )}%`}
                    tone={higher ? 'success' : 'danger'}
                  />
                ) : null}
                {season.minNights ? (
                  <Row label="Minimum stay" value={plural(season.minNights, 'night')} />
                ) : null}
                </Pressable>

                <Button
                  label="Remove"
                  variant="ghost"
                  size="sm"
                  style={styles.removeButton}
                  onPress={() => setDeleting(season)}
                />
              </Card>
            );
          })
        ) : (
          <EmptyState
            icon="pricetags-outline"
            title="No seasons set"
            message="Every night is charged at your standard rate. Add a season to charge more over Eid, or less in the quiet months."
          />
        )}
      </View>

      {/* ── editor ──────────────────────────────────────────────────────── */}
      <Sheet
        visible={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? 'Edit season' : 'Add a season'}
        footer={
          <Button
            label={range.start && range.end && rate ? 'Save season' : 'Pick dates and a rate'}
            size="lg"
            fullWidth
            disabled={!range.start || !range.end || !rate}
            loading={busy}
            onPress={() => void save()}
          />
        }
      >
        <Input
          label="Name it"
          icon="bookmark-outline"
          placeholder="Eid week, Summer peak, Winter quiet…"
          value={name}
          onChangeText={setName}
          autoCapitalize="sentences"
        />

        <Text variant="smallStrong" tone="secondary">
          Which dates?
        </Text>
        <Calendar range={range} onChange={setRange} />
        {range.start ? (
          <Text variant="small" tone="secondary" center>
            {range.end
              ? `${formatShortDate(range.start)} → ${formatShortDate(range.end)}`
              : 'Now pick the last night of the season'}
          </Text>
        ) : null}

        <Divider />

        <Input
          label="Rate per night"
          icon="cash-outline"
          placeholder={String(basePrice || 0)}
          value={rate}
          onChangeText={setRate}
          keyboardType="number-pad"
          hint={rate ? `Guests pay ${pkr(Number(rate))} a night` : `Standard is ${pkr(basePrice)}`}
        />
        <Input
          label="Minimum stay"
          icon="moon-outline"
          placeholder="Optional"
          value={minNights}
          onChangeText={setMinNights}
          keyboardType="number-pad"
          hint="Useful over holidays, when one-night bookings block a whole week."
        />
      </Sheet>

      <ConfirmSheet
        visible={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => void remove()}
        title="Remove this season?"
        message="Those nights go back to your standard rate. Bookings already made keep the price they were made at."
        confirmLabel="Remove"
        destructive
        loading={busy}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  cardInner: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  removeButton: { alignSelf: 'flex-start', marginLeft: spacing.md, marginBottom: spacing.sm },
});
