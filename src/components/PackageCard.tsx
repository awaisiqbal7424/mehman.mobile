import { Ionicons } from './ui/LucideIcon';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { Pressable, Share, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { availabilityApi } from '../api/services';
import { PLACEHOLDER_IMAGE, WEBSITE_URL } from '../constants';
import { useAuth } from '../store/auth';
import { useWishlist } from '../store/wishlist';
import { colors, radius, shadow, spacing } from '../theme';
import type { ProviderPackage } from '../types';
import { pkr } from '../utils/format';
import {
  durationLabel, isSlotBased, nextTourSlot, packageImages, packagePrice, priceUnit, typeLabel,
} from '../utils/packages';
import { Avatar, Badge, Divider, Rating, Text, useToast } from './ui';

/** Width of a card in a horizontal rail. Sized so the next card peeks. */
export const RAIL_CARD_WIDTH = 268;

export interface PackageCardProps {
  item: ProviderPackage;
  /** `rail` is the fixed-width horizontal variant; `full` fills its column. */
  layout?: 'rail' | 'full';
  style?: StyleProp<ViewStyle>;
}

/**
 * A listing, as it appears everywhere a listing appears.
 *
 * The price line always states its unit ("per night", "per person"): the same
 * card carries tours priced per seat and stays priced per night, and a bare
 * number next to two different things is how people end up surprised at
 * checkout.
 */
export function PackageCard({ item, layout = 'full', style }: PackageCardProps) {
  const router = useRouter();
  const toast = useToast();
  const user = useAuth((s) => s.user);
  const saved = useWishlist((s) => Boolean(s.entries[item.id]));
  const toggle = useWishlist((s) => s.toggle);

  const image = packageImages(item)[0] ?? PLACEHOLDER_IMAGE;
  const price = packagePrice(item);
  const duration = durationLabel(item);
  const location = item.provider?.city ?? item.startLocation ?? item.meetingPoint ?? '';

  const tour = isSlotBased(item.packageType);
  const slots = useQuery({
    queryKey: ['tour-slots', item.id],
    queryFn: () => availabilityApi.tourSlots(item.id),
    enabled: tour,
    staleTime: 5 * 60_000,
  });
  const slot = nextTourSlot(slots.data);
  const totalSpots = slot?.totalSpots;
  const bookedSpots = slot?.bookedSpots ?? 0;
  const availableSpots = slot?.availableSpots;
  const soldOut = availableSpots != null && availableSpots <= 0;

  const onHeart = useCallback(async () => {
    if (!user) {
      toast.info('Sign in to save listings');
      router.push('/sign-in');
      return;
    }
    try {
      const nowSaved = await toggle(user.id, item.id, item.providerId);
      toast.success(nowSaved ? 'Saved to your list' : 'Removed from your list');
    } catch (error) {
      toast.error((error as Error).message);
    }
  }, [item.id, item.providerId, router, toast, toggle, user]);

  const onShare = useCallback(async () => {
    const url = `${WEBSITE_URL}/package/${item.id}`;
    try {
      // `url` is only honoured on iOS — Android's share sheet reads `message`
      // alone, so the link has to live in the text either way.
      await Share.share({ message: `${item.name ?? 'A listing on Mehman'} — ${url}`, url });
    } catch {
      /* the share sheet was dismissed — nothing to recover from */
    }
  }, [item.id, item.name]);

  return (
    <View style={[styles.card, layout === 'rail' ? styles.rail : styles.full, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.name ?? 'Listing'}, ${pkr(price)} ${priceUnit(item.packageType)}`}
        onPress={() => router.push(`/package/${item.id}`)}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: image }}
            style={styles.image}
            contentFit="cover"
            transition={220}
            // A recognisable blur while the photo streams in beats a grey box.
            placeholder={{ blurhash: 'L6Ps#-00%M~q00%M-;IU00xu?bof' }}
          />

          <View style={styles.typeBadge}>
            <Badge label={typeLabel(item.packageType)} tone="neutral" />
          </View>
        </View>

        <View style={styles.body}>
          <Text variant="bodyStrong" numberOfLines={2}>
            {item.name ?? 'Untitled listing'}
          </Text>

          {location || duration ? (
            <View style={styles.metaRow}>
              {duration ? (
                <View style={styles.meta}>
                  <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                  <Text variant="small" tone="muted">
                    {duration}
                  </Text>
                </View>
              ) : null}
              {location ? (
                <View style={styles.meta}>
                  <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                  <Text variant="small" tone="muted" numberOfLines={1}>
                    {location}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {tour && totalSpots ? (
            <View style={styles.spots}>
              <Ionicons name="people-outline" size={12} color={colors.textMuted} />
              {soldOut ? (
                <Text variant="caption" tone="danger">
                  Sold out
                </Text>
              ) : (
                <Text variant="caption" tone="muted">
                  <Text variant="caption" tone="primary">
                    {bookedSpots}
                  </Text>
                  {`/${totalSpots} Booked`}
                </Text>
              )}
              <View style={styles.spotsTrack}>
                <View
                  style={[
                    styles.spotsFill,
                    { width: `${Math.min(100, (bookedSpots / totalSpots) * 100)}%` },
                    soldOut && styles.spotsFillFull,
                  ]}
                />
              </View>
            </View>
          ) : null}

          {item.provider ? (
            <>
              <Divider style={styles.divider} />
              <View style={styles.footerRow}>
                <Avatar uri={item.provider.logoUrl} name={item.provider.name} size={22} />
                <Text variant="small" tone="secondary" numberOfLines={1} style={styles.flex}>
                  {item.provider.name ?? 'Host'}
                </Text>
                {item.provider.isApproved ? (
                  <Ionicons name="checkmark-circle" size={13} color={colors.success} />
                ) : null}
                <Rating value={item.provider?.rating} compact />
              </View>
            </>
          ) : null}

          <View style={styles.priceRow}>
            <View style={styles.priceGroup}>
              <Text variant="subheading" numberOfLines={1}>
                {pkr(price)}
              </Text>
              <Text variant="small" tone="muted" numberOfLines={1}>
                {priceUnit(item.packageType)}
              </Text>
            </View>
            {item.isInstantBook ? (
              <View style={styles.instant}>
                <Ionicons name="flash" size={11} color={colors.primary} />
                <Text variant="caption" tone="primary">
                  Instant
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>

      {/* Siblings of the card's press target, not children: a control nested
          inside another control is unreachable to a screen reader, and on web
          it is invalid markup. */}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share this listing"
          hitSlop={10}
          onPress={() => void onShare()}
          style={({ pressed }) => [styles.actionButton, pressed && { transform: [{ scale: 0.88 }] }]}
        >
          <Ionicons name="share-outline" size={17} color={colors.text} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Remove from saved' : 'Save this listing'}
          accessibilityState={{ selected: saved }}
          hitSlop={10}
          onPress={onHeart}
          style={({ pressed }) => [styles.actionButton, pressed && { transform: [{ scale: 0.88 }] }]}
        >
          <Ionicons
            name={saved ? 'heart' : 'heart-outline'}
            size={19}
            color={saved ? colors.primary : colors.text}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  rail: { width: RAIL_CARD_WIDTH },
  full: { width: '100%' },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },

  imageWrap: { position: 'relative' },
  image: { width: '100%', aspectRatio: 16 / 10, backgroundColor: colors.surfaceMuted },

  actions: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: { position: 'absolute', left: spacing.md, bottom: spacing.md },

  body: { padding: spacing.md, gap: spacing.xs },
  flex: { flex: 1 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1 },

  // The "Sold out"/"booked" capacity readout — a self-contained chip that
  // hugs its own content, matching the fraction-and-bar pill on the website
  // rather than stretching a bare row across the card.
  spots: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    marginTop: 2,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  spotsTrack: {
    width: 44,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  spotsFill: { height: '100%', borderRadius: radius.full, backgroundColor: colors.primary },
  spotsFillFull: { backgroundColor: colors.danger },

  divider: { marginVertical: spacing.xs },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: spacing.xs,
    rowGap: 4,
    marginTop: 2,
  },
  // Own row: price and unit must shrink and truncate together rather than
  // splitting across lines, but can cede space to the Instant badge.
  priceGroup: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, flexShrink: 1 },
  instant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 'auto',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
});

export default PackageCard;
