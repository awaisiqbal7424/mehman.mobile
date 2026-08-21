import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { availabilityApi, messageApi, packageApi, reviewApi } from '../../src/api/services';
import { Calendar, type DateRange } from '../../src/components/Calendar';
import {
  Avatar, Badge, Button, Card, Divider, EmptyState, ErrorState, FooterBar, IconButton,
  Loading, Rating, Row, Screen, Sheet, Stepper, Text, useToast,
} from '../../src/components/ui';
import { PLACEHOLDER_IMAGE, serviceFeeFor, SERVICE_FEE_LABEL } from '../../src/constants';
import { useAuth } from '../../src/store/auth';
import { useWishlist } from '../../src/store/wishlist';
import { colors, radius, spacing } from '../../src/theme';
import type { PackageAvailability } from '../../src/types';
import { formatTravelDate, nightsBetween, pkr, plural, toApiDate } from '../../src/utils/format';
import {
  durationLabel, isSlotBased, packageImages, packagePrice, parseJsonArray, priceUnit, typeLabel,
} from '../../src/utils/packages';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 320;

/**
 * A listing in full.
 *
 * The screen is one long scroll with a pinned price bar, because the two
 * questions a traveller has — "what is this?" and "can I have it on my dates?"
 * — want different amounts of attention. The scroll answers the first at
 * whatever depth they care about; the bar keeps the second one tap away
 * throughout.
 */
