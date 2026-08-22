import { Ionicons } from '../../src/components/ui/LucideIcon';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { packageApi, type PackageSearchParams } from '../../src/api/services';
import { PackageCard } from '../../src/components/PackageCard';
import {
  Button, CardSkeleton, Chip, EmptyState, ErrorState, Input, Sheet, SheetOption, Text,
  useTabBarSpace,
} from '../../src/components/ui';
import { colors, radius, spacing, type as typeScale } from '../../src/theme';
import type { ProviderPackage } from '../../src/types';
import { pkr } from '../../src/utils/format';
import { LIVE_SEARCH_TABS } from '../../src/utils/packages';

const PAGE_SIZE = 12;

const SORTS: { value: string; label: string; description: string }[] = [
  { value: 'rating', label: 'Top rated', description: 'Best-reviewed listings first' },
  { value: 'price_asc', label: 'Price: low to high', description: 'The most affordable first' },
  { value: 'price_desc', label: 'Price: high to low', description: 'The most premium first' },
  { value: 'newest', label: 'Newest', description: 'Recently published listings' },
];

/**
 * Search.
 *
 * Results load a page at a time as the list is scrolled rather than behind a
 * "load more" button: on a phone, the thumb is already moving in the right
 * direction, and a button is an extra decision at exactly the moment someone
 * has momentum.
 */
