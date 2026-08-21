import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { errorMessage } from '../../src/api/client';
import { packageApi } from '../../src/api/services';
import {
  Badge, Button, Card, CardSkeleton, ConfirmSheet, Divider, EmptyState, ErrorState,
  PageHeading, Screen, Sheet, SheetOption, Text, useToast,
} from '../../src/components/ui';
import { PLACEHOLDER_IMAGE } from '../../src/constants';
import { useAuth } from '../../src/store/auth';
import { colors, radius, spacing } from '../../src/theme';
import type { ProviderPackage } from '../../src/types';
import { pkr } from '../../src/utils/format';
import { durationLabel, packageImages, packagePrice, priceUnit, typeLabel } from '../../src/utils/packages';

/**
 * The host's listings.
 *
 * Publishing and unpublishing is the action a host reaches for most — far more
 * often than editing — so it lives on the card itself rather than three taps
 * deep. Deleting is behind a confirmation, since a listing carries its bookings
 * and its reviews with it.
 */
export default function HostListingsScreen() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const provider = useAuth((s) => s.provider);

  const [menuFor, setMenuFor] = useState<ProviderPackage | null>(null);
  const [deleting, setDeleting] = useState<ProviderPackage | null>(null);
  const [busy, setBusy] = useState(false);

  const listings = useQuery({
    queryKey: ['host-listings', provider?.id],
    queryFn: () => packageApi.getAll({ providerId: provider!.id }),
    enabled: Boolean(provider),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['host-listings'] });

  const togglePublished = async (listing: ProviderPackage) => {
    setBusy(true);
    try {
      await packageApi.update(listing.id, { ...listing, isActive: !listing.isActive });
      await refresh();
      toast.success(listing.isActive ? 'Listing hidden from guests' : 'Listing is live');
      setMenuFor(null);
    } catch (err) {
      toast.error(errorMessage(err, 'We could not update that listing.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await packageApi.remove(deleting.id);
      await refresh();
      toast.success('Listing deleted');
      setDeleting(null);
      setMenuFor(null);
    } catch (err) {
      toast.error(errorMessage(err, 'We could not delete that listing.'));
    } finally {
      setBusy(false);
    }
  };

  const items = listings.data ?? [];
  const live = items.filter((item) => item.isActive).length;

  return (
    <Screen scroll refreshing={listings.isRefetching} onRefresh={() => void listings.refetch()}>
      <PageHeading
        title="Listings"
        subtitle={items.length ? `${live} of ${items.length} live` : undefined}
      />

      <View style={styles.body}>
        <Button
          label="Create a listing"
          size="lg"
          fullWidth
          icon="add"
          onPress={() => router.push('/host/listing/new')}
        />

        {listings.isLoading ? (
          <CardSkeleton count={2} />
        ) : listings.isError ? (
          <ErrorState message="We could not load your listings." onRetry={() => void listings.refetch()} />
        ) : items.length ? (
          items.map((listing) => (
            <Card key={listing.id} padded={false}>
              {/* The row and the overflow button are siblings: a control inside
                  another control cannot be reached on its own. */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Edit ${listing.name ?? 'listing'}`}
                onPress={() => router.push(`/host/listing/${listing.id}`)}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
              >
                <Image
                  source={{ uri: packageImages(listing)[0] ?? PLACEHOLDER_IMAGE }}
                  style={styles.thumb}
                  contentFit="cover"
                  transition={200}
                />
                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <Text variant="caption" tone="primary">
                      {typeLabel(listing.packageType).toUpperCase()}
                    </Text>
                    <Badge
                      label={listing.isActive ? 'Live' : 'Hidden'}
                      tone={listing.isActive ? 'success' : 'neutral'}
                    />
                  </View>

                  <Text variant="bodyStrong" numberOfLines={2}>
                    {listing.name ?? 'Untitled listing'}
                  </Text>

                  <View style={styles.rowMeta}>
                    <Text variant="smallStrong">{pkr(packagePrice(listing))}</Text>
                    <Text variant="small" tone="muted">
                      {priceUnit(listing.packageType)}
                    </Text>
                    {durationLabel(listing) ? (
                      <Text variant="small" tone="muted">
                        · {durationLabel(listing)}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.menuSpacer} />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`More options for ${listing.name ?? 'this listing'}`}
                hitSlop={10}
                onPress={() => setMenuFor(listing)}
                style={styles.menuButton}
              >
                <Ionicons name="ellipsis-vertical" size={18} color={colors.textMuted} />
              </Pressable>
            </Card>
          ))
        ) : (
          <EmptyState
            icon="albums-outline"
            title="Nothing listed yet"
            message="Publish your first tour or stay and guests can start booking it."
            actionLabel="Create a listing"
            onAction={() => router.push('/host/listing/new')}
          />
        )}
      </View>

      {/* ── per-listing actions ─────────────────────────────────────────── */}
      <Sheet
        visible={Boolean(menuFor)}
        onClose={() => setMenuFor(null)}
        title={menuFor?.name ?? 'Listing'}
        scroll={false}
      >
        <SheetOption
          label={menuFor?.isActive ? 'Hide from guests' : 'Publish'}
          description={
            menuFor?.isActive
              ? 'It stays in your account but nobody can find or book it.'
              : 'Make it visible and bookable straight away.'
          }
          onPress={() => menuFor && void togglePublished(menuFor)}
        />
        <SheetOption
          label="Edit details"
          description="Photos, price, description, what is included."
          onPress={() => {
            const id = menuFor?.id;
            setMenuFor(null);
            if (id) router.push(`/host/listing/${id}`);
          }}
        />
        <SheetOption
          label="Manage dates"
          description="Open departures, or close nights you are not free."
          onPress={() => {
            setMenuFor(null);
            router.push('/(host)/calendar');
          }}
        />
        <Divider />
        <Pressable
          accessibilityRole="button"
          onPress={() => setDeleting(menuFor)}
          style={({ pressed }) => [styles.deleteRow, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
          <Text variant="bodyStrong" tone="danger">
            Delete this listing
          </Text>
        </Pressable>
      </Sheet>

      <ConfirmSheet
        visible={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => void remove()}
        title="Delete this listing?"
        message="This cannot be undone, and it takes the listing's reviews with it. If you only want to stop taking bookings, hide it instead."
        confirmLabel="Delete"
        destructive
        loading={busy}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.lg, gap: spacing.md },

  row: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, alignItems: 'flex-start' },
  thumb: { width: 88, height: 100, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  rowBody: { flex: 1, gap: 3 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  rowMeta: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginTop: spacing.xs, flexWrap: 'wrap' },
  menuSpacer: { width: 26 },
  menuButton: { position: 'absolute', top: spacing.md, right: spacing.sm, padding: spacing.xs },

  deleteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
});
