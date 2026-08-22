import { Ionicons } from '../../src/components/ui/LucideIcon';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { errorMessage } from '../../src/api/client';
import { providerApi, verificationApi, type PayoutMethod } from '../../src/api/services';
import {
  Avatar, Badge, Button, Card, Chip, Divider, FooterBar, Header, Input, Notice, Screen, Text,
  TextArea, useToast,
} from '../../src/components/ui';
import { whatsAppUrl } from '../../src/constants';
import { useAuth } from '../../src/store/auth';
import { colors, radius, spacing } from '../../src/theme';
import { formatCnic, formatMobile, isValidCnic, isValidMobile } from '../../src/utils/format';

const MAX_SCAN_BYTES = 8 * 1024 * 1024;
const WALLET_PROVIDERS = ['Easypaisa', 'JazzCash'];

/**
 * The business profile a host can edit themselves.
 *
 * Approval status, commission rate and the tour-operator flag are read-only
 * here — they are Mehman's to set, and a form that appears to let a host change
 * their own commission is worse than one that does not show it at all.
 */
export default function HostProfileScreen() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const provider = useAuth((s) => s.provider);
  const refreshProviders = useAuth((s) => s.refreshProviders);

  const [name, setName] = useState(provider?.name ?? '');
  const [description, setDescription] = useState(provider?.description ?? '');
  const [phoneNumber, setPhoneNumber] = useState(provider?.phoneNumber ?? '');
  const [email, setEmail] = useState(provider?.email ?? '');
  const [city, setCity] = useState(provider?.city ?? '');
  const [streetAddress, setStreetAddress] = useState(provider?.streetAddress ?? '');
  const [openTime, setOpenTime] = useState(provider?.openTime ?? '');
  const [closeTime, setCloseTime] = useState(provider?.closeTime ?? '');
  const [bankName, setBankName] = useState(provider?.bankName ?? '');
  const [accountHolderName, setAccountHolderName] = useState(provider?.accountHolderName ?? '');
  const [iban, setIban] = useState(provider?.iban ?? '');
  const [swiftCode, setSwiftCode] = useState(provider?.swiftCode ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!provider) return;
    setSaving(true);
    try {
      await providerApi.update(provider.id, {
        ...provider,
        name: name.trim(),
        description: description.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        email: email.trim() || undefined,
        city: city.trim() || undefined,
        streetAddress: streetAddress.trim() || undefined,
        openTime: openTime.trim() || undefined,
        closeTime: closeTime.trim() || undefined,
        bankName: bankName.trim() || undefined,
        accountHolderName: accountHolderName.trim() || undefined,
        iban: iban.trim() || undefined,
        swiftCode: swiftCode.trim() || undefined,
      });
      await refreshProviders();
      await queryClient.invalidateQueries({ queryKey: ['provider', provider.id] });
      toast.success('Business profile updated');
    } catch (err) {
      toast.error(errorMessage(err, 'We could not save those changes.'));
    } finally {
      setSaving(false);
    }
  };

  if (!provider) {
    return (
      <Screen scroll padded>
        <Header title="Business profile" onBack={() => router.back()} />
        <Notice
          tone="warning"
          icon="business-outline"
          title="No business yet"
          message="Apply to become a host and this is where you will manage your business details."
        />
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      footer={
        <FooterBar>
          <Button label="Save changes" size="lg" fullWidth loading={saving} onPress={() => void save()} />
        </FooterBar>
      }
    >
      <Header
        title="Business profile"
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(host)/more'))}
      />

      <View style={styles.body}>
        <Card>
          <View style={styles.identity}>
            <Avatar uri={provider.logoUrl} name={provider.name} size={56} />
            <View style={styles.flex}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {provider.name}
              </Text>
              <Text variant="small" tone="muted">
                {provider.isTourOperator ? 'Tour operator' : 'Host'}
                {provider.adminPercentage ? ` · ${provider.adminPercentage}% commission` : ''}
              </Text>
            </View>
            <Badge label="Approved" tone="success" icon="checkmark-circle" />
          </View>
        </Card>

        <View style={styles.block}>
          <Text variant="heading">About your business</Text>
          <Input label="Business name" value={name} onChangeText={setName} autoCapitalize="words" />
          <TextArea
            label="Description"
            placeholder="What guests should know about you."
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View style={styles.block}>
          <Text variant="heading">Contact</Text>
          <Input label="Phone" icon="call-outline" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
          <Input
            label="Email"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input label="City" icon="location-outline" value={city} onChangeText={setCity} autoCapitalize="words" />
          <Input label="Street address" icon="home-outline" value={streetAddress} onChangeText={setStreetAddress} />

          <View style={styles.hoursRow}>
            <Input label="Opens" placeholder="09:00" value={openTime} onChangeText={setOpenTime} containerStyle={styles.flex} />
            <Input label="Closes" placeholder="18:00" value={closeTime} onChangeText={setCloseTime} containerStyle={styles.flex} />
          </View>
        </View>

        <View style={styles.block}>
          <Text variant="heading">Payout account</Text>
          <Notice
            tone="info"
            icon="lock-closed-outline"
            title="Private to you and Mehman"
            message="Guests never see these details. Keep them current or a payout may bounce."
          />
          <Input label="Bank" value={bankName} onChangeText={setBankName} autoCapitalize="words" />
          <Input label="Account holder" value={accountHolderName} onChangeText={setAccountHolderName} autoCapitalize="words" />
          <Input label="IBAN" value={iban} onChangeText={setIban} autoCapitalize="characters" />
          <Input label="SWIFT/BIC (for international transfers)" value={swiftCode} onChangeText={setSwiftCode} autoCapitalize="characters" />
        </View>

        <IdentityVerificationCard />

        <PayoutWalletCard providerId={provider.id} defaultBank={{ bankName, accountHolderName, iban, swiftCode }} />

        <Divider />

        <Text variant="small" tone="muted" style={styles.footnote}>
          Approval status, commission rate and operator eligibility are set by Mehman. Message host support if
          any of them look wrong.
        </Text>
      </View>
    </Screen>
  );
}

