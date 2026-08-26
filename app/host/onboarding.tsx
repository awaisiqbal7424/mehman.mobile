import { Ionicons } from '../../src/components/ui/LucideIcon';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { errorMessage } from '../../src/api/client';
import { providerApi } from '../../src/api/services';
import {
  Button, Card, Divider, FooterBar, Header, Input, Notice, Row, Screen, Text, TextArea,
  useToast,
} from '../../src/components/ui';
import { useAuth } from '../../src/store/auth';
import { colors, radius, spacing } from '../../src/theme';

const STEPS = ['Your business', 'Where you are', 'Getting paid', 'Review'] as const;

/**
 * Becoming a Mezban.
 *
 * Four steps, and the bank details come before the review rather than after
 * approval, because a business approved without a payout account is a host who
 * cannot be paid — which we only discover when they have already earned
 * something. The application goes in as `PENDING`; nothing here grants access
 * to the host panel.
 */
export default function HostOnboardingScreen() {
  const router = useRouter();
  const toast = useToast();

  const user = useAuth((s) => s.user);
  const refreshProviders = useAuth((s) => s.refreshProviders);
  const providerStatus = useAuth((s) => s.providerStatus);

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [typeId, setTypeId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [isTourOperator, setIsTourOperator] = useState(false);
  const [licenseNumber, setLicenseNumber] = useState('');

  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [city, setCity] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [district, setDistrict] = useState('');

  const [bankName, setBankName] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [iban, setIban] = useState('');

  const types = useQuery({ queryKey: ['provider-types'], queryFn: () => providerApi.getTypes() });
  const categories = useQuery({
    queryKey: ['provider-categories', typeId],
    queryFn: () => providerApi.getCategories(typeId ?? undefined),
    enabled: Boolean(typeId),
  });

  // A tour operator is the type that can be assigned custom trips, so the flag
  // is derived from the chosen type rather than asked about separately.
  useEffect(() => {
    const chosen = types.data?.find((type) => type.id === typeId);
    if (chosen) setIsTourOperator(/tour|operator|agency/i.test(chosen.typeName));
  }, [typeId, types.data]);

  const canProceed = useMemo(() => {
    if (step === 0) return name.trim().length > 1 && Boolean(typeId);
    if (step === 1) return city.trim().length > 1 && phoneNumber.trim().length > 5;
    return true;
  }, [city, name, phoneNumber, step, typeId]);

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Your business needs a name.';
    if (!city.trim()) next.city = 'Which city are you based in?';
    if (!phoneNumber.trim()) next.phoneNumber = 'We need a number to reach you on.';
    setErrors(next);
    if (Object.keys(next).length) {
      setStep(next.name ? 0 : 1);
      return;
    }

    setSubmitting(true);
    try {
      await providerApi.register({
        providerOwnerId: user?.id,
        ownerName: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        providerTypeId: typeId ?? undefined,
        providerCategoryId: categoryId ?? undefined,
        isTourOperator,
        isCustomTripEligible: isTourOperator,
        licenseNumber: licenseNumber.trim() || undefined,
        email: email.trim() || undefined,
        phoneNumber: phoneNumber.trim(),
        city: city.trim(),
        streetAddress: streetAddress.trim() || undefined,
        district: district.trim() || undefined,
        country: 'Pakistan',
        bankName: bankName.trim() || undefined,
        accountHolderName: accountHolderName.trim() || undefined,
        iban: iban.trim() || undefined,
        isPending: true,
        isApproved: false,
      });

      await refreshProviders();
      toast.success('Application sent — we will be in touch');
      router.replace('/(guest)/profile');
    } catch (err) {
      toast.error(errorMessage(err, 'We could not send that application.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <Screen scroll padded>
        <Header title="Become a Mezban" onBack={() => router.back()} />
        <Notice
          tone="info"
          icon="person-outline"
          title="Sign in first"
          message="Hosting is tied to your Mehman account, so we need you signed in before you apply."
          action={
            <Button
              label="Sign in"
              size="sm"
              style={styles.noticeButton}
              onPress={() => router.replace('/sign-in?redirect=/host/onboarding')}
            />
          }
        />
      </Screen>
    );
  }

  if (providerStatus !== 'none') {
    return (
      <Screen scroll padded>
        <Header title="Become a Mezban" onBack={() => router.back()} />
        <Notice
          tone={providerStatus === 'approved' ? 'success' : 'warning'}
          icon={providerStatus === 'approved' ? 'checkmark-circle-outline' : 'hourglass-outline'}
          title={providerStatus === 'approved' ? 'You are already a Mezban' : 'Your application is with us'}
          message={
            providerStatus === 'approved'
              ? 'Switch to Mezban from your profile to manage listings and bookings.'
              : 'We review new businesses within a couple of days and will let you know by email.'
          }
        />
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      footer={
        <FooterBar>
          <View style={styles.footerRow}>
            {step > 0 ? (
              <Button label="Back" variant="outline" onPress={() => setStep(step - 1)} style={styles.backButton} />
            ) : null}
            {step < STEPS.length - 1 ? (
              <Button
                label="Continue"
                size="lg"
                iconAfter="arrow-forward"
                disabled={!canProceed}
                onPress={() => setStep(step + 1)}
                style={styles.flex}
              />
            ) : (
              <Button
                label="Send application"
                size="lg"
                icon="paper-plane-outline"
                loading={submitting}
                onPress={() => void submit()}
                style={styles.flex}
              />
            )}
          </View>
        </FooterBar>
      }
    >
      <Header
        title="Become a Mezban"
        subtitle={`Step ${step + 1} of ${STEPS.length} · ${STEPS[step]}`}
        onBack={() => (step > 0 ? setStep(step - 1) : router.back())}
      />

      <View style={styles.progress}>
        {STEPS.map((label, index) => (
          <View
            key={label}
            style={[styles.progressBar, index === step && styles.progressCurrent, index < step && styles.progressDone]}
          />
        ))}
      </View>

      <View style={styles.body}>
        {/* ── 0 · the business ────────────────────────────────────────── */}
        {step === 0 ? (
          <>
            <Text variant="title">Tell us about your business</Text>

            <Input
              label="Business name"
              icon="business-outline"
              placeholder="Karakoram Expeditions"
              value={name}
              onChangeText={setName}
              error={errors.name}
              autoCapitalize="words"
            />

            <View style={styles.field}>
              <Text variant="smallStrong" tone="secondary" style={styles.fieldLabel}>
                What do you run?
              </Text>
              <View style={styles.chips}>
                {types.data?.map((type) => {
                  const selected = typeId === type.id;
                  return (
                    <Pressable
                      key={type.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        setTypeId(type.id);
                        setCategoryId(null);
                      }}
                      style={[styles.chip, selected && styles.chipOn]}
                    >
                      <Text variant="smallStrong" tone={selected ? 'inverse' : 'default'}>
                        {type.typeName}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {categories.data?.length ? (
              <View style={styles.field}>
                <Text variant="smallStrong" tone="secondary" style={styles.fieldLabel}>
                  Category
                </Text>
                <View style={styles.chips}>
                  {categories.data.map((category) => {
                    const selected = categoryId === category.id;
                    return (
                      <Pressable
                        key={category.id}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        onPress={() => setCategoryId(category.id)}
                        style={[styles.chip, selected && styles.chipOn]}
                      >
                        <Text variant="smallStrong" tone={selected ? 'inverse' : 'default'}>
                          {category.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <TextArea
              label="What do you offer?"
              placeholder="How long have you been running, what do you specialise in, what makes guests come back?"
              value={description}
              onChangeText={setDescription}
            />

            <Input
              label="Licence number"
              icon="ribbon-outline"
              placeholder="Optional, but it speeds approval up"
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              autoCapitalize="characters"
            />
          </>
        ) : null}

        {/* ── 1 · location ────────────────────────────────────────────── */}
        {step === 1 ? (
          <>
            <Text variant="title">Where are you, and how do we reach you?</Text>

            <Input
              label="City"
              icon="location-outline"
              placeholder="Gilgit, Skardu, Islamabad…"
              value={city}
              onChangeText={setCity}
              error={errors.city}
              autoCapitalize="words"
            />
            <Input
              label="District or region"
              icon="map-outline"
              placeholder="Gilgit-Baltistan"
              value={district}
              onChangeText={setDistrict}
              autoCapitalize="words"
            />
            <Input
              label="Street address"
              icon="home-outline"
              placeholder="Where guests or we would find you"
              value={streetAddress}
              onChangeText={setStreetAddress}
            />

            <Divider />

            <Input
              label="Business phone"
              icon="call-outline"
              placeholder="0336 5364506"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              error={errors.phoneNumber}
              keyboardType="phone-pad"
            />
            <Input
              label="Business email"
              icon="mail-outline"
              placeholder="bookings@yourbusiness.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </>
        ) : null}

        {/* ── 2 · payout ──────────────────────────────────────────────── */}
        {step === 2 ? (
          <>
            <Text variant="title">Where should we send your earnings?</Text>

            <Notice
              tone="info"
              icon="lock-closed-outline"
              title="Only we see this"
              message="Guests never see your bank details. We use them to pay out what you have earned, minus our commission."
            />

            <Input
              label="Bank name"
              icon="business-outline"
              placeholder="Habib Bank, Meezan, Bank Alfalah…"
              value={bankName}
              onChangeText={setBankName}
              autoCapitalize="words"
            />
            <Input
              label="Account holder"
              icon="person-outline"
              placeholder="Exactly as it appears on the account"
              value={accountHolderName}
              onChangeText={setAccountHolderName}
              autoCapitalize="words"
            />
            <Input
              label="IBAN"
              icon="card-outline"
              placeholder="PK00 XXXX 0000 0000 0000 0000"
              value={iban}
              onChangeText={setIban}
              autoCapitalize="characters"
              hint="You can add this later, but we cannot pay you until it is here."
            />
          </>
        ) : null}

        {/* ── 3 · review ──────────────────────────────────────────────── */}
        {step === 3 ? (
          <>
            <Text variant="title">Ready to send?</Text>
            <Text variant="small" tone="secondary">
              We check every business before it can list. It usually takes a day or two, and we will email you
              either way.
            </Text>

            <Card>
              <Row label="Business" value={name} />
              <Row label="Type" value={types.data?.find((t) => t.id === typeId)?.typeName} />
              {categoryId ? (
                <Row label="Category" value={categories.data?.find((c) => c.id === categoryId)?.name} />
              ) : null}
              {licenseNumber ? <Row label="Licence" value={licenseNumber} /> : null}
              <Divider />
              <Row label="City" value={city} />
              {district ? <Row label="Region" value={district} /> : null}
              <Row label="Phone" value={phoneNumber} />
              {email ? <Row label="Email" value={email} /> : null}
              <Divider />
              <Row label="Bank" value={bankName || 'To be added'} />
              <Row label="IBAN" value={iban || 'To be added'} />
            </Card>

            <View style={styles.terms}>
              <Ionicons name="shield-checkmark-outline" size={17} color={colors.textMuted} />
              <Text variant="small" tone="muted" style={styles.flex}>
                By applying you agree to Mehman's host terms, including our commission on each booking and the
                cancellation policy you set on your listings.
              </Text>
            </View>
          </>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  progress: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  progressBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressCurrent: { backgroundColor: colors.primary },
  progressDone: { backgroundColor: colors.success },

  body: { paddingHorizontal: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl },
  field: { gap: spacing.sm },
  fieldLabel: { marginLeft: spacing.xs },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },

  terms: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', marginTop: spacing.sm },
  noticeButton: { alignSelf: 'flex-start', marginTop: spacing.md },

  footerRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  backButton: { minWidth: 96 },
});
