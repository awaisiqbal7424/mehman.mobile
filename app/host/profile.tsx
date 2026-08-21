import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { errorMessage } from '../../src/api/client';
import { providerApi } from '../../src/api/services';
import {
  Avatar, Badge, Button, Card, Divider, FooterBar, Header, Input, Notice, Screen, Text,
  TextArea, useToast,
} from '../../src/components/ui';
import { useAuth } from '../../src/store/auth';
import { spacing } from '../../src/theme';

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
        </View>

        <Divider />

        <Text variant="small" tone="muted" style={styles.footnote}>
          Approval status, commission rate and operator eligibility are set by Mehman. Message host support if
          any of them look wrong.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: spacing.lg, gap: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  block: { gap: spacing.md },
  hoursRow: { flexDirection: 'row', gap: spacing.md },
  footnote: { paddingHorizontal: spacing.xs },
});
