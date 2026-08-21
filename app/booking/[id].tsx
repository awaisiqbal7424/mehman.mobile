import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { errorMessage } from '../../src/api/client';
import { bookingApi, messageApi, paymentApi, reviewApi } from '../../src/api/services';
import {
  Badge, Button, Card, ConfirmSheet, Divider, ErrorState, Header, Loading, Notice, Row,
  Screen, Sheet, Text, TextArea, useToast,
} from '../../src/components/ui';
import { PLACEHOLDER_IMAGE, whatsAppUrl } from '../../src/constants';
import { useAuth } from '../../src/store/auth';
import { colors, radius, spacing } from '../../src/theme';
import { formatDateRange, formatTravelDate, pkr, plural } from '../../src/utils/format';
import { BOOKING_STATUS, packageImages, typeLabel } from '../../src/utils/packages';

/**
 * One booking, in full.
 *
 * What this screen offers changes with the booking's state, because the useful
 * action does: pay while it is unpaid, message the host while it is upcoming,
 * leave a review once it is done. Showing all of them all of the time would
 * mean showing three buttons that are wrong two thirds of the time.
 */
export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const user = useAuth((s) => s.user);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [postingReview, setPostingReview] = useState(false);

  const booking = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingApi.getById(id),
    enabled: Boolean(id),
  });

  const payments = useQuery({
    queryKey: ['payments', id],
    queryFn: () => paymentApi.forBooking(id),
    enabled: Boolean(id),
  });

  const onCancel = async () => {
    setCancelling(true);
    try {
      await bookingApi.cancel(id, 'Cancelled by the guest from the app');
      await queryClient.invalidateQueries({ queryKey: ['booking', id] });
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      toast.success('Your booking has been cancelled');
      setCancelOpen(false);
    } catch (err) {
      toast.error(errorMessage(err, 'We could not cancel that booking.'));
    } finally {
      setCancelling(false);
    }
  };

  const onMessageHost = async () => {
    const providerId = booking.data?.package?.providerId;
    const hostId = booking.data?.package?.provider?.providerOwnerId;
    if (!user || !providerId || !hostId) {
      toast.error('This host cannot be messaged just yet.');
      return;
    }
    try {
      const conversation = await messageApi.openWithProvider(user.id, hostId, providerId);
      router.push(`/chat/${conversation.id}`);
    } catch {
      toast.error('We could not open that conversation.');
    }
  };

  const onSubmitReview = async () => {
    if (postingReview || !booking.data) return;
    setPostingReview(true);
    try {
      await reviewApi.create({
        bookingId: id,
        providerId: booking.data.package?.providerId,
        packageId: booking.data.packageId,
        reviewerId: user?.id,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });
      toast.success('Thank you — your review is with us');
      setReviewOpen(false);
      setReviewComment('');
    } catch (err) {
      toast.error(errorMessage(err, 'We could not post that review.'));
    } finally {
      setPostingReview(false);
    }
  };

  if (booking.isLoading) return <Loading label="Loading your booking…" />;
  if (booking.isError || !booking.data) {
    return <ErrorState message="We could not find that booking." onRetry={() => void booking.refetch()} />;
  }

  const item = booking.data;
  const status = BOOKING_STATUS[item.status ?? ''] ?? { label: item.status ?? '—', tone: 'neutral' as const };
  const image = packageImages(item.package)[0] ?? PLACEHOLDER_IMAGE;
  const when = item.departureDate
    ? formatTravelDate(item.departureDate)
    : formatDateRange(item.checkIn, item.checkOut);

  const paid = payments.data?.some((p) => p.status === 'COMPLETED') ?? false;
  const awaitingPayment = item.status === 'PENDING' && !paid;
  const cancellable = item.status === 'PENDING' || item.status === 'CONFIRMED';
  const reviewable = item.status === 'COMPLETED';

  return (
    <View style={styles.root}>
      <Screen scroll>
        <Header title="Booking details" onBack={() => (router.canGoBack() ? router.back() : router.replace('/(guest)/trips'))} />

        <View style={styles.body}>
          {/* ── state first ─────────────────────────────────────────────── */}
          {awaitingPayment ? (
            <Notice
              tone="warning"
              icon="hourglass-outline"
              title="Payment not received"
              message="Your place is held, but the host confirms only once the transfer clears."
              action={
                <Button
                  label="Pay now"
                  size="sm"
                  style={styles.noticeButton}
                  onPress={() => router.push(`/payment/${id}`)}
                />
              }
            />
          ) : item.status === 'CONFIRMED' ? (
            <Notice
              tone="success"
              icon="checkmark-circle-outline"
              title="Confirmed"
              message="You are all set. The host has your details and will be in touch before the day."
            />
          ) : item.status === 'CANCELLED' ? (
            <Notice
              tone="danger"
              icon="close-circle-outline"
              title="Cancelled"
              message={item.cancellationReason ?? 'This booking was cancelled.'}
            />
          ) : null}

          {/* ── the listing ─────────────────────────────────────────────── */}
          <Card padded={false} onPress={() => item.packageId && router.push(`/package/${item.packageId}`)}>
            <Image source={{ uri: image }} style={styles.hero} contentFit="cover" transition={220} />
            <View style={styles.summary}>
              <View style={styles.summaryTop}>
                <Text variant="caption" tone="primary">
                  {typeLabel(item.package?.packageType ?? item.bookingType).toUpperCase()}
                </Text>
                <Badge label={status.label} tone={status.tone} />
              </View>
              <Text variant="heading">{item.package?.name ?? item.name ?? 'Your booking'}</Text>
              {item.package?.provider?.name ? (
                <Text variant="small" tone="muted">
                  Hosted by {item.package.provider.name}
                </Text>
              ) : null}
            </View>
          </Card>

          {/* ── the facts ───────────────────────────────────────────────── */}
          <Card>
            <Text variant="heading" style={styles.cardTitle}>
              Your trip
            </Text>
            <Row label={item.departureDate ? 'Departure' : 'Dates'} value={when} icon="calendar-outline" />
            {item.nightsCount ? (
              <Row label="Nights" value={plural(item.nightsCount, 'night')} icon="moon-outline" />
            ) : null}
            <Row label="Guests" value={plural(item.guestCount ?? 1, 'guest')} icon="people-outline" />
            <Row label="Reference" value={String(id).slice(0, 8).toUpperCase()} icon="pricetag-outline" />
            {item.package?.meetingPoint ? (
              <Row label="Meeting point" value={item.package.meetingPoint} icon="flag-outline" />
            ) : null}
            {item.specialRequests ? (
              <>
                <Divider />
                <Text variant="caption" tone="muted">
                  YOUR NOTE TO THE HOST
                </Text>
                <Text variant="small" tone="secondary">
                  {item.specialRequests}
                </Text>
              </>
            ) : null}
          </Card>

          {/* ── the money ───────────────────────────────────────────────── */}
          <Card>
            <Text variant="heading" style={styles.cardTitle}>
              Payment
            </Text>
            <Row label="Subtotal" value={pkr(item.baseAmount)} />
            <Row label="Service fee" value={pkr(item.serviceFee)} />
            <Divider />
            <Row label="Total" value={pkr(item.totalAmount)} strong />
            <Row
              label="Status"
              value={paid ? 'Paid' : awaitingPayment ? 'Awaiting transfer' : 'Under verification'}
              tone={paid ? 'success' : 'default'}
            />
          </Card>

          {/* ── what to do next ─────────────────────────────────────────── */}
          <View style={styles.actions}>
            {awaitingPayment ? (
              <Button
                label="Complete payment"
                size="lg"
                fullWidth
                icon="wallet-outline"
                onPress={() => router.push(`/payment/${id}`)}
              />
            ) : null}

            {reviewable ? (
              <Button
                label="Leave a review"
                size="lg"
                fullWidth
                icon="star-outline"
                onPress={() => setReviewOpen(true)}
              />
            ) : null}

            <Button
              label="Message the host"
              variant="outline"
              fullWidth
              icon="chatbubble-ellipses-outline"
              onPress={() => void onMessageHost()}
            />

            <Button
              label="Get help on WhatsApp"
              variant="ghost"
              fullWidth
              icon="logo-whatsapp"
              onPress={() =>
                void Linking.openURL(
                  whatsAppUrl(`Hello Mehman, I need help with booking ${String(id).slice(0, 8).toUpperCase()}.`),
                )
              }
            />

            {cancellable ? (
              <Button
                label="Cancel this booking"
                variant="ghost"
                fullWidth
                onPress={() => setCancelOpen(true)}
                style={styles.cancelButton}
              />
            ) : null}
          </View>

          {item.package?.cancellationPolicy ? (
            <View style={styles.policy}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
              <Text variant="small" tone="muted" style={styles.flex}>
                {item.package.cancellationPolicy}
              </Text>
            </View>
          ) : null}
        </View>
      </Screen>

      <ConfirmSheet
        visible={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => void onCancel()}
        title="Cancel this booking?"
        message="The host will be told straight away. Any refund follows the cancellation policy on the listing, and we will be in touch about it."
        confirmLabel="Yes, cancel it"
        cancelLabel="Keep my booking"
        destructive
        loading={cancelling}
      />

      {/* ── review sheet ──────────────────────────────────────────────── */}
      <Sheet
        visible={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title="How was it?"
        subtitle={item.package?.name ?? undefined}
        footer={
          <Button
            label="Post review"
            size="lg"
            fullWidth
            loading={postingReview}
            onPress={() => void onSubmitReview()}
          />
        }
      >
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Ionicons
              key={value}
              name={value <= reviewRating ? 'star' : 'star-outline'}
              size={34}
              color={colors.star}
              accessibilityRole="button"
              accessibilityLabel={`${value} ${value === 1 ? 'star' : 'stars'}`}
              onPress={() => setReviewRating(value)}
            />
          ))}
        </View>
        <TextArea
          label="Tell other travellers about it"
          placeholder="What stood out? What should they know before they go?"
          value={reviewComment}
          onChangeText={setReviewComment}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  body: { paddingHorizontal: spacing.lg, gap: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl },

  hero: { width: '100%', height: 160, backgroundColor: colors.surfaceMuted },
  summary: { padding: spacing.lg, gap: spacing.xs },
  summaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },

  cardTitle: { marginBottom: spacing.sm },
  noticeButton: { alignSelf: 'flex-start', marginTop: spacing.md },

  actions: { gap: spacing.md, marginTop: spacing.sm },
  cancelButton: { marginTop: -spacing.xs },

  policy: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    padding: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
  },

  stars: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.md },
});