/**
 * CNIC submission for the blue verified badge.
 *
 * Mirrors the receipt-upload flow on the payment screen: the endpoint may not
 * exist on the API yet, so a failed submit does not lose the host's scans —
 * it offers WhatsApp instead of silently pretending the upload worked.
 */
function IdentityVerificationCard() {
  const toast = useToast();
  const [cnic, setCnic] = useState('');
  const [front, setFront] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [back, setBack] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [cnicError, setCnicError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);

  const verification = useQuery({
    queryKey: ['verification'],
    queryFn: () => verificationApi.getVerification(),
    retry: false,
  });

  // Not live on the API yet for most accounts — that must read as "not
  // verified", not as a broken screen.
  const status = verification.data?.status ?? 'NONE';

  const pick = async (side: 'front' | 'back') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error('Allow photo access to attach your CNIC.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_SCAN_BYTES) {
      setScanError('That image is over 8 MB — pick a smaller one.');
      return;
    }
    setScanError(null);
    if (side === 'front') setFront(asset);
    else setBack(asset);
  };

  const onSubmit = async () => {
    const formatted = formatCnic(cnic);
    if (!isValidCnic(formatted)) {
      setCnicError('Enter your 13-digit CNIC as 12345-1234567-1.');
      return;
    }
    if (!front || !back) {
      setScanError('Add both the front and back of your CNIC.');
      return;
    }
    setCnicError(null);
    setSubmitting(true);
    try {
      const result = await verificationApi.submitVerification({
        cnicNumber: formatted,
        front: { uri: front.uri, name: front.fileName ?? 'cnic-front.jpg', type: front.mimeType ?? 'image/jpeg' },
        back: { uri: back.uri, name: back.fileName ?? 'cnic-back.jpg', type: back.mimeType ?? 'image/jpeg' },
      });
      if (!result.ok) setPending(true);
      setSubmitted(true);
      toast.success("Submitted — we'll review it shortly");
    } catch (err) {
      toast.error(errorMessage(err, 'We could not submit that just now.'));
    } finally {
      setSubmitting(false);
    }
  };

  const showForm = !submitted && status !== 'VERIFIED' && status !== 'PENDING';

  return (
    <View style={styles.block}>
      <Text variant="heading">Identity verification</Text>
      <Text variant="small" tone="muted">
        Verify your CNIC to earn the blue badge — it tells hosts and guests your identity has been checked.
      </Text>

      {status === 'VERIFIED' ? (
        <Notice
          tone="info"
          icon="shield-checkmark-outline"
          title="Your identity is verified"
          message="The badge now shows on your profile and listings."
        />
      ) : status === 'PENDING' || (submitted && !pending) ? (
        <Notice
          tone="warning"
          icon="hourglass-outline"
          title="Under review"
          message="Usually within 2 working days. We'll message you the outcome."
        />
      ) : status === 'REJECTED' ? (
        <Notice
          tone="danger"
          icon="alert-circle-outline"
          title="We could not verify that"
          message="Check the images are sharp and uncropped, then submit again."
        />
      ) : null}

      {pending ? (
        <Notice
          tone="warning"
          icon="logo-whatsapp"
          title="Send your CNIC to us as well"
          message="Verification uploads are not live yet, so please forward the two photos on WhatsApp so we can check them."
          action={
            <Button
              label="Send on WhatsApp"
              variant="secondary"
              size="sm"
              icon="logo-whatsapp"
              onPress={() =>
                void Linking.openURL(whatsAppUrl(`Hello Mehman, here is my CNIC (${formatCnic(cnic)}) for verification.`))
              }
            />
          }
        />
      ) : null}

      {showForm ? (
        <>
          <Input
            label="CNIC number"
            placeholder="12345-1234567-1"
            value={cnic}
            onChangeText={(v) => {
              setCnic(formatCnic(v));
              setCnicError(null);
            }}
            keyboardType="number-pad"
            error={cnicError ?? undefined}
          />

          <View style={styles.scanRow}>
            <ScanBox label="CNIC front" asset={front} onPick={() => void pick('front')} onClear={() => setFront(null)} />
            <ScanBox label="CNIC back" asset={back} onPick={() => void pick('back')} onClear={() => setBack(null)} />
          </View>
          {scanError ? (
            <Text variant="small" tone="danger">
              {scanError}
            </Text>
          ) : null}

          <Text variant="small" tone="muted">
            Used only to confirm your identity. Never shown on your public profile.
          </Text>

          <Button
            label="Submit for verification"
            variant="outline"
            icon="shield-checkmark-outline"
            loading={submitting}
            onPress={() => void onSubmit()}
          />
        </>
      ) : null}
    </View>
  );
}

