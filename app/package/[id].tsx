import { Ionicons } from '../../src/components/ui/LucideIcon';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { availabilityApi, packageApi, pricingOptionApi, providerApi, reviewApi } from '../../src/api/services';
import { Calendar, type DateRange } from '../../src/components/Calendar';
import {
  Avatar, Badge, Button, Card, Divider, EmptyState, ErrorState, FooterBar, IconButton,
  Loading, Rating, Row, Screen, Sheet, Stepper, Text, useToast,
} from '../../src/components/ui';
import { PLACEHOLDER_IMAGE, WEBSITE_URL } from '../../src/constants';
import { useSettingsStore, serviceFeeFor } from '../../src/store/settingsStore';
import { useMessageHost } from '../../src/hooks/useMessageHost';
import { useAuth } from '../../src/store/auth';
import { useWishlist } from '../../src/store/wishlist';
import { colors, palette, radius, spacing } from '../../src/theme';
import type { PackageAvailability, PackagePricingOption } from '../../src/types';
import { formatTravelDate, nightsBetween, pkr, plural, toApiDate } from '../../src/utils/format';
import {
  durationLabel, isSlotBased, packageImages, packagePrice, parseJsonArray, priceUnit,
  pricingOptionPrice, typeLabel,
} from '../../src/utils/packages';

/** Hero height as a share of screen width, clamped so very narrow or very wide
 * phones both get a gallery that reads as a photo rather than a strip or a slab. */
