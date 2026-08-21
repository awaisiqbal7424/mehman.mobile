import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { errorMessage } from '../../src/api/client';
import { reviewApi } from '../../src/api/services';
import {
  Avatar, Badge, Button, Card, CardSkeleton, Divider, EmptyState, ErrorState, Header,
  Rating, Screen, Sheet, StatTile, Text, TextArea, useToast,
} from '../../src/components/ui';
import { useAuth } from '../../src/store/auth';
import { colors, radius, spacing } from '../../src/theme';
import type { Review } from '../../src/types';
import { formatShortDate } from '../../src/utils/format';

/**
 * Reviews, and replies to them.
 *
 * Unanswered reviews are pulled to the top. A public reply is the host's only
 * way to put their side of a bad review in front of the next guest reading it,
 * and it is the thing most easily forgotten.
 */
export default function HostReviewsScreen() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const provider = useAuth((s) => s.provider);

  const [replying, setReplying] = useState<Review | null>(null);
  const [response, setResponse] = useState('');
  const [busy, setBusy] = useState(false);

  const reviews = useQuery({
    queryKey: ['host-reviews', provider?.id],
    queryFn: () => reviewApi.forProvider(provider!.id),
    enabled: Boolean(provider),
  });

  /** Unanswered first, then newest. */
  const ordered = useMemo(() => {
    const items = [...(reviews.data ?? [])];
    items.sort((a, b) => {
      const answered = Number(Boolean(a.hostResponse)) - Number(Boolean(b.hostResponse));
      if (answered !== 0) return answered;
      return new Date(b.reviewDate ?? 0).getTime() - new Date(a.reviewDate ?? 0).getTime();
    });
    return items;
  }, [reviews.data]);

  const summary = useMemo(() => {
    const items = reviews.data ?? [];
    const rated = items.filter((r) => typeof r.rating === 'number');
    const average = rated.length
      ? rated.reduce((sum, r) => sum + (r.rating ?? 0), 0) / rated.length
      : 0;
    return {
      total: items.length,
      average,
      unanswered: items.filter((r) => !r.hostResponse).length,
    };
  }, [reviews.data]);

  const sendReply = async () => {
    if (!replying || !response.trim()) return;
    setBusy(true);
    try {
      await reviewApi.respond(replying.id, response.trim());
      await queryClient.invalidateQueries({ queryKey: ['host-reviews'] });
      await queryClient.invalidateQueries({ queryKey: ['host-dashboard'] });
      toast.success('Your reply is public');
      setReplying(null);
      setResponse('');
    } catch (err) {
      toast.error(errorMessage(err, 'We could not post that reply.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll refreshing={reviews.isRefetching} onRefresh={() => void reviews.refetch()}>
      <Header title="Reviews" onBack={() => (router.canGoBack() ? router.back() : router.replace('/(host)'))} />

      <View style={styles.body}>
        {summary.total > 0 ? (
          <View style={styles.stats}>
            <StatTile label="Average rating" value={summary.average.toFixed(1)} icon="star" tone="warning" />
            <StatTile label="Total reviews" value={summary.total} icon="chatbox-outline" />
            <StatTile
              label="Need a reply"
              value={summary.unanswered}
              icon="arrow-undo-outline"
              tone={summary.unanswered > 0 ? 'warning' : 'success'}
            />
          </View>
        ) : null}

        {reviews.isLoading ? (
          <CardSkeleton count={3} />
        ) : reviews.isError ? (
          <ErrorState message="We could not load your reviews." onRetry={() => void reviews.refetch()} />
        ) : ordered.length ? (
          ordered.map((review) => (
            <Card key={review.id}>
              <View style={styles.head}>
                <Avatar name={review.customerFullName ?? 'Guest'} size={40} />
                <View style={styles.flex}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {review.customerFullName ?? 'A guest'}
                  </Text>
                  <Text variant="small" tone="muted">
                    {formatShortDate(review.reviewDate)}
                  </Text>
                </View>
                <Rating value={review.rating} compact />
              </View>

              {review.comment ? (
                <Text variant="body" tone="secondary" style={styles.comment}>
                  {review.comment}
                </Text>
              ) : null}

              {/* The sub-scores say *what* went wrong, which is what a reply needs. */}
              {review.cleanlinessRating || review.valueRating || review.communicationRating ? (
                <View style={styles.subScores}>
                  <SubScore label="Cleanliness" value={review.cleanlinessRating} />
                  <SubScore label="Value" value={review.valueRating} />
                  <SubScore label="Location" value={review.locationRating} />
                  <SubScore label="Communication" value={review.communicationRating} />
                </View>
              ) : null}

              <Divider />

              {review.hostResponse ? (
                <View style={styles.response}>
                  <View style={styles.responseHead}>
                    <Ionicons name="arrow-undo" size={14} color={colors.textMuted} />
                    <Text variant="caption" tone="muted">
                      YOUR REPLY · {formatShortDate(review.hostResponseDate)}
                    </Text>
                  </View>
                  <Text variant="small" tone="secondary">
                    {review.hostResponse}
                  </Text>
                </View>
              ) : (
                <View style={styles.replyRow}>
                  <Badge label="Not answered" tone="warning" />
                  <Button
                    label="Reply"
                    size="sm"
                    icon="arrow-undo-outline"
                    onPress={() => {
                      setReplying(review);
                      setResponse('');
                    }}
                  />
                </View>
              )}
            </Card>
          ))
        ) : (
          <EmptyState
            icon="star-outline"
            title="No reviews yet"
            message="Guests can review once a booking is marked completed. Remember to close off finished trips."
          />
        )}
      </View>

      <Sheet
        visible={Boolean(replying)}
        onClose={() => setReplying(null)}
        title="Reply publicly"
        subtitle={replying?.customerFullName ? `To ${replying.customerFullName}` : undefined}
        footer={
          <Button
            label="Post reply"
            size="lg"
            fullWidth
            disabled={!response.trim()}
            loading={busy}
            onPress={() => void sendReply()}
          />
        }
      >
        {replying?.comment ? (
          <View style={styles.quotedReview}>
            <Rating value={replying.rating} compact />
            <Text variant="small" tone="secondary">
              {replying.comment}
            </Text>
          </View>
        ) : null}

        <TextArea
          label="Your reply"
          placeholder="Thank them, and answer anything they raised. Future guests read this."
          value={response}
          onChangeText={setResponse}
        />
      </Sheet>
    </Screen>
  );
}

function SubScore({ label, value }: { label: string; value?: number }) {
  if (!value) return null;
  return (
    <View style={styles.subScore}>
      <Text variant="caption" tone="muted">
        {label.toUpperCase()}
      </Text>
      <View style={styles.subScoreValue}>
        <Ionicons name="star" size={11} color={colors.star} />
        <Text variant="smallStrong">{value.toFixed(1)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xl },

  stats: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xs },

  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  comment: { marginTop: spacing.md },

  subScores: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.md },
  subScore: { gap: 1 },
  subScoreValue: { flexDirection: 'row', alignItems: 'center', gap: 3 },

  response: { backgroundColor: colors.surfaceMuted, padding: spacing.md, borderRadius: radius.md, gap: spacing.xs },
  responseHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },

  replyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },

  quotedReview: {
    padding: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
});
