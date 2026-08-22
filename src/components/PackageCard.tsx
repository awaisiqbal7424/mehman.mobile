import { Ionicons } from './ui/LucideIcon';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { PLACEHOLDER_IMAGE } from '../constants';
import { useAuth } from '../store/auth';
import { useWishlist } from '../store/wishlist';
import { colors, radius, shadow, spacing } from '../theme';
import type { ProviderPackage } from '../types';
import { pkr } from '../utils/format';
import { durationLabel, packageImages, packagePrice, priceUnit, typeLabel } from '../utils/packages';
import { Badge, Rating, Text, useToast } from './ui';

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
          <View style={styles.titleRow}>
            <Text variant="bodyStrong" numberOfLines={1} style={styles.title}>
              {item.name ?? 'Untitled listing'}
            </Text>
            <Rating value={item.provider?.rating} compact />
          </View>

          {location || duration ? (
            <View style={styles.metaRow}>
              {location ? (
                <View style={styles.meta}>
                  <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                  <Text variant="small" tone="muted" numberOfLines={1}>
                    {location}
                  </Text>
                </View>
              ) : null}
              {duration ? (
                <View style={styles.meta}>
                  <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                  <Text variant="small" tone="muted">
                    {duration}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.priceRow}>
            <Text variant="subheading">{pkr(price)}</Text>
            <Text variant="small" tone="muted">
              {priceUnit(item.packageType)}
            </Text>
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

      {/* Sibling of the card's press target, not a child: a control nested
          inside another control is unreachable to a screen reader, and on web
          it is invalid markup. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={saved ? 'Remove from saved' : 'Save this listing'}
        accessibilityState={{ selected: saved }}
        hitSlop={10}
        onPress={onHeart}
        style={({ pressed }) => [styles.heart, pressed && { transform: [{ scale: 0.88 }] }]}
      >
        <Ionicons
          name={saved ? 'heart' : 'heart-outline'}
          size={19}
          color={saved ? colors.primary : colors.text}
        />
      </Pressable>
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
    ...shadow.sm,
  },
  rail: { width: RAIL_CARD_WIDTH },
  full: { width: '100%' },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },

  imageWrap: { position: 'relative' },
  image: { width: '100%', aspectRatio: 16 / 10, backgroundColor: colors.surfaceMuted },

  heart: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: { position: 'absolute', left: spacing.md, bottom: spacing.md },

  body: { padding: spacing.md, gap: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1 },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginTop: 2 },
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