const HERO_ASPECT = 0.85;
const HERO_MIN_HEIGHT = 260;
const HERO_MAX_HEIGHT = 380;

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
  const { width: screenWidth } = useWindowDimensions();
  const heroHeight = Math.min(HERO_MAX_HEIGHT, Math.max(HERO_MIN_HEIGHT, screenWidth * HERO_ASPECT));

  const user = useAuth((s) => s.user);
  const feePercentage = useSettingsStore((s) => s.serviceFeePercentage);
  const saved = useWishlist((s) => Boolean(id && s.entries[id]));
  const toggleSaved = useWishlist((s) => s.toggle);

  const [heroIndex, setHeroIndex] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [guests, setGuests] = useState(1);
  const [range, setRange] = useState<DateRange>({ start: null, end: null });
  const [slot, setSlot] = useState<PackageAvailability | null>(null);
  const [pricingOption, setPricingOption] = useState<PackagePricingOption | null>(null);

  const pkg = useQuery({
    queryKey: ['package', id],
    queryFn: () => packageApi.getById(id),
    enabled: Boolean(id),
  });

  const slotBased = isSlotBased(pkg.data?.packageType);

  /**
   * Fetched independently rather than trusting `pkg.data.provider` — the
   * search endpoint embeds it but the single-package endpoint does not
   * reliably, which is how a listing could end up with no Mezban card at all.
   */
  const providerQuery = useQuery({
    queryKey: ['provider-for-package', pkg.data?.providerId],
    queryFn: () => providerApi.getById(pkg.data!.providerId!),
    enabled: Boolean(pkg.data?.providerId),
  });
  const host = providerQuery.data ?? pkg.data?.provider;

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

  const pricingOptions = useQuery({
    queryKey: ['pricing-options', id],
    queryFn: () => pricingOptionApi.forPackage(id),
    enabled: Boolean(id),
  });
  const activePricingOptions = pricingOptions.data?.filter((option) => option.isActive) ?? [];

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

  const basePrice = pkg.data ? packagePrice(pkg.data) : 0;
  const price = pricingOptionPrice(basePrice, pricingOption);
  const nights = nightsBetween(range.start, range.end);

  /** What the guest will actually be charged, fee included. */
  const quote = useMemo(() => {
    const units = slotBased ? guests : nights * 1;
    const subtotal = slotBased ? price * guests : price * nights;
    const fee = serviceFeeFor(subtotal, feePercentage);
    return { units, subtotal, fee, total: subtotal + fee };
  }, [guests, nights, price, slotBased, feePercentage]);

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

  const onShare = useCallback(async () => {
    const url = `${WEBSITE_URL}/package/${id}`;
    try {
      // `url` is only honoured on iOS — Android's share sheet reads `message`
      // alone, so the link has to live in the text either way.
      await Share.share({ message: `${pkg.data?.name ?? 'A listing on Mehman'} — ${url}`, url });
    } catch {
      /* the share sheet was dismissed — nothing to recover from */
    }
  }, [id, pkg.data?.name]);

  const messageHost = useMessageHost(`/package/${id}`);
  const onMessageHost = useCallback(
    () => messageHost(host?.providerOwnerId ?? pkg.data?.providerOwnerId, pkg.data?.providerId),
    [host, messageHost, pkg.data?.providerId, pkg.data?.providerOwnerId],
  );

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
        ...(pricingOption ? { pricingOptionId: pricingOption.id } : {}),
        ...(slotBased
          ? { availabilityId: slot!.id, departureDate: slot!.date }
          : { checkIn: toApiDate(range.start!), checkOut: toApiDate(range.end!) }),
      },
    });
  }, [guests, id, pricingOption, range.end, range.start, router, slot, slotBased, user]);

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
        background={colors.surface}
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
        <View style={[styles.hero, { height: heroHeight }]}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setHeroIndex(Math.round(e.nativeEvent.contentOffset.x / screenWidth))
            }
          >
            {images.map((uri, index) => (
              <Image
                key={`${uri}-${index}`}
                source={{ uri }}
                style={[styles.heroImage, { width: screenWidth, height: heroHeight }]}
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
            <View style={styles.heroRightActions}>
              <IconButton
                icon="share-outline"
                accessibilityLabel="Share this listing"
                background="rgba(255,255,255,0.94)"
                onPress={() => void onShare()}
              />
              <IconButton
                icon={saved ? 'heart' : 'heart-outline'}
                accessibilityLabel={saved ? 'Remove from saved' : 'Save this listing'}
                color={saved ? colors.primary : colors.text}
                background="rgba(255,255,255,0.94)"
                onPress={onHeart}
              />
            </View>
          </View>

          {images.length > 1 ? (
            <>
              {/* A bright photo (snow, sky, sand) can wash white dots out
                  completely — the scrim guarantees contrast regardless of
                  what is behind it. */}
              <LinearGradient
                colors={['transparent', colors.scrim]}
                style={styles.heroScrim}
                pointerEvents="none"
              />
              <View style={styles.dots}>
                {images.map((uri, index) => (
                  <View key={`${uri}-dot-${index}`} style={[styles.dot, index === heroIndex && styles.dotOn]} />
                ))}
              </View>
            </>
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
            {host?.city ? (
              <View style={styles.meta}>
                <Ionicons name="location-outline" size={15} color={colors.textMuted} />
                <Text variant="small" tone="secondary">
                  {host.city}
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
            <Rating value={host?.rating} count={reviews.data?.length} />
          </View>

          {/* ── Mezban details ────────────────────────────────────────────
              Every listing shows who is hosting it and a way to chat with
              them — direct phone/email stay hidden until a booking exists,
              so nothing steers a guest around the platform. */}
          {host ? (
            <Card style={styles.hostCard}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View ${host.name ?? 'this host'}'s profile`}
                onPress={() => router.push(`/provider/${item.providerId}`)}
                style={styles.hostRow}
              >
                <Avatar uri={host.logoUrl} name={host.name} size={48} />
                <View style={styles.flex}>
                  <View style={styles.hostName}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {host.name}
                    </Text>
                    {host.isApproved ? (
                      <Ionicons name="checkmark-circle" size={15} color={colors.success} />
                    ) : null}
                  </View>
                  <Text variant="small" tone="muted" numberOfLines={1}>
                    {host.isTourOperator ? 'Tour operator' : 'Host'}
                    {host.city ? ` · ${host.city}` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
              <Button
                label="Chat with them"
                variant="outline"
                icon="chatbubble-ellipses-outline"
                fullWidth
                style={styles.hostChatButton}
                onPress={() => void onMessageHost()}
              />
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
            <SectionPanel title="Highlights" icon="sparkles-outline" tone="primary">
              <View style={styles.chips}>
                {highlights.map((line, index) => (
                  <View key={`${line}-${index}`} style={styles.chip}>
                    <Text variant="small" style={styles.onDark}>
                      {line}
                    </Text>
                  </View>
                ))}
              </View>
            </SectionPanel>
          ) : null}

          {includes.length ? (
            <SectionPanel title="What's included" icon="checkmark-circle" tone="success">
              <View style={styles.featureList}>
                {includes.map((line, index) => (
                  <View key={`inc-${index}`} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={16} color={palette.green600} style={styles.featureIcon} />
                    <Text variant="small" style={[styles.flex, styles.onDark]}>
                      {line}
                    </Text>
                  </View>
                ))}
              </View>
            </SectionPanel>
          ) : null}

          {excludes.length ? (
            <SectionPanel title="Not included" icon="close-circle" tone="neutral">
              <View style={styles.featureList}>
                {excludes.map((line, index) => (
                  <View key={`exc-${index}`} style={styles.featureRow}>
                    <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.5)" style={styles.featureIcon} />
                    <Text variant="small" style={[styles.flex, styles.onDarkMuted]}>
                      {line}
                    </Text>
                  </View>
                ))}
              </View>
            </SectionPanel>
          ) : null}

          {amenities.length ? (
            <SectionPanel title="What this place offers" icon="star-outline" tone="gold">
              <View style={styles.featureList}>
                {amenities.map((amenity, index) => (
                  <View key={`${amenity}-${index}`} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={palette.orange300} style={styles.featureIcon} />
                    <Text variant="small" style={[styles.flex, styles.onDark]}>
                      {amenity}
                    </Text>
                  </View>
                ))}
              </View>
            </SectionPanel>
          ) : null}

          {itinerary.length ? (
            <SectionPanel title="Itinerary" icon="compass-outline" tone="neutral">
              {itinerary.map((day, index) => (
                <View key={`day-${index}`} style={styles.itineraryDay}>
                  <View style={styles.itineraryTrack}>
                    <View style={styles.itineraryMarker}>
                      <Text variant="caption" tone="inverse">
                        {day.day ?? index + 1}
                      </Text>
                    </View>
                    {index !== itinerary.length - 1 ? <View style={styles.itineraryLine} /> : null}
                  </View>
                  <View style={[styles.flex, styles.itineraryContent]}>
                    <Text variant="bodyStrong" style={styles.onDark}>
                      {day.title ?? `Day ${day.day ?? index + 1}`}
                    </Text>
                    {day.description ? (
                      <Text variant="small" style={[styles.itineraryText, styles.onDarkMuted]}>
                        {day.description}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </SectionPanel>
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
                <Row label={`Service fee (${feePercentage}%)`} value={pkr(quote.fee)} />
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

        {activePricingOptions.length ? (
          <>
            <Divider />
            <Text variant="smallStrong" tone="secondary">
              Pricing
            </Text>
            <View style={styles.pricingOptions}>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: !pricingOption }}
                onPress={() => setPricingOption(null)}
                style={[styles.pricingOptionRow, !pricingOption && styles.pricingOptionRowOn]}
              >
                <View style={styles.flex}>
                  <Text variant="bodyStrong">Standard price</Text>
                </View>
                <Text variant="bodyStrong">{pkr(basePrice)}</Text>
              </Pressable>
              {activePricingOptions.map((option) => {
                const selected = pricingOption?.id === option.id;
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => setPricingOption(option)}
                    style={[styles.pricingOptionRow, selected && styles.pricingOptionRowOn]}
                  >
                    <View style={styles.flex}>
                      <Text variant="bodyStrong">{option.label}</Text>
                      {option.description ? (
                        <Text variant="small" tone="muted">
                          {option.description}
                        </Text>
                      ) : null}
                    </View>
                    <Text variant="bodyStrong">{pkr(pricingOptionPrice(basePrice, option))}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

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

const PANEL_TONES = {
  primary: { iconBg: colors.primary, iconTint: palette.white, glow: 'rgba(234,88,12,0.35)' },
  success: { iconBg: 'rgba(5,150,105,0.18)', iconTint: '#34D399', glow: 'rgba(5,150,105,0.22)' },
  gold: { iconBg: palette.orange300, iconTint: palette.ink900, glow: 'rgba(253,186,116,0.22)' },
  neutral: { iconBg: 'rgba(255,255,255,0.1)', iconTint: 'rgba(255,255,255,0.8)', glow: 'rgba(120,113,108,0.22)' },
} as const;

/**
 * One panel design for every trip-detail section — a deep stone card with a
 * single coloured glow and an icon tile beside the title — so Highlights,
 * Itinerary, and What's included read as one set rather than four unrelated
 * boxes, matching the web listing page.
 */
function SectionPanel({
  title, icon, tone, children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: keyof typeof PANEL_TONES;
  children: React.ReactNode;
}) {
  const { iconBg, iconTint, glow } = PANEL_TONES[tone];
  return (
    <LinearGradient
      colors={[palette.ink900, palette.ink900, palette.ink800]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.panel}
    >
      <View style={[styles.panelGlow, { backgroundColor: glow }]} />
      <View style={styles.panelHead}>
        <View style={[styles.panelIconTile, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color={iconTint} />
        </View>
        <Text variant="heading" style={styles.onDark}>
          {title}
        </Text>
      </View>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },

  hero: { backgroundColor: colors.surfaceMuted },
  heroImage: {},
  heroScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 88 },
  heroControls: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroRightActions: { flexDirection: 'row', gap: spacing.sm },
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
    backgroundColor: colors.surface,
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
  hostChatButton: { marginTop: spacing.lg },

  block: { marginTop: spacing['2xl'], gap: spacing.sm },
  blockTitle: { marginBottom: spacing.xs },

  // The dark section cards (Highlights, Included, Itinerary, …) — one look
  // for every "trip detail" block instead of a plain white panel each.
  panel: {
    marginTop: spacing['2xl'],
    borderRadius: radius['2xl'],
    padding: spacing.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  panelGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  panelIconTile: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onDark: { color: palette.white },
  onDarkMuted: { color: 'rgba(255,255,255,0.65)' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },

  featureList: { gap: spacing.sm },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  featureIcon: { marginTop: 1 },

  itineraryDay: { flexDirection: 'row', gap: spacing.md },
  itineraryTrack: { alignItems: 'center' },
  itineraryMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itineraryLine: { width: 2, flex: 1, minHeight: spacing.lg, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: spacing.xs },
  itineraryContent: { paddingBottom: spacing.lg },
  itineraryText: { marginTop: 2 },

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
  pricingOptions: { gap: spacing.sm },
  pricingOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pricingOptionRowOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  quote: { gap: 0 },
  quoteDivider: { marginVertical: spacing.sm },
});