function ScanBox({
  label, asset, onPick, onClear,
}: {
  label: string;
  asset: ImagePicker.ImagePickerAsset | null;
  onPick: () => void;
  onClear: () => void;
}) {
  return (
    <View style={styles.scanBox}>
      <Text variant="caption" tone="muted" style={styles.scanLabel}>
        {label.toUpperCase()}
      </Text>
      {asset ? (
        <View style={styles.scanPreviewWrap}>
          <Image source={{ uri: asset.uri }} style={styles.scanPreview} contentFit="cover" />
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${label}`} onPress={onClear} style={styles.scanRemove}>
            <Ionicons name="close" size={14} color={colors.text} />
          </Pressable>
        </View>
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel={`Upload ${label}`} onPress={onPick} style={styles.scanUpload}>
          <Ionicons name="camera-outline" size={22} color={colors.textMuted} />
          <Text variant="caption" tone="muted">
            Upload photo
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * The account-level payout method (bank vs. mobile wallet) used for host
 * earnings and any refund that has to be routed back through the account.
 * Separate from the bank fields above: those are already wired to the
 * working provider-update endpoint, while this posts to an account-level
 * endpoint that — like identity verification — may not be live everywhere
 * yet, so it degrades the same way rather than silently doing nothing.
 */
function PayoutWalletCard({
  providerId, defaultBank,
}: {
  providerId: string;
  defaultBank: { bankName: string; accountHolderName: string; iban: string; swiftCode: string };
}) {
  const toast = useToast();
  const [method, setMethod] = useState<PayoutMethod>('BANK');
  const [walletProvider, setWalletProvider] = useState('Easypaisa');
  const [walletNumber, setWalletNumber] = useState('');
  const [walletAccountTitle, setWalletAccountTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState(false);

  useQuery({
    queryKey: ['payout-details', providerId],
    queryFn: async () => {
      const details = await verificationApi.getPayoutDetails();
      if (details) {
        setMethod(details.method);
        if (details.walletProvider) setWalletProvider(details.walletProvider);
        setWalletNumber(details.walletNumber ?? '');
        setWalletAccountTitle(details.walletAccountTitle ?? '');
      }
      return details;
    },
    retry: false,
  });

  const onSave = async () => {
    if (method === 'WALLET') {
      const formatted = formatMobile(walletNumber);
      if (!isValidMobile(formatted)) {
        toast.error('Enter an 11-digit mobile number as 03xx-xxxxxxx.');
        return;
      }
      if (!walletAccountTitle.trim()) {
        toast.error('Add the name on the wallet account.');
        return;
      }
    }

    setSaving(true);
    try {
      const result = await verificationApi.savePayoutDetails(
        method === 'BANK'
          ? { method, ...defaultBank }
          : {
              method,
              walletProvider,
              walletNumber: formatMobile(walletNumber),
              walletAccountTitle: walletAccountTitle.trim(),
            },
      );
      if (!result.ok) {
        setPending(true);
        toast.info('Saved here for now — refund routing is not live yet.');
      } else {
        setPending(false);
        toast.success('Payout method saved');
      }
    } catch (err) {
      toast.error(errorMessage(err, 'We could not save that just now.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.block}>
      <Text variant="heading">Refund & payout wallet</Text>
      <Text variant="small" tone="muted">
        How a refund or payout reaches you when it cannot go back to the guest's original payment method.
      </Text>

      <View style={styles.methodRow}>
        <Chip label="Bank transfer" selected={method === 'BANK'} onPress={() => setMethod('BANK')} />
        <Chip label="Mobile wallet" selected={method === 'WALLET'} onPress={() => setMethod('WALLET')} />
      </View>

      {method === 'BANK' ? (
        <Text variant="small" tone="muted">
          Uses the bank details in "Payout account" above.
        </Text>
      ) : (
        <>
          <View style={styles.methodRow}>
            {WALLET_PROVIDERS.map((p) => (
              <Chip key={p} label={p} selected={walletProvider === p} onPress={() => setWalletProvider(p)} />
            ))}
          </View>
          <Input
            label="Wallet number"
            placeholder="0336-5364506"
            value={walletNumber}
            onChangeText={(v) => setWalletNumber(formatMobile(v))}
            keyboardType="phone-pad"
          />
          <Input label="Account title" value={walletAccountTitle} onChangeText={setWalletAccountTitle} autoCapitalize="words" />
        </>
      )}

      {pending ? (
        <Notice
          tone="info"
          icon="information-circle-outline"
          title="Not live everywhere yet"
          message="Message host support if you need a refund routed to your wallet before this goes live."
        />
      ) : null}

      <Button label="Save payout method" variant="outline" loading={saving} onPress={() => void onSave()} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: spacing.lg, gap: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  block: { gap: spacing.md },
  hoursRow: { flexDirection: 'row', gap: spacing.md },
  footnote: { paddingHorizontal: spacing.xs },

  scanRow: { flexDirection: 'row', gap: spacing.md },
  scanBox: { flex: 1, gap: spacing.xs },
  scanLabel: { marginLeft: spacing.xs },
  scanUpload: {
    height: 96,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  scanPreviewWrap: { position: 'relative' },
  scanPreview: { width: '100%', height: 96, borderRadius: radius.lg, backgroundColor: colors.surfaceMuted },
  scanRemove: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  methodRow: { flexDirection: 'row', gap: spacing.sm },
});