export default function PackageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const user = useAuth((s) => s.user);
  const saved = useWishlist((s) => Boolean(id && s.entries[id]));
  const toggleSaved = useWishlist((s) => s.toggle);

  const [heroIndex, setHeroIndex] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [guests, setGuests] = useState(1);
  const [range, setRange] = useState<DateRange>({ start: null, end: null });
  const [slot, setSlot] = useState<PackageAvailability | null>(null);

  const pkg = useQuery({
    queryKey: ['package', id],
    queryFn: () => packageApi.getById(id),
    enabled: Boolean(id),
  });

  const slotBased = isSlotBased(pkg.data?.packageType);

  const slots = useQuery({
    queryKey: ['tour-slots', id],
    queryFn: () => availabilityApi.tourSlots(id),
    enabled: Boolean(id) && slotBased,
  });

  const availability = useQuery({
    queryKey: ['availability', id],
    queryFn: () => availabilityApi.forPackage(id),
    enabled: Boolean(id) && !slotBased && pkg.isSuccess,
  });

  const reviews = useQuery({
    queryKey: ['reviews', pkg.data?.providerId],
    queryFn: () => reviewApi.forProvider(pkg.data!.providerId!),
    enabled: Boolean(pkg.data?.providerId),
  });

  /** Nights the host has closed, as API date strings. */
  const blockedDates = useMemo(() => {
    const closed = new Set<string>();
    availability.data?.forEach((entry) => {
      if (entry.isAvailable === false || entry.availabilityType === 'STAY_BLOCKED') {
        closed.add(entry.date.slice(0, 10));
      }
    });
    return closed;
  }, [availability.data]);

  const images = useMemo(() => {
    const found = packageImages(pkg.data);
    return found.length ? found : [PLACEHOLDER_IMAGE];
  }, [pkg.data]);

  const price = pkg.data ? packagePrice(pkg.data) : 0;
  const nights = nightsBetween(range.start, range.end);

  /** What the guest will actually be charged, fee included. */
  const quote = useMemo(() => {
    const units = slotBased ? guests : nights * 1;
    const subtotal = slotBased ? price * guests : price * nights;
    const fee = serviceFeeFor(subtotal);
    return { units, subtotal, fee, total: subtotal + fee };
  }, [guests, nights, price, slotBased]);

  const readyToBook = slotBased ? Boolean(slot) : nights > 0;

  const onHeart = useCallback(async () => {
    if (!user) {
      toast.info('Sign in to save listings');
      router.push(`/sign-in?redirect=/package/${id}`);
      return;
    }
    try {
      const nowSaved = await toggleSaved(user.id, id, pkg.data?.providerId);
      toast.success(nowSaved ? 'Saved to your list' : 'Removed from your list');
    } catch (error) {
      toast.error((error as Error).message);
    }
  }, [id, pkg.data?.providerId, router, toast, toggleSaved, user]);

  const onMessageHost = useCallback(async () => {
    if (!user) {
      router.push(`/sign-in?redirect=/package/${id}`);
      return;
    }
    const providerId = pkg.data?.providerId;
    const hostId = pkg.data?.provider?.providerOwnerId ?? pkg.data?.providerOwnerId;
    if (!providerId || !hostId) {
      toast.error('This host cannot be messaged just yet.');
      return;
    }
    try {
      const conversation = await messageApi.openWithProvider(user.id, hostId, providerId);
      router.push(`/chat/${conversation.id}`);
    } catch {
      toast.error('We could not open that conversation.');
    }
  }, [id, pkg.data, router, toast, user]);

  const onContinue = useCallback(() => {
    if (!user) {
      setBookingOpen(false);
      router.push(`/sign-in?redirect=/package/${id}`);
      return;
    }
    setBookingOpen(false);
    router.push({
      pathname: '/checkout',
      params: {
        packageId: id,
        guests: String(guests),
        ...(slotBased
          ? { availabilityId: slot!.id, departureDate: slot!.date }
          : { checkIn: toApiDate(range.start!), checkOut: toApiDate(range.end!) }),
      },
    });
  }, [guests, id, range.end, range.start, router, slot, slotBased, user]);

  if (pkg.isLoading) return <Loading label="Loading this listing…" />;
  if (pkg.isError || !pkg.data) {
    return <ErrorState message="We could not load this listing." onRetry={() => void pkg.refetch()} />;
  }

  const item = pkg.data;
  const highlights = parseJsonArray<string>(item.tourHighlightsJson);
  const includes = parseJsonArray<string>(item.packageIncludesJson);
  const excludes = parseJsonArray<string>(item.packageExcludesJson);
  const amenities = parseJsonArray<string>(item.amenitiesJson);
  const itinerary = parseJsonArray<{ day?: number; title?: string; description?: string }>(item.itineraryJson);

  return (
    <View style={styles.root}>
      <Screen
        scroll
        edges="none"
        footer={
          <FooterBar>
            <View style={styles.bar}>
              <View style={styles.barPrice}>
                <Text variant="heading">{pkr(price)}</Text>
                <Text variant="small" tone="muted">
                  {priceUnit(item.packageType)}
                </Text>
              </View>
              <Button
                label={slotBased ? 'Choose a date' : 'Check dates'}
                size="lg"
                icon="calendar-outline"
                onPress={() => setBookingOpen(true)}
                style={styles.barButton}
              />
            </View>
          </FooterBar>
        }
      >
        {/* ── gallery ─────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setHeroIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))
            }
          >
            {images.map((uri, index) => (
              <Image
                key={`${uri}-${index}`}
                source={{ uri }}
                style={styles.heroImage}
                contentFit="cover"
                transition={250}
              />
            ))}
          </ScrollView>

          <View style={[styles.heroControls, { top: insets.top + spacing.sm }]}>
            <IconButton
              icon="chevron-back"
              accessibilityLabel="Go back"
              background="rgba(255,255,255,0.94)"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(guest)'))}
            />
            <IconButton
              icon={saved ? 'heart' : 'heart-outline'}
              accessibilityLabel={saved ? 'Remove from saved' : 'Save this listing'}
              color={saved ? colors.primary : colors.text}
              background="rgba(255,255,255,0.94)"
              onPress={onHeart}
            />
          </View>

          {images.length > 1 ? (
            <View style={styles.dots}>
              {images.map((uri, index) => (
                <View key={`${uri}-dot-${index}`} style={[styles.dot, index === heroIndex && styles.dotOn]} />
              ))}
            </View>
          ) : null}
        </View>

        {/* ── headline ────────────────────────────────────────────────── */}
        <View style={styles.body}>
          <View style={styles.badges}>
            <Badge label={typeLabel(item.packageType)} tone="primary" />
            {item.isInstantBook ? <Badge label="Instant book" tone="success" icon="flash" /> : null}
            {item.difficultyLevel ? <Badge label={item.difficultyLevel} tone="neutral" /> : null}
          </View>

          <Text variant="title" style={styles.title}>
            {item.name}
          </Text>

          <View style={styles.metaRow}>
            {item.provider?.city ? (
              <View style={styles.meta}>
                <Ionicons name="location-outline" size={15} color={colors.textMuted} />
                <Text variant="small" tone="secondary">
                  {item.provider.city}
                </Text>
              </View>
            ) : null}
            {durationLabel(item) ? (
              <View style={styles.meta}>
                <Ionicons name="time-outline" size={15} color={colors.textMuted} />
                <Text variant="small" tone="secondary">
                  {durationLabel(item)}
                </Text>
              </View>
            ) : null}
            {item.maxGuests || item.maxOccupancy ? (
              <View style={styles.meta}>
                <Ionicons name="people-outline" size={15} color={colors.textMuted} />
                <Text variant="small" tone="secondary">
                  Up to {item.maxGuests ?? item.maxOccupancy} guests
                </Text>
              </View>
            ) : null}
            <Rating value={item.provider?.rating} count={reviews.data?.length} />
          </View>

          {/* ── host ──────────────────────────────────────────────────── */}
          {item.provider ? (
            <Card style={styles.hostCard} onPress={() => router.push(`/provider/${item.providerId}`)}>
              <View style={styles.hostRow}>
                <Avatar uri={item.provider.logoUrl} name={item.provider.name} size={48} />
                <View style={styles.flex}>
                  <View style={styles.hostName}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {item.provider.name}
                    </Text>
                    {item.provider.isApproved ? (
                      <Ionicons name="checkmark-circle" size={15} color={colors.success} />
                    ) : null}
                  </View>
                  <Text variant="small" tone="muted" numberOfLines={1}>
                    {item.provider.isTourOperator ? 'Tour operator' : 'Host'}
                    {item.provider.city ? ` · ${item.provider.city}` : ''}
                  </Text>
                </View>
                <IconButton
                  icon="chatbubble-ellipses-outline"
                  accessibilityLabel="Message this host"
                  background={colors.primarySoft}
                  color={colors.primary}
                  onPress={onMessageHost}
                />
              </View>
            </Card>
          ) : null}

          {/* ── description ───────────────────────────────────────────── */}
          {item.description ? (
            <Block title="About this listing">
              <Text variant="body" tone="secondary">
                {item.description}
              </Text>
            </Block>
          ) : null}

          {highlights.length ? (
            <Block title="Highlights">
              {highlights.map((line, index) => (
                <BulletLine key={`${line}-${index}`} icon="sparkles-outline" text={line} />
              ))}
            </Block>
          ) : null}

          {itinerary.length ? (
            <Block title="Itinerary">
              {itinerary.map((day, index) => (
                <View key={`day-${index}`} style={styles.itineraryDay}>
                  <View style={styles.itineraryMarker}>
                    <Text variant="caption" tone="inverse">
                      {day.day ?? index + 1}
                    </Text>
                  </View>
                  <View style={styles.flex}>
                    <Text variant="bodyStrong">{day.title ?? `Day ${day.day ?? index + 1}`}</Text>
                    {day.description ? (
                      <Text variant="small" tone="secondary" style={styles.itineraryText}>
                        {day.description}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </Block>
          ) : null}

          {amenities.length ? (
            <Block title="What this place offers">
              <View style={styles.amenities}>
                {amenities.map((amenity, index) => (
                  <View key={`${amenity}-${index}`} style={styles.amenity}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                    <Text variant="small">{amenity}</Text>
                  </View>
                ))}
              </View>
            </Block>
          ) : null}

          {includes.length || excludes.length ? (
            <Block title="What's included">
              {includes.map((line, index) => (
                <BulletLine key={`inc-${index}`} icon="checkmark-circle" text={line} tone="success" />
              ))}
              {excludes.length ? (
                <>
                  <Divider />
                  <Text variant="smallStrong" tone="muted" style={styles.excludeHead}>
                    NOT INCLUDED
                  </Text>
                  {excludes.map((line, index) => (
                    <BulletLine key={`exc-${index}`} icon="close-circle" text={line} tone="danger" />
                  ))}
                </>
              ) : null}
            </Block>
          ) : null}

          {/* ── logistics ─────────────────────────────────────────────── */}
          {item.meetingPoint || item.startLocation || item.endLocation ? (
            <Block title="Getting there">
              {item.meetingPoint ? <Row label="Meeting point" value={item.meetingPoint} icon="flag-outline" /> : null}
              {item.startLocation ? <Row label="Starts" value={item.startLocation} icon="navigate-outline" /> : null}
              {item.endLocation ? <Row label="Ends" value={item.endLocation} icon="location-outline" /> : null}
            </Block>
          ) : null}

          {/* ── reviews ───────────────────────────────────────────────── */}
          <Block title={`Reviews${reviews.data?.length ? ` (${reviews.data.length})` : ''}`}>
            {reviews.isLoading ? (
              <Text variant="small" tone="muted">
                Loading reviews…
              </Text>
            ) : reviews.data?.length ? (
              reviews.data.slice(0, 4).map((review) => (
                <View key={review.id} style={styles.review}>
                  <View style={styles.reviewHead}>
                    <Avatar name={review.customerFullName ?? 'Guest'} size={34} />
                    <View style={styles.flex}>
                      <Text variant="smallStrong">{review.customerFullName ?? 'A guest'}</Text>
                      <Rating value={review.rating} size={12} compact />
                    </View>
                  </View>
                  {review.comment ? (
                    <Text variant="small" tone="secondary">
                      {review.comment}
                    </Text>
                  ) : null}
                  {review.hostResponse ? (
                    <View style={styles.hostResponse}>
                      <Text variant="caption" tone="muted">
                        HOST RESPONSE
                      </Text>
                      <Text variant="small" tone="secondary">
                        {review.hostResponse}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))
            ) : (
              <Text variant="small" tone="muted">
                No reviews yet. Be the first to stay and tell us how it went.
              </Text>
            )}
          </Block>

          {item.cancellationPolicy ? (
            <Block title="Cancellation policy">
              <Text variant="body" tone="secondary">
                {item.cancellationPolicy}
              </Text>
            </Block>
          ) : null}
        </View>
      </Screen>

      {/* ── booking sheet ─────────────────────────────────────────────── */}
      <Sheet
        visible={bookingOpen}
        onClose={() => setBookingOpen(false)}
        title={slotBased ? 'Pick a departure' : 'Choose your dates'}
        subtitle={item.name ?? undefined}
        footer={
          <View style={styles.sheetFooter}>
            {readyToBook ? (
              <View style={styles.quote}>
                <Row
                  label={
                    slotBased
                      ? `${pkr(price)} × ${plural(guests, 'guest')}`
                      : `${pkr(price)} × ${plural(nights, 'night')}`
                  }
                  value={pkr(quote.subtotal)}
                />
                <Row label={`Service fee (${SERVICE_FEE_LABEL})`} value={pkr(quote.fee)} />
                <Divider style={styles.quoteDivider} />
                <Row label="Total" value={pkr(quote.total)} strong />
              </View>
            ) : null}
            <Button
              label={readyToBook ? 'Continue' : slotBased ? 'Select a departure' : 'Select your dates'}
              size="lg"
              fullWidth
              disabled={!readyToBook}
              onPress={onContinue}
            />
          </View>
        }
      >
        {slotBased ? (
          slots.isLoading ? (
            <Loading label="Checking departures…" />
          ) : slots.data?.length ? (
            slots.data.map((departure) => {
              const spotsLeft = departure.availableSpots ?? 0;
              const soldOut = spotsLeft <= 0;
              const selected = slot?.id === departure.id;

              return (
                <Pressable
                  key={departure.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, disabled: soldOut }}
                  disabled={soldOut}
                  onPress={() => {
                    setSlot(departure);
                    setGuests((current) => Math.min(current, Math.max(1, spotsLeft)));
                  }}
                  style={({ pressed }) => [
                    styles.slot,
                    selected && styles.slotOn,
                    soldOut && styles.slotOff,
                    pressed && !soldOut && { opacity: 0.85 },
                  ]}
                >
                  <View style={styles.flex}>
                    <Text variant="bodyStrong" tone={soldOut ? 'muted' : 'default'}>
                      {formatTravelDate(departure.date)}
                    </Text>
                    <Text variant="small" tone={soldOut ? 'muted' : 'secondary'}>
                      {soldOut
                        ? 'Sold out'
                        : `${plural(spotsLeft, 'spot')} left${departure.priceOverride ? ` · ${pkr(departure.priceOverride)}` : ''}`}
                    </Text>
                  </View>
                  {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
                </Pressable>
              );
            })
          ) : (
            <EmptyState
              icon="calendar-outline"
              title="No departures listed"
              message="This operator has not opened dates yet. Message them and they will arrange one."
              actionLabel="Message the host"
              onAction={() => {
                setBookingOpen(false);
                void onMessageHost();
              }}
            />
          )
        ) : (
          <>
            <Calendar range={range} onChange={setRange} blockedDates={blockedDates} />
            {range.start ? (
              <Text variant="small" tone="secondary" center>
                {range.end
                  ? `${formatTravelDate(range.start)} → ${formatTravelDate(range.end)} · ${plural(nights, 'night')}`
                  : `Check-in ${formatTravelDate(range.start)} — now pick your check-out`}
              </Text>
            ) : null}
          </>
        )}

        <Divider />
        <Stepper
          label="Guests"
          sublabel={
            slotBased
              ? slot
                ? `${plural(slot.availableSpots ?? 0, 'spot')} available`
                : 'Pick a departure first'
              : item.maxOccupancy
                ? `This place sleeps ${item.maxOccupancy}`
                : undefined
          }
          value={guests}
          onChange={setGuests}
          min={item.minGuests ?? 1}
          max={slotBased ? Math.max(1, slot?.availableSpots ?? item.maxGuests ?? 20) : item.maxOccupancy ?? 20}
        />
      </Sheet>
    </View>
  );
}

/* ── small pieces ─────────────────────────────────────────────────────────── */

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.block}>
      <Text variant="heading" style={styles.blockTitle}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function BulletLine({
  icon, text, tone = 'muted',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  tone?: 'muted' | 'success' | 'danger';
}) {
  const color = { muted: colors.textMuted, success: colors.success, danger: colors.danger }[tone];
  return (
    <View style={styles.bullet}>
      <Ionicons name={icon} size={16} color={color} style={styles.bulletIcon} />
      <Text variant="body" tone="secondary" style={styles.flex}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },

  hero: { height: HERO_HEIGHT, backgroundColor: colors.surfaceMuted },
  heroImage: { width: SCREEN_WIDTH, height: HERO_HEIGHT },
  heroControls: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dots: {
    position: 'absolute',
    bottom: spacing.lg,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.55)' },
  dotOn: { backgroundColor: '#FFFFFF', width: 16 },

  body: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    marginTop: -spacing.xl,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  badges: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  title: { marginTop: spacing.md },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },

  hostCard: { marginTop: spacing.xl },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  hostName: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },

  block: { marginTop: spacing['2xl'], gap: spacing.sm },
  blockTitle: { marginBottom: spacing.xs },

  bullet: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  bulletIcon: { marginTop: 3 },
  excludeHead: { marginBottom: spacing.xs },

  itineraryDay: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  itineraryMarker: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itineraryText: { marginTop: 2 },

  amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  amenity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    width: '46%',
  },

  review: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  hostResponse: {
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    borderRadius: radius.md,
    gap: 2,
  },

  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  barPrice: { flex: 1 },
  barButton: { flex: 1.2 },

  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  slotOff: { opacity: 0.5, backgroundColor: colors.surfaceMuted },

  sheetFooter: { gap: spacing.md },
  quote: { gap: 0 },
  quoteDivider: { marginVertical: spacing.sm },
});
