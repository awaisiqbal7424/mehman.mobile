import { Ionicons } from '../../src/components/ui/LucideIcon';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { messageApi, packageApi, providerApi, reviewApi } from '../../src/api/services';
import { PackageCard } from '../../src/components/PackageCard';
import {
  Avatar, Badge, Button, Card, CardSkeleton, Divider, ErrorState, IconButton, Loading,
  Rating, Row, Screen, Text, useToast,
} from '../../src/components/ui';
import { PLACEHOLDER_IMAGE } from '../../src/constants';
import { useAuth } from '../../src/store/auth';
import { colors, radius, spacing } from '../../src/theme';
import { formatShortDate } from '../../src/utils/format';
import { parseJsonArray } from '../../src/utils/packages';

/**
 * A host's page: who they are, what they run, what guests said.
 *
 * The listings come first, under the identity block. Someone who has tapped
 * through to a host is usually looking for "what else do they do?", not a
 * corporate profile.
 */
export default function ProviderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const user = useAuth((s) => s.user);

  const provider = useQuery({
    queryKey: ['provider', id],
    queryFn: () => providerApi.getById(id),
    enabled: Boolean(id),
  });

  const listings = useQuery({
    queryKey: ['provider-packages', id],
    queryFn: () => packageApi.getAll({ providerId: id, isActive: true }),
    enabled: Boolean(id),
  });

  const reviews = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => reviewApi.forProvider(id),
    enabled: Boolean(id),
  });

  /**
   * Chat is the only contact route offered here — direct phone/email are not
   * shown before a booking exists, so nobody has a reason to arrange a trip
   * outside the platform.
   */
  const onMessageHost = useCallback(async () => {
    if (!user) {
      router.push(`/sign-in?redirect=/provider/${id}`);
      return;
    }
    const hostId = provider.data?.providerOwnerId;
    if (!id || !hostId) {
      toast.error('This host cannot be messaged just yet.');
      return;
    }
    try {
      const conversation = await messageApi.openWithProvider(user.id, hostId, id);
      router.push(`/chat/${conversation.id}`);
    } catch {
      toast.error('We could not open that conversation.');
    }
  }, [id, provider.data?.providerOwnerId, router, toast, user]);

  if (provider.isLoading) return <Loading label="Loading this host…" />;
  if (provider.isError || !provider.data) {
    return <ErrorState message="We could not load this host." onRetry={() => void provider.refetch()} />;
  }

  const host = provider.data;
  const cover = parseJsonArray<string>(host.subImagesJson)[0] ?? host.logoUrl ?? PLACEHOLDER_IMAGE;
  const tags = parseJsonArray<string>(host.tagsJson);
  const certificates = parseJsonArray<string>(host.providerCertificatesJson);
  // Guides and vehicles are not offered on any browse surface yet (see
  // SEARCH_TABS) — a host's public page should not be the one place they
  // still slip through.
  const liveListings = listings.data?.filter((p) => p.packageType === 'TOUR' || p.packageType === 'STAY');

  return (
    <Screen scroll edges="none" refreshing={provider.isRefetching} onRefresh={() => void provider.refetch()}>
      {/* ── cover ───────────────────────────────────────────────────────── */}
      <View style={styles.cover}>
        <Image source={{ uri: cover }} style={styles.coverImage} contentFit="cover" transition={250} />
        <View style={styles.coverScrim} />
        <View style={[styles.coverControls, { top: insets.top + spacing.sm }]}>
          <IconButton
            icon="chevron-back"
            accessibilityLabel="Go back"
            background="rgba(255,255,255,0.94)"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(guest)'))}
          />
        </View>
      </View>

      {/* ── identity ────────────────────────────────────────────────────── */}
      <View style={styles.body}>
        <Card style={styles.identityCard}>
          <View style={styles.identity}>
            <Avatar uri={host.logoUrl} name={host.name} size={64} />
            <View style={styles.flex}>
              <View style={styles.nameRow}>
                <Text variant="heading" numberOfLines={2} style={styles.flex}>
                  {host.name ?? 'Host'}
                </Text>
                {host.isApproved ? (
                  <Ionicons name="checkmark-circle" size={19} color={colors.success} />
                ) : null}
              </View>
              <Text variant="small" tone="muted">
                {host.isTourOperator ? 'Tour operator' : 'Host'}
                {host.city ? ` · ${host.city}` : ''}
              </Text>
              <Rating value={host.rating} count={reviews.data?.length} />
            </View>
          </View>

          {tags.length ? (
            <View style={styles.tags}>
              {tags.slice(0, 6).map((tag, index) => (
                <Badge key={`${tag}-${index}`} label={tag} tone="neutral" />
              ))}
            </View>
          ) : null}

          {host.description ? (
            <Text variant="body" tone="secondary" style={styles.description}>
              {host.description}
            </Text>
          ) : null}

          {/* Chat is the only contact route shown here — the host's phone
              number and email stay private until a booking exists. */}
          <Button
            label="Chat with them"
            variant="outline"
            icon="chatbubble-ellipses-outline"
            fullWidth
            onPress={() => void onMessageHost()}
          />
        </Card>

        {/* ── listings ──────────────────────────────────────────────────── */}
        <View style={styles.block}>
          <Text variant="heading">Listings</Text>
          {listings.isLoading ? (
            <CardSkeleton count={2} />
          ) : liveListings?.length ? (
            <View style={styles.listings}>
              {liveListings.map((item) => (
                <PackageCard key={item.id} item={item} />
              ))}
            </View>
          ) : (
            <Text variant="small" tone="muted">
              This host has nothing published right now.
            </Text>
          )}
        </View>

        {/* ── the business ──────────────────────────────────────────────── */}
        <Card style={styles.block}>
          <Text variant="heading" style={styles.blockTitle}>
            About the business
          </Text>
          {host.address || host.streetAddress ? (
            <Row label="Address" value={host.address ?? host.streetAddress} icon="location-outline" />
          ) : null}
          {host.city ? <Row label="City" value={host.city} icon="business-outline" /> : null}
          {host.licenseNumber ? (
            <Row label="Licence" value={host.licenseNumber} icon="ribbon-outline" />
          ) : null}
          {host.openTime && host.closeTime ? (
            <Row label="Hours" value={`${host.openTime} – ${host.closeTime}`} icon="time-outline" />
          ) : null}
          {certificates.length ? (
            <>
              <Divider />
              <Text variant="caption" tone="muted">
                CERTIFICATIONS
              </Text>
              {certificates.map((certificate, index) => (
                <View key={`${certificate}-${index}`} style={styles.certificate}>
                  <Ionicons name="ribbon-outline" size={15} color={colors.success} />
                  <Text variant="small" tone="secondary">
                    {certificate}
                  </Text>
                </View>
              ))}
            </>
          ) : null}
        </Card>

        {/* ── reviews ───────────────────────────────────────────────────── */}
        <View style={styles.block}>
          <Text variant="heading">Reviews {reviews.data?.length ? `(${reviews.data.length})` : ''}</Text>
          {reviews.isLoading ? (
            <Text variant="small" tone="muted">
              Loading reviews…
            </Text>
          ) : reviews.data?.length ? (
            reviews.data.map((review) => (
              <Card key={review.id} style={styles.review}>
                <View style={styles.reviewHead}>
                  <Avatar name={review.customerFullName ?? 'Guest'} size={36} />
                  <View style={styles.flex}>
                    <Text variant="smallStrong">{review.customerFullName ?? 'A guest'}</Text>
                    <Text variant="small" tone="muted">
                      {formatShortDate(review.reviewDate)}
                    </Text>
                  </View>
                  <Rating value={review.rating} compact />
                </View>
                {review.comment ? (
                  <Text variant="body" tone="secondary" style={styles.reviewComment}>
                    {review.comment}
                  </Text>
                ) : null}
                {review.hostResponse ? (
                  <View style={styles.hostResponse}>
                    <Text variant="caption" tone="muted">
                      RESPONSE FROM {(host.name ?? 'THE HOST').toUpperCase()}
                    </Text>
                    <Text variant="small" tone="secondary">
                      {review.hostResponse}
                    </Text>
                  </View>
                ) : null}
              </Card>
            ))
          ) : (
            <Text variant="small" tone="muted">
              No reviews yet.
            </Text>
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  cover: { height: 220, backgroundColor: colors.surfaceMuted },
  coverImage: { width: '100%', height: '100%' },
  coverScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(28,25,23,0.2)',
  },
  coverControls: { position: 'absolute', left: spacing.lg },

  body: { paddingHorizontal: spacing.lg, gap: spacing.xl, marginTop: -spacing['3xl'] },
  identityCard: { gap: spacing.lg },
  identity: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  description: { marginTop: -spacing.xs },

  block: { gap: spacing.md },
  blockTitle: { marginBottom: spacing.xs },
  listings: { gap: spacing.lg },

  certificate: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  review: { gap: spacing.sm },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  reviewComment: { marginTop: spacing.xs },
  hostResponse: {
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    borderRadius: radius.md,
    gap: 2,
    marginTop: spacing.xs,
  },
});
