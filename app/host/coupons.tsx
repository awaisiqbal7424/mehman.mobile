import { Ionicons } from '../../src/components/ui/LucideIcon';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { errorMessage } from '../../src/api/client';
import { couponApi } from '../../src/api/services';
import {
  Badge, Button, Card, ConfirmSheet, EmptyState, ErrorState, Header, Input, Loading, Screen,
  Sheet, Text, useToast,
} from '../../src/components/ui';
import { useAuth } from '../../src/store/auth';
import { colors, radius, spacing } from '../../src/theme';
import type { Coupon } from '../../src/types';
import { pkr } from '../../src/utils/format';

const DISCOUNT_TYPES = [
  { id: 'PERCENTAGE', label: 'Percentage off' },
  { id: 'FIXED', label: 'Fixed amount off' },
] as const;

/**
 * Promo codes a host can hand out — a fixed or percentage discount, scoped to
 * their own listings, with an optional expiry and a cap on how many times it
 * can be redeemed.
 */
export default function HostCouponsScreen() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const provider = useAuth((s) => s.provider);

  const coupons = useQuery({
    queryKey: ['host-coupons', provider?.id],
    queryFn: () => couponApi.forProvider(provider!.id),
    enabled: Boolean(provider),
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<(typeof DISCOUNT_TYPES)[number]['id']>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [minBookingAmount, setMinBookingAmount] = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ code?: string; value?: string }>({});
  const [deleting, setDeleting] = useState<Coupon | null>(null);
  const [busy, setBusy] = useState(false);

  const openNew = () => {
    setEditing(null);
    setCode('');
    setDiscountType('PERCENTAGE');
    setDiscountValue('');
    setMaxUses('');
    setMinBookingAmount('');
    setExpiresOn('');
    setErrors({});
    setSheetOpen(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditing(coupon);
    setCode(coupon.code ?? '');
    setDiscountType((coupon.discountType as (typeof DISCOUNT_TYPES)[number]['id']) ?? 'PERCENTAGE');
    setDiscountValue(String(coupon.discountValue ?? ''));
    setMaxUses(coupon.maxUses ? String(coupon.maxUses) : '');
    setMinBookingAmount(coupon.minBookingAmount ? String(coupon.minBookingAmount) : '');
    setExpiresOn(coupon.endDate ?? '');
    setErrors({});
    setSheetOpen(true);
  };

  const save = async () => {
    const next: typeof errors = {};
    if (!code.trim()) next.code = 'Give guests a code to type in.';
    if (!discountValue || Number(discountValue) <= 0) next.value = 'Set a discount amount.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const payload: Partial<Coupon> = {
        providerId: provider?.id,
        code: code.trim().toUpperCase(),
        discountType,
        discountValue: Number(discountValue),
        maxUses: maxUses ? Number(maxUses) : undefined,
        minBookingAmount: minBookingAmount ? Number(minBookingAmount) : undefined,
        endDate: expiresOn.trim() || undefined,
        isActive: true,
      };

      if (editing) await couponApi.update(editing.id, payload);
      else await couponApi.create(payload);

      await queryClient.invalidateQueries({ queryKey: ['host-coupons'] });
      toast.success(editing ? 'Coupon updated' : 'Coupon created');
      setSheetOpen(false);
    } catch (err) {
      toast.error(errorMessage(err, 'We could not save that coupon.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    try {
      await couponApi.update(coupon.id, { ...coupon, isActive: !coupon.isActive });
      await queryClient.invalidateQueries({ queryKey: ['host-coupons'] });
      toast.success(coupon.isActive ? 'Coupon turned off' : 'Coupon turned on');
    } catch (err) {
      toast.error(errorMessage(err, 'We could not update that coupon.'));
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await couponApi.remove(deleting.id);
      await queryClient.invalidateQueries({ queryKey: ['host-coupons'] });
      toast.success('Coupon deleted');
      setDeleting(null);
    } catch (err) {
      toast.error(errorMessage(err, 'We could not delete that coupon.'));
    } finally {
      setBusy(false);
    }
  };

  const items = coupons.data ?? [];

  return (
    <Screen scroll refreshing={coupons.isRefetching} onRefresh={() => void coupons.refetch()}>
      <Header title="Coupons" onBack={() => router.back()} />

      <View style={styles.body}>
        <Button label="Create a coupon" size="lg" fullWidth icon="pricetag-outline" onPress={openNew} />

        {coupons.isLoading ? (
          <Loading label="Loading your coupons…" />
        ) : coupons.isError ? (
          <ErrorState message="We could not load your coupons." onRetry={() => void coupons.refetch()} />
        ) : items.length ? (
          items.map((coupon) => (
            <Card key={coupon.id} onPress={() => openEdit(coupon)}>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <View style={styles.codeRow}>
                    <Text variant="bodyStrong">{coupon.code}</Text>
                    <Badge
                      label={coupon.isActive ? 'Active' : 'Off'}
                      tone={coupon.isActive ? 'success' : 'neutral'}
                    />
                  </View>
                  <Text variant="small" tone="muted">
                    {coupon.discountType === 'FIXED'
                      ? `${pkr(coupon.discountValue)} off`
                      : `${coupon.discountValue}% off`}
                    {coupon.maxUses ? ` · ${coupon.usedCount ?? 0}/${coupon.maxUses} used` : ''}
                    {coupon.endDate ? ` · expires ${coupon.endDate}` : ''}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={coupon.isActive ? `Turn off ${coupon.code}` : `Turn on ${coupon.code}`}
                  hitSlop={8}
                  onPress={() => void toggleActive(coupon)}
                >
                  <Ionicons
                    name={coupon.isActive ? 'toggle' : 'toggle-outline'}
                    size={30}
                    color={coupon.isActive ? colors.primary : colors.textMuted}
                  />
                </Pressable>
              </View>
            </Card>
          ))
        ) : (
          <EmptyState
            icon="pricetag-outline"
            title="No coupons yet"
            message="Create a code guests can enter at checkout for a discount."
            actionLabel="Create a coupon"
            onAction={openNew}
          />
        )}
      </View>

      <Sheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? 'Edit coupon' : 'Create a coupon'}
        footer={
          <Button
            label={editing ? 'Save changes' : 'Create coupon'}
            size="lg"
            fullWidth
            loading={saving}
            onPress={() => void save()}
          />
        }
      >
        <Input
          label="Code"
          placeholder="WELCOME10"
          value={code}
          onChangeText={setCode}
          error={errors.code}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <View style={styles.typeRow}>
          {DISCOUNT_TYPES.map((option) => {
            const selected = discountType === option.id;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setDiscountType(option.id)}
                style={[styles.typeTile, selected && styles.typeTileOn]}
              >
                <Text variant="smallStrong" tone={selected ? 'primary' : 'default'} center>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Input
          label={discountType === 'FIXED' ? 'Amount off (PKR)' : 'Percentage off'}
          icon={discountType === 'FIXED' ? 'cash-outline' : 'calculator-outline'}
          placeholder="0"
          value={discountValue}
          onChangeText={setDiscountValue}
          keyboardType="number-pad"
          error={errors.value}
        />
        <Input
          label="Maximum redemptions (optional)"
          icon="repeat-outline"
          placeholder="Unlimited"
          value={maxUses}
          onChangeText={setMaxUses}
          keyboardType="number-pad"
        />
        <Input
          label="Minimum booking amount (optional)"
          icon="wallet-outline"
          placeholder="No minimum"
          value={minBookingAmount}
          onChangeText={setMinBookingAmount}
          keyboardType="number-pad"
        />
        <Input
          label="Expires on (optional)"
          icon="calendar-outline"
          placeholder="YYYY-MM-DD"
          value={expiresOn}
          onChangeText={setExpiresOn}
        />

        {editing ? (
          <Button
            label="Delete this coupon"
            variant="danger"
            icon="trash-outline"
            onPress={() => {
              setSheetOpen(false);
              setDeleting(editing);
            }}
          />
        ) : null}
      </Sheet>

      <ConfirmSheet
        visible={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => void remove()}
        title="Delete this coupon?"
        message="Guests will no longer be able to redeem this code. This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={busy}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md, paddingBottom: spacing.xl },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeTile: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeTileOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
});