export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // This screen drives its own FlatList rather than `Screen`, so it has to
  // clear the floating tab bar itself.
  const tabSpace = useTabBarSpace();
  const params = useLocalSearchParams<{ q?: string; type?: string; sort?: string }>();

  const [query, setQuery] = useState(params.q ?? '');
  /** What is actually sent to the API — debounced behind `query`. */
  const [term, setTerm] = useState(params.q ?? '');
  const [type, setType] = useState<string | undefined>(params.type);
  const [sort, setSort] = useState<string>(params.sort ?? 'rating');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [city, setCity] = useState('');
  /** The filters actually applied, as opposed to what is typed in the sheet. */
  const [applied, setApplied] = useState<{ minPrice?: number; maxPrice?: number; city?: string }>({});

  // Deep links from Explore arrive with parameters already set.
  useEffect(() => {
    if (params.type) setType(params.type);
    if (params.sort) setSort(params.sort);
    if (params.q) {
      setQuery(params.q);
      setTerm(params.q);
    }
  }, [params.q, params.sort, params.type]);

  // 350ms is long enough that a fast typist sends one request, short enough
  // that a slow one does not feel like the screen has stopped responding.
  useEffect(() => {
    const timer = setTimeout(() => setTerm(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const searchParams: PackageSearchParams = useMemo(
    () => ({
      q: term || undefined,
      type,
      sort,
      minPrice: applied.minPrice,
      maxPrice: applied.maxPrice,
      city: applied.city,
      size: PAGE_SIZE,
    }),
    [applied.city, applied.maxPrice, applied.minPrice, sort, term, type],
  );

  const results = useInfiniteQuery({
    queryKey: ['search', searchParams],
    queryFn: ({ pageParam = 1 }) => packageApi.search({ ...searchParams, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.currentPage < last.totalPages ? last.currentPage + 1 : undefined),
  });

  const items: ProviderPackage[] = useMemo(
    () => results.data?.pages.flatMap((page) => page.items ?? []) ?? [],
    [results.data],
  );

  const total = results.data?.pages[0]?.totalCount ?? 0;
  const activeFilterCount =
    (applied.minPrice ? 1 : 0) + (applied.maxPrice ? 1 : 0) + (applied.city ? 1 : 0);

  const applyFilters = useCallback(() => {
    setApplied({
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      city: city.trim() || undefined,
    });
    setFiltersOpen(false);
  }, [city, maxPrice, minPrice]);

  const clearFilters = useCallback(() => {
    setMinPrice('');
    setMaxPrice('');
    setCity('');
    setApplied({});
    setFiltersOpen(false);
  }, []);

  const sortLabel = SORTS.find((s) => s.value === sort)?.label ?? 'Sort';

  return (
    <View style={styles.root}>
      {/* ── search bar and filters ────────────────────────────────────── */}
      <View style={[styles.head, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.searchField}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Where do you want to go?"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Search listings"
            onSubmitEditing={() => setTerm(query.trim())}
          />
          {query ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          keyboardShouldPersistTaps="handled"
        >
          <Chip label="All" selected={!type} onPress={() => setType(undefined)} />
          {LIVE_SEARCH_TABS.map((tab) => (
            <Chip
              key={tab.type}
              label={tab.label}
              selected={type === tab.type}
              onPress={() => setType(type === tab.type ? undefined : tab.type)}
            />
          ))}
          <View style={styles.filterDivider} />
          <Chip label={sortLabel} icon="swap-vertical" onPress={() => setSortOpen(true)} />
          <Chip
            label={activeFilterCount ? `Filters · ${activeFilterCount}` : 'Filters'}
            icon="options-outline"
            selected={activeFilterCount > 0}
            onPress={() => setFiltersOpen(true)}
          />
        </ScrollView>
      </View>

      {/* ── results ───────────────────────────────────────────────────── */}
      {results.isLoading ? (
        <View style={styles.loading}>
          <CardSkeleton count={3} />
        </View>
      ) : results.isError ? (
        <ErrorState message="We could not run that search." onRetry={() => void results.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PackageCard item={item} />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + tabSpace + spacing.xl }]}
          ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            if (results.hasNextPage && !results.isFetchingNextPage) void results.fetchNextPage();
          }}
          refreshing={results.isRefetching && !results.isFetchingNextPage}
          onRefresh={() => void results.refetch()}
          ListHeaderComponent={
            total > 0 ? (
              <Text variant="small" tone="secondary" style={styles.count}>
                {total} {total === 1 ? 'listing' : 'listings'}
                {term ? ` for “${term}”` : ''}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="Nothing matched"
              message={
                activeFilterCount || term
                  ? 'Try a wider price range, or search for a region rather than a specific place.'
                  : 'There are no listings here yet.'
              }
              actionLabel={activeFilterCount ? 'Clear filters' : undefined}
              onAction={activeFilterCount ? clearFilters : undefined}
            />
          }
          ListFooterComponent={
            results.isFetchingNextPage ? (
              <ActivityIndicator color={colors.primary} style={styles.footerSpinner} />
            ) : items.length && !results.hasNextPage ? (
              <Text variant="small" tone="muted" center style={styles.footerSpinner}>
                That is everything
              </Text>
            ) : null
          }
        />
      )}

      {/* ── sort sheet ────────────────────────────────────────────────── */}
      <Sheet visible={sortOpen} onClose={() => setSortOpen(false)} title="Sort results">
        {SORTS.map((option) => (
          <SheetOption
            key={option.value}
            label={option.label}
            description={option.description}
            selected={sort === option.value}
            onPress={() => {
              setSort(option.value);
              setSortOpen(false);
            }}
          />
        ))}
      </Sheet>

      {/* ── filter sheet ──────────────────────────────────────────────── */}
      <Sheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        subtitle="Narrow it down"
        footer={
          <View style={styles.sheetActions}>
            <Button label="Clear" variant="outline" onPress={clearFilters} style={styles.sheetButton} />
            <Button label="Show results" onPress={applyFilters} style={styles.sheetButton} />
          </View>
        }
      >
        <Text variant="bodyStrong">Price range</Text>
        <View style={styles.priceRow}>
          <Input
            label="Minimum"
            placeholder="0"
            value={minPrice}
            onChangeText={setMinPrice}
            keyboardType="number-pad"
            containerStyle={styles.flex}
            hint={minPrice ? pkr(Number(minPrice)) : undefined}
          />
          <Input
            label="Maximum"
            placeholder="Any"
            value={maxPrice}
            onChangeText={setMaxPrice}
            keyboardType="number-pad"
            containerStyle={styles.flex}
            hint={maxPrice ? pkr(Number(maxPrice)) : undefined}
          />
        </View>

        <Input
          label="City or region"
          icon="location-outline"
          placeholder="Gilgit, Skardu, Swat…"
          value={city}
          onChangeText={setCity}
          autoCapitalize="words"
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },

  head: {
    backgroundColor: colors.surface,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.xl,
    height: 50,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
  },
  searchInput: { flex: 1, color: colors.text, ...typeScale.body },

  filterRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  filterDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },

  loading: { paddingTop: spacing.xl },
  list: { padding: spacing.lg },
  count: { marginBottom: spacing.md },
  footerSpinner: { paddingVertical: spacing['2xl'] },

  priceRow: { flexDirection: 'row', gap: spacing.md },
  sheetActions: { flexDirection: 'row', gap: spacing.md },
  sheetButton: { flex: 1 },
});
