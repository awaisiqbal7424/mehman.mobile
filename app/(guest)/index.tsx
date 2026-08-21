import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { packageApi, providerApi, tripBuilderApi } from '../../src/api/services';
import { PackageCard, RAIL_CARD_WIDTH } from '../../src/components/PackageCard';
import {
  Badge, CardSkeleton, IconButton, Rating, Screen, Section, Text,
} from '../../src/components/ui';
import { PLACEHOLDER_IMAGE } from '../../src/constants';
import { useAuth } from '../../src/store/auth';
import { colors, radius, shadow, spacing } from '../../src/theme';
import type { ProviderPackage, ServiceProvider, TripDestination } from '../../src/types';
import { LIVE_SEARCH_TABS } from '../../src/utils/packages';

/**
 * Explore — the first screen of the app.
 *
 * Everything is a horizontal rail. On a phone, a vertical stack of full-width
 * cards means one listing per screenful and a lot of scrolling before anyone
 * sees a second category; rails let a traveller take in tours, stays and
 * destinations in one thumb-flick and dive into whichever catches them.
 */
export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuth((s) => s.user);

  const tours = useQuery({
    queryKey: ['packages', 'top-rated-tours'],
    queryFn: () => packageApi.search({ type: 'TOUR', size: 12, sort: 'rating' }),
  });

  const stays = useQuery({
    queryKey: ['packages', 'featured-stays'],
    queryFn: () => packageApi.search({ type: 'STAY', size: 12 }),
  });

  const bestValue = useQuery({
    queryKey: ['packages', 'best-value'],
    queryFn: () => packageApi.search({ sort: 'price_asc', size: 12 }),
  });

  const destinations = useQuery({
    queryKey: ['destinations', 'popular'],
    queryFn: () => tripBuilderApi.destinations(true),
  });

  const operators = useQuery({
    queryKey: ['providers', 'approved'],
    queryFn: () => providerApi.getAll({ isApproved: true, size: 12 }),
  });

  const refreshing =
    tours.isRefetching || stays.isRefetching || bestValue.isRefetching || destinations.isRefetching;

  const onRefresh = useCallback(() => {
    void tours.refetch();
    void stays.refetch();
    void bestValue.refetch();
    void destinations.refetch();
    void operators.refetch();
  }, [bestValue, destinations, operators, stays, tours]);

  const firstName = user?.firstName;

  return (
    <Screen scroll refreshing={refreshing} onRefresh={onRefresh} edges="none">
      {/* ── greeting ──────────────────────────────────────────────────── */}
      <View style={[styles.top, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.greeting}>
          <Text variant="small" tone="secondary">
            {firstName ? `Salaam, ${firstName}` : 'Salaam'}
          </Text>
          <Text variant="title">Where to next?</Text>
        </View>
        <IconButton
          icon="heart-outline"
          accessibilityLabel="Saved listings"
          background={colors.surface}
          onPress={() => router.push('/(guest)/saved')}
        />
      </View>

      {/* ── search entry ──────────────────────────────────────────────── */}
      <Pressable
        accessibilityRole="search"
        accessibilityLabel="Search tours and stays"
        onPress={() => router.push('/(guest)/search')}
        style={({ pressed }) => [styles.searchBar, pressed && { opacity: 0.85 }]}
      >
        <Ionicons name="search" size={19} color={colors.primary} />
        <View style={styles.flex}>
          <Text variant="bodyStrong">Search Pakistan</Text>
          <Text variant="small" tone="muted">
            Hunza · Skardu · Swat · anywhere
          </Text>
        </View>
      </Pressable>

      {/* ── category shortcuts ────────────────────────────────────────── */}
      <View style={styles.categories}>
        {LIVE_SEARCH_TABS.map((tab) => (
          <Pressable
            key={tab.slug}
            accessibilityRole="button"
            accessibilityLabel={`Browse ${tab.label}`}
            onPress={() => router.push(`/(guest)/search?type=${tab.type}`)}
            style={({ pressed }) => [styles.category, pressed && styles.categoryPressed]}
          >
            <View style={styles.categoryIcon}>
              <Ionicons
                name={tab.type === 'TOUR' ? 'trail-sign-outline' : 'bed-outline'}
                size={22}
                color={colors.primary}
              />
            </View>
            <Text variant="smallStrong">{tab.label}</Text>
          </Pressable>
        ))}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Build a custom trip"
          onPress={() => router.push('/trip-builder')}
          style={({ pressed }) => [styles.category, pressed && styles.categoryPressed]}
        >
          <View style={styles.categoryIcon}>
            <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
          </View>
          <Text variant="smallStrong">Custom</Text>
        </Pressable>
      </View>

      {/* ── rails ─────────────────────────────────────────────────────── */}
      <PackageRail
        title="Popular tours"
        subtitle="Handpicked packages from verified agencies"
        loading={tours.isLoading}
        items={tours.data?.items}
        onSeeAll={() => router.push('/(guest)/search?type=TOUR')}
        emptyMessage="No tours published yet. Check back soon."
      />

      <DestinationRail
        destinations={destinations.data}
        loading={destinations.isLoading}
        onPress={(destination) => router.push(`/(guest)/search?q=${encodeURIComponent(destination.name)}`)}
      />

      <PackageRail
        title="Stay with a Mezban"
        subtitle="Unique homes, cottages and guesthouses"
        loading={stays.isLoading}
        items={stays.data?.items}
        onSeeAll={() => router.push('/(guest)/search?type=STAY')}
        emptyMessage="No stays published yet. Check back soon."
      />

      {/* ── custom trip pitch ─────────────────────────────────────────── */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Build your own trip"
        onPress={() => router.push('/trip-builder')}
        style={({ pressed }) => [styles.pitch, pressed && { opacity: 0.94 }]}
      >
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=70' }}
          style={styles.pitchImage}
          contentFit="cover"
          transition={250}
        />
        <View style={styles.pitchScrim} />
        <View style={styles.pitchBody}>
          <Badge label="Made for you" tone="primary" />
          <Text variant="title" tone="inverse" style={styles.pitchTitle}>
            Build your perfect Pakistan trip
          </Text>
          <Text variant="small" tone="inverse" style={styles.pitchCopy}>
            Tell us where and when. Verified operators send you a price.
          </Text>
          <View style={styles.pitchCta}>
            <Text variant="smallStrong" tone="inverse">
              Start planning
            </Text>
            <Ionicons name="arrow-forward" size={15} color={colors.textInverse} />
          </View>
        </View>
      </Pressable>

      <PackageRail
        title="Best value"
        subtitle="Top-rated trips at the friendliest prices"
        loading={bestValue.isLoading}
        items={bestValue.data?.items}
        onSeeAll={() => router.push('/(guest)/search?sort=price_asc')}
        emptyMessage="Nothing here yet."
      />

      <OperatorRail
        operators={operators.data}
        loading={operators.isLoading}
        onPress={(provider) => router.push(`/provider/${provider.id}`)}
      />

      <View style={styles.tail} />
    </Screen>
  );
}

/* ── rails ────────────────────────────────────────────────────────────────── */

function PackageRail({
  title, subtitle, items, loading, onSeeAll, emptyMessage,
}: {
  title: string;
  subtitle?: string;
  items?: ProviderPackage[];
  loading: boolean;
  onSeeAll: () => void;
  emptyMessage: string;
}) {
  if (loading) {
    return (
      <Section title={title} subtitle={subtitle}>
        <CardSkeleton count={1} />
      </Section>
    );
  }

  if (!items?.length) {
    return (
      <Section title={title} subtitle={subtitle}>
        <View style={styles.railEmpty}>
          <Text variant="small" tone="muted">
            {emptyMessage}
          </Text>
        </View>
      </Section>
    );
  }

  return (
    <Section title={title} subtitle={subtitle} action="See all" onAction={onSeeAll}>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PackageCard item={item} layout="rail" />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
        // Snapping makes a rail feel like a deck of cards rather than a
        // free-scrolling strip that always stops mid-listing.
        snapToInterval={RAIL_CARD_WIDTH + spacing.md}
        decelerationRate="fast"
        ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
      />
    </Section>
  );
}

function DestinationRail({
  destinations, loading, onPress,
}: {
  destinations?: TripDestination[];
  loading: boolean;
  onPress: (destination: TripDestination) => void;
}) {
  if (loading || !destinations?.length) return null;

  return (
    <Section title="Popular destinations" subtitle="The valleys people ask for by name">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {destinations.map((destination) => (
          <Pressable
            key={destination.id}
            accessibilityRole="button"
            accessibilityLabel={`Search ${destination.name}`}
            onPress={() => onPress(destination)}
            style={({ pressed }) => [styles.destination, pressed && { opacity: 0.9 }]}
          >
            <Image
              source={{ uri: destination.imageUrl ?? PLACEHOLDER_IMAGE }}
              style={styles.destinationImage}
              contentFit="cover"
              transition={220}
            />
            <View style={styles.destinationScrim} />
            <View style={styles.destinationBody}>
              <Text variant="bodyStrong" tone="inverse" numberOfLines={1}>
                {destination.name}
              </Text>
              <Text variant="small" tone="inverse" numberOfLines={1} style={styles.destinationRegion}>
                {destination.region}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </Section>
  );
}

function OperatorRail({
  operators, loading, onPress,
}: {
  operators?: ServiceProvider[];
  loading: boolean;
  onPress: (provider: ServiceProvider) => void;
}) {
  if (loading || !operators?.length) return null;

  return (
    <Section title="Verified hosts" subtitle="Every business here is checked before it can list">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {operators.map((provider) => (
          <Pressable
            key={provider.id}
            accessibilityRole="button"
            accessibilityLabel={provider.name ?? 'Host'}
            onPress={() => onPress(provider)}
            style={({ pressed }) => [styles.operator, pressed && { opacity: 0.9 }]}
          >
            <Image
              source={{ uri: provider.logoUrl ?? PLACEHOLDER_IMAGE }}
              style={styles.operatorLogo}
              contentFit="cover"
              transition={200}
            />
            <Text variant="smallStrong" numberOfLines={2} center>
              {provider.name ?? 'Host'}
            </Text>
            {provider.city ? (
              <Text variant="small" tone="muted" numberOfLines={1}>
                {provider.city}
              </Text>
            ) : null}
            <Rating value={provider.rating} compact />
          </Pressable>
        ))}
      </ScrollView>
    </Section>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  greeting: { flex: 1, gap: 2 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow.sm,
  },

  categories: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  category: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  categoryPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  categoryIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rail: { paddingHorizontal: spacing.lg },
  railEmpty: { paddingHorizontal: spacing.lg },

  destination: {
    width: 148,
    height: 190,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginRight: spacing.md,
    backgroundColor: colors.surfaceMuted,
  },
  destinationImage: { width: '100%', height: '100%' },
  destinationScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
    backgroundColor: 'rgba(28,25,23,0.45)',
  },
  destinationBody: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.md },
  destinationRegion: { opacity: 0.85 },

  operator: {
    width: 132,
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    marginRight: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  operatorLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceMuted,
    marginBottom: spacing.xs,
  },

  pitch: {
    height: 210,
    marginHorizontal: spacing.lg,
    marginBottom: spacing['2xl'],
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadow.md,
  },
  pitchImage: { width: '100%', height: '100%' },
  pitchScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(28,25,23,0.5)',
  },
  pitchBody: { position: 'absolute', left: spacing.xl, right: spacing.xl, bottom: spacing.xl, gap: spacing.xs },
  pitchTitle: { marginTop: spacing.sm },
  pitchCopy: { opacity: 0.9 },
  pitchCta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },

  tail: { height: spacing.lg },
});
