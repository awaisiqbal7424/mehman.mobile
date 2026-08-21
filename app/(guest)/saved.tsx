import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { packageApi, wishlistApi } from '../../src/api/services';
import { PackageCard } from '../../src/components/PackageCard';
import { CardSkeleton, EmptyState, ErrorState, Header, Screen } from '../../src/components/ui';
import { useAuth } from '../../src/store/auth';
import { useWishlist } from '../../src/store/wishlist';
import { spacing } from '../../src/theme';
import type { ProviderPackage } from '../../src/types';

/**
 * Saved listings.
 *
 * The wishlist endpoint returns rows, not listings, so each saved id is
 * resolved to its package here. Failures are dropped rather than thrown: a
 * listing that has since been unpublished should quietly disappear from the
 * list, not break the whole screen.
 */
export default function SavedScreen() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const loadWishlist = useWishlist((s) => s.load);

  useEffect(() => {
    if (user) void loadWishlist(user.id);
  }, [loadWishlist, user]);

  const saved = useQuery({
    queryKey: ['saved-packages', user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<ProviderPackage[]> => {
      const rows = await wishlistApi.mine(user!.id);
      const ids = rows.map((row) => row.packageId).filter((id): id is string => Boolean(id));

      const results = await Promise.allSettled(ids.map((id) => packageApi.getById(id)));
      return results
        .filter((r): r is PromiseFulfilledResult<ProviderPackage> => r.status === 'fulfilled')
        .map((r) => r.value);
    },
  });

  if (!user) {
    return (
      <Screen scroll={false}>
        <Header title="Saved" />
        <EmptyState
          icon="heart-outline"
          title="Sign in to save listings"
          message="Tap the heart on anything you like and it will be waiting here."
          actionLabel="Sign in"
          onAction={() => router.push('/sign-in?redirect=/(guest)/saved')}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll refreshing={saved.isRefetching} onRefresh={() => void saved.refetch()}>
      <Header title="Saved" />

      <View style={styles.list}>
        {saved.isLoading ? (
          <CardSkeleton count={3} />
        ) : saved.isError ? (
          <ErrorState message="We could not load your saved list." onRetry={() => void saved.refetch()} />
        ) : saved.data?.length ? (
          saved.data.map((item) => <PackageCard key={item.id} item={item} />)
        ) : (
          <EmptyState
            icon="heart-outline"
            title="Nothing saved yet"
            message="Tap the heart on a tour or a stay and it will be kept here for later."
            actionLabel="Explore Pakistan"
            onAction={() => router.push('/(guest)')}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.lg, gap: spacing.lg, paddingTop: spacing.sm },
});
