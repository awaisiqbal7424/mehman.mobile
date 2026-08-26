import { Ionicons } from '../src/components/ui/LucideIcon';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { errorMessage } from '../src/api/client';
import { bookingApi, couponApi, packageApi, pricingOptionApi } from '../src/api/services';
import {
  Button, Card, Divider, ErrorState, FooterBar, Header, Input, Loading, Notice, Row,
  Screen, Text, TextArea, useToast,
} from '../src/components/ui';
import { PLACEHOLDER_IMAGE } from '../src/constants';
import { useAuth } from '../src/store/auth';
import { useSettingsStore, serviceFeeFor } from '../src/store/settingsStore';
import { colors, radius, spacing } from '../src/theme';
import type { CouponValidation } from '../src/types';
import { formatDateRange, formatTravelDate, nightsBetween, pkr, plural } from '../src/utils/format';
import { isSlotBased, packageImages, packagePrice, pricingOptionPrice, typeLabel } from '../src/utils/packages';

/**
 * Review and confirm.
 *
 * The whole price is shown before anything is committed — subtotal, the 2%
 * service fee named as a fee, and the total. Creating the booking does not take
 * any money; it reserves the spot in `PENDING` and hands off to the payment
 * screen. That ordering matters: if the transfer fails or the guest abandons
 * it, there is still a booking the host can see and chase, rather than nothing.
 */
export default function CheckoutScreen() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuth((s) => s.user);
  const feePercentage = useSettingsStore((s) => s.serviceFeePercentage);

  const params = useLocalSearchParams<{
    packageId: string;
    guests: string;
    pricingOptionId?: string;
    availabilityId?: string;
    departureDate?: string;
    checkIn?: string;
    checkOut?: string;
  }>();

  const guests = Number(params.guests ?? 1);
  const [specialRequests, setSpecialRequests] = useState('');
  const [guestName, setGuestName] = useState(
    user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : '',
  );
  const [guestPhone, setGuestPhone] = useState(user?.phoneNumber ?? '');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [applying, setApplying] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const pkg = useQuery({
    queryKey: ['package', params.packageId],
    queryFn: () => packageApi.getById(params.packageId),
    enabled: Boolean(params.packageId),
  });

  const pricingOptions = useQuery({
    queryKey: ['pricing-options', params.packageId],
    queryFn: () => pricingOptionApi.forPackage(params.packageId),
    enabled: Boolean(params.packageId && params.pricingOptionId),
  });
  const pricingOption = pricingOptions.data?.find((option) => option.id === params.pricingOptionId) ?? null;

  const slotBased = isSlotBased(pkg.data?.packageType);
  const basePrice = pkg.data ? packagePrice(pkg.data) : 0;
  const price = pricingOptionPrice(basePrice, pricingOption);
  const nights = useMemo(
    () =>
      params.checkIn && params.checkOut
        ? nightsBetween(new Date(params.checkIn), new Date(params.checkOut))
        : 0,
    [params.checkIn, params.checkOut],
  );

  const subtotal = slotBased ? price * guests : price * nights;
  const fee = serviceFeeFor(subtotal, feePercentage);
  const discount = appliedCoupon?.valid ? (appliedCoupon.discountAmount ?? 0) : 0;
  const total = Math.max(0, subtotal + fee - discount);

  const onApplyPromo = async () => {
    const code = promoCode.trim();
    if (!code || !pkg.data) return;
    setApplying(true);
    setCouponError(null);
    try {
      const result = await couponApi.validate({
        code,
        packageId: pkg.data.id,
        providerId: pkg.data.providerId,
        amount: subtotal,
      });
      if (result.valid) {
        setAppliedCoupon(result);
        toast.success(`"${code.toUpperCase()}" applied`);
      } else {
        setAppliedCoupon(null);
        setCouponError(result.message ?? 'That code is not valid for this booking.');
      }
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(errorMessage(err, 'We could not check that code.'));
    } finally {
      setApplying(false);
    }
  };

  const onRemovePromo = () => {
    setAppliedCoupon(null);
    setPromoCode('');
    setCouponError(null);
  };

  const onConfirm = async () => {
    if (submitting || !pkg.data || !user) return;

    if (!guestPhone.trim()) {
      setPhoneError('The host needs a number to reach you on.');
      return;
    }

    setSubmitting(true);
    try {
      const shared = {
        packageId: pkg.data.id,
        userId: user.id,
        guestName: guestName.trim() || `${user.firstName} ${user.lastName}`.trim(),
        guestEmail: user.email,
        guestPhone: guestPhone.trim(),
        guestCount: guests,
        baseAmount: subtotal,
        serviceFee: fee,
        totalAmount: total,
        pricingOptionId: pricingOption?.id,
        couponCode: appliedCoupon?.valid ? promoCode.trim() : undefined,
        discountAmount: discount || undefined,
        specialRequests: specialRequests.trim() || undefined,
      };

      const booking = slotBased
        ? await bookingApi.createTour({
            ...shared,
            bookingType: pkg.data.packageType,
            availabilityId: params.availabilityId,
            departureDate: params.departureDate,
          })
        : await bookingApi.createStay({
            ...shared,
            bookingType: pkg.data.packageType,
            checkIn: params.checkIn,
            checkOut: params.checkOut,
            nightsCount: nights,
          });

      // Replace, not push: coming "back" to a checkout for a booking that now
      // exists would let someone create a duplicate.
      router.replace(`/payment/${booking.id}`);
    } catch (err) {
      toast.error(errorMessage(err, 'We could not hold that booking.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (pkg.isLoading) return <Loading label="Preparing your booking…" />;
  if (pkg.isError || !pkg.data) {
    return <ErrorState message="We could not load this listing." onRetry={() => void pkg.refetch()} />;
  }

  const item = pkg.data;
  const image = packageImages(item)[0] ?? PLACEHOLDER_IMAGE;
  const when = slotBased
    ? formatTravelDate(params.departureDate)
    : formatDateRange(params.checkIn, params.checkOut);

  return (
    <Screen
      scroll
      footer={
        <FooterBar>
          <View style={styles.totalRow}>
            <View>
              <Text variant="small" tone="muted">
                Total
              </Text>
              <Text variant="heading">{pkr(total)}</Text>
            </View>
            <Button
              label="Confirm booking"
              size="lg"
              loading={submitting}
              onPress={onConfirm}
              style={styles.confirmButton}
            />
          </View>
        </FooterBar>
      }
    >
      <Header title="Review your booking" onBack={() => router.back()} />

      <View style={styles.body}>
        {/* ── what is being booked ────────────────────────────────────── */}
        <Card padded={false}>
          <View style={styles.summary}>
            <Image source={{ uri: image }} style={styles.thumb} contentFit="cover" transition={200} />
            <View style={styles.flex}>
              <Text variant="caption" tone="primary">
                {typeLabel(item.packageType).toUpperCase()}
              </Text>
              <Text variant="bodyStrong" numberOfLines={2}>
                {item.name}
              </Text>
              {item.provider?.name ? (
                <Text variant="small" tone="muted" numberOfLines={1}>
                  {item.provider.name}
                </Text>
              ) : null}
            </View>
          </View>

          <Divider style={styles.noMargin} />

          <View style={styles.details}>
            <Row label={slotBased ? 'Departure' : 'Your dates'} value={when} icon="calendar-outline" />
            <Row label="Guests" value={plural(guests, 'guest')} icon="people-outline" />
            {!slotBased ? <Row label="Nights" value={plural(nights, 'night')} icon="moon-outline" /> : null}
          </View>
        </Card>

        {/* ── who to contact ──────────────────────────────────────────── */}
        <View style={styles.block}>
          <Text variant="heading">Contact details</Text>
          <Text variant="small" tone="secondary" style={styles.blockHint}>
            The host uses these to confirm your booking and reach you on the day.
          </Text>

          <Input
            label="Lead guest"
            icon="person-outline"
            placeholder="Full name"
            value={guestName}
            onChangeText={setGuestName}
            autoCapitalize="words"
            containerStyle={styles.field}
          />
          <Input
            label="Mobile number"
            icon="call-outline"
            placeholder="0336 5364506"
            value={guestPhone}
            onChangeText={(value) => {
              setGuestPhone(value);
              setPhoneError(null);
            }}
            error={phoneError ?? undefined}
            keyboardType="phone-pad"
            containerStyle={styles.field}
          />
          <TextArea
            label="Anything the host should know?"
            placeholder="Dietary needs, arrival time, travelling with children…"
            value={specialRequests}
            onChangeText={setSpecialRequests}
            containerStyle={styles.field}
          />
        </View>

        {/* ── promo code ──────────────────────────────────────────────── */}
        <View style={styles.block}>
          <Text variant="heading">Promo code</Text>
          {appliedCoupon?.valid ? (
            <View style={styles.promoApplied}>
              <Ionicons name="pricetag" size={18} color={colors.success} />
              <Text variant="bodyStrong" style={styles.flex}>
                {promoCode.trim().toUpperCase()} applied — {pkr(discount)} off
              </Text>
              <Button label="Remove" variant="ghost" size="sm" onPress={onRemovePromo} />
            </View>
          ) : (
            <View style={styles.promoRow}>
              <Input
                placeholder="Enter a code"
                value={promoCode}
                onChangeText={(value) => {
                  setPromoCode(value);
                  setCouponError(null);
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                error={couponError ?? undefined}
                containerStyle={styles.flex}
              />
              <Button
                label="Apply"
                variant="outline"
                loading={applying}
                disabled={!promoCode.trim()}
                onPress={() => void onApplyPromo()}
                style={styles.promoButton}
              />
            </View>
          )}
        </View>

        {/* ── the price ───────────────────────────────────────────────── */}
        <Card style={styles.block}>
          <Text variant="heading" style={styles.priceTitle}>
            Price details
          </Text>
          {pricingOption ? (
            <Row label="Pricing option" value={pricingOption.label} />
          ) : null}
          <Row
            label={
              slotBased
                ? `${pkr(price)} × ${plural(guests, 'guest')}`
                : `${pkr(price)} × ${plural(nights, 'night')}`
            }
            value={pkr(subtotal)}
          />
          <Row label={`Mehman service fee (${feePercentage}%)`} value={pkr(fee)} />
          {discount > 0 ? <Row label="Promo discount" value={`− ${pkr(discount)}`} /> : null}
          <Divider />
          <Row label="Total to pay" value={pkr(total)} strong />
        </Card>

        <Notice
          tone="info"
          icon="shield-checkmark-outline"
          title="Nothing is charged yet"
          message="Confirming holds your place. You will transfer the amount on the next screen, and the host confirms once it lands."
        />

        {item.cancellationPolicy ? (
          <View style={styles.policy}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
            <Text variant="small" tone="muted" style={styles.flex}>
              {item.cancellationPolicy}
            </Text>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: spacing.lg, gap: spacing.xl, paddingTop: spacing.sm },

  summary: { flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  thumb: { width: 76, height: 76, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  details: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  noMargin: { marginVertical: 0 },

  block: { gap: spacing.sm },
  blockHint: { marginBottom: spacing.sm },
  field: { marginBottom: spacing.md },
  priceTitle: { marginBottom: spacing.sm },
  promoRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  promoButton: { marginTop: 3 },
  promoApplied: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.successSoft,
  },

  policy: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', marginBottom: spacing.lg },

  totalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  confirmButton: { flex: 1 },
});
