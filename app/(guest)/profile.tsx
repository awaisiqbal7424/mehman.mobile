import { Ionicons } from '../../src/components/ui/LucideIcon';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { errorMessage } from '../../src/api/client';
import { authApi } from '../../src/api/services';
import {
  Avatar, Badge, Button, Card, ConfirmSheet, Divider, EmptyState, Input, Notice, PageHeading,
  Screen, Sheet, Text, useToast,
} from '../../src/components/ui';
import { CONTACT_EMAIL } from '../../src/constants';
import { useAuth } from '../../src/store/auth';
import { useSettingsStore, buildWhatsAppUrl } from '../../src/store/settingsStore';
import { useWishlist } from '../../src/store/wishlist';
import { colors, radius, spacing } from '../../src/theme';

/**
 * Profile, settings, and the door to the host side.
 *
 * The role switch is the piece that makes this one app rather than two. It only
 * appears once an account has an approved business — before that, the same
 * space offers the path to becoming a host, so the journey from traveller to
 * Mezban never leaves the app.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const toast = useToast();

  const user = useAuth((s) => s.user);
  const providerStatus = useAuth((s) => s.providerStatus);
  const providersError = useAuth((s) => s.providersError);
  const provider = useAuth((s) => s.provider);
  const setRole = useAuth((s) => s.setRole);
  const logout = useAuth((s) => s.logout);
  const refreshAccount = useAuth((s) => s.refreshAccount);
  const refreshProviders = useAuth((s) => s.refreshProviders);
  const clearWishlist = useWishlist((s) => s.clear);
  const whatsAppNumber = useSettingsStore((s) => s.whatsAppNumber);

  // A business approved (or rejected) while the app sat in the background —
  // or in a previous session that never logged back out — must not still
  // show "Become a Mezban" here. Login and cold-launch bootstrap only run
  // once, so this is the one place that keeps the badge honest.
  useFocusEffect(
    useCallback(() => {
      if (user) void refreshProviders();
    }, [refreshProviders, user]),
  );

  const [signOutOpen, setSignOutOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phoneNumber ?? '');
  const [photoUrl, setPhotoUrl] = useState(user?.imageUrl ?? '');
  const [pickingPhoto, setPickingPhoto] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  if (!user) {
    return (
      <Screen scroll={false}>
        <PageHeading title="Profile" />
        <EmptyState
          icon="person-circle-outline"
          title="Sign in to Mehman"
          message="Manage your trips, save listings, and message hosts directly."
          actionLabel="Sign in"
          onAction={() => router.push('/sign-in?redirect=/(guest)/profile')}
        />
        <View style={styles.signedOutFooter}>
          <Button
            label="Create an account"
            variant="outline"
            onPress={() => router.push('/sign-up')}
          />
        </View>
      </Screen>
    );
  }

  /** Same trick as the host's logo/cover upload: no image-upload endpoint
   * exists, so the picture rides along as a plain base64 data URI inside the
   * normal account update instead of a separate multipart request. */
  const onPickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error('Allow photo access to change your profile photo.');
      return;
    }
    setPickingPhoto(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]?.base64) return;
      setPhotoUrl(`data:image/jpeg;base64,${result.assets[0].base64}`);
    } catch {
      toast.error('Could not read that image.');
    } finally {
      setPickingPhoto(false);
    }
  };

  const onSaveProfile = async () => {
    setSaving(true);
    try {
      await authApi.updateAccount({
        ...user,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phone.trim() || undefined,
        imageUrl: photoUrl || undefined,
      });
      await refreshAccount();
      toast.success('Profile updated');
      setEditOpen(false);
    } catch (err) {
      toast.error(errorMessage(err, 'We could not save those changes.'));
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async () => {
    if (newPassword.length < 8) {
      setPasswordError('Use at least 8 characters.');
      return;
    }
    setSaving(true);
    setPasswordError(null);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      toast.success('Password changed');
      setPasswordOpen(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPasswordError(errorMessage(err, 'We could not change your password.'));
    } finally {
      setSaving(false);
    }
  };

  const onSignOut = async () => {
    await logout();
    clearWishlist();
    setSignOutOpen(false);
    router.replace('/(guest)');
  };

  const onSwitchToHost = async () => {
    await setRole('host');
    router.replace('/(host)');
  };

  return (
    <Screen scroll>
      <PageHeading title="Profile" />

      {/* ── who ─────────────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Card>
          <View style={styles.identity}>
            <Avatar uri={user.imageUrl} name={`${user.firstName} ${user.lastName}`} size={62} />
            <View style={styles.flex}>
              <Text variant="heading" numberOfLines={1}>
                {`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.userName}
              </Text>
              <Text variant="small" tone="muted" numberOfLines={1}>
                {user.email}
              </Text>
              {user.phoneNumber ? (
                <Text variant="small" tone="muted">
                  {user.phoneNumber}
                </Text>
              ) : null}
            </View>
          </View>
          <Button
            label="Edit profile"
            variant="outline"
            size="sm"
            icon="create-outline"
            style={styles.editButton}
            onPress={() => setEditOpen(true)}
          />
        </Card>
      </View>

      {/* ── hosting ─────────────────────────────────────────────────────── */}
      <View style={styles.section}>
        {providersError ? (
          <Notice
            tone="danger"
            icon="alert-circle-outline"
            title="Could not check your Mezban status"
            message={`${providersError} If you are already an approved Mezban, this is why the app is not showing your business — tap to try again.`}
            action={
              <Button
                label="Try again"
                variant="outline"
                size="sm"
                onPress={() => void refreshProviders()}
              />
            }
          />
        ) : null}
        {providerStatus === 'approved' ? (
          // A plain Card here reads as just another settings row — easy to
          // miss among everything else on the screen. This is the one control
          // that switches the whole app to the host side, so it gets a bold,
          // unmissable pill rather than blending in.
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Switch to Mezban"
            onPress={() => void onSwitchToHost()}
            style={({ pressed }) => [styles.switchPill, pressed && { opacity: 0.94 }]}
          >
            <Ionicons name="business" size={20} color={colors.textInverse} />
            <Text variant="bodyStrong" tone="inverse" style={styles.flex}>
              Switch to Mezban
            </Text>
            <Ionicons name="swap-horizontal" size={20} color={colors.textInverse} />
          </Pressable>
        ) : providerStatus === 'pending' ? (
          <Card>
            <View style={styles.hostRow}>
              <View style={[styles.hostIcon, { backgroundColor: colors.warningSoft }]}>
                <Ionicons name="hourglass-outline" size={22} color={colors.warning} />
              </View>
              <View style={styles.flex}>
                <Text variant="bodyStrong">Mezban Request Under Review</Text>
                <Text variant="small" tone="muted">
                  We review new businesses within a couple of days.
                </Text>
              </View>
              <Badge label="Under review" tone="warning" />
            </View>
          </Card>
        ) : providerStatus === 'rejected' ? (
          <Card>
            <View style={styles.hostRow}>
              <View style={[styles.hostIcon, { backgroundColor: colors.dangerSoft }]}>
                <Ionicons name="alert-circle-outline" size={22} color={colors.danger} />
              </View>
              <View style={styles.flex}>
                <Text variant="bodyStrong">Application not approved</Text>
                <Text variant="small" tone="muted">
                  {provider?.rejectReason ?? 'Get in touch and we will explain what is missing.'}
                </Text>
              </View>
            </View>
            <Button
              label="Talk to us"
              variant="outline"
              size="sm"
              icon="logo-whatsapp"
              style={styles.editButton}
              onPress={() => void Linking.openURL(buildWhatsAppUrl(whatsAppNumber, 'Hello Mehman, about my Mezban application'))}
            />
          </Card>
        ) : null}
      </View>

      {/* ── shortcuts ───────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Card padded={false}>
          <MenuRow icon="heart-outline" label="Saved listings" onPress={() => router.push('/(guest)/saved')} />
          <Divider style={styles.menuDivider} />
          <MenuRow icon="briefcase-outline" label="Your trips" onPress={() => router.push('/(guest)/trips')} />
          <Divider style={styles.menuDivider} />
          <MenuRow
            icon="sparkles-outline"
            label="Build a custom trip"
            onPress={() => router.push('/trip-builder')}
          />
        </Card>
      </View>

      {providerStatus === 'none' ? (
        <View style={styles.section}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Become a Mezban"
            onPress={() => router.push('/host/onboarding')}
            style={({ pressed }) => [styles.becomeHost, pressed && { opacity: 0.94 }]}
          >
            <View style={styles.flex}>
              <Text variant="bodyStrong" tone="inverse">
                Become a Mezban
              </Text>
              <Text variant="small" tone="inverse" style={styles.becomeHostCopy}>
                List your tours or your guesthouse and reach travellers across Pakistan.
              </Text>
            </View>
            <Ionicons name="arrow-forward-circle" size={30} color={colors.textInverse} />
          </Pressable>
        </View>
      ) : null}

      {/* ── account ─────────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text variant="caption" tone="muted" style={styles.sectionLabel}>
          ACCOUNT
        </Text>
        <Card padded={false}>
          <MenuRow icon="lock-closed-outline" label="Change password" onPress={() => setPasswordOpen(true)} />
          <Divider style={styles.menuDivider} />
          <MenuRow
            icon="logo-whatsapp"
            label="Get help"
            onPress={() => void Linking.openURL(buildWhatsAppUrl(whatsAppNumber, 'Hello Mehman, I need help with'))}
          />
          <Divider style={styles.menuDivider} />
          <MenuRow
            icon="mail-outline"
            label="Email us"
            value={CONTACT_EMAIL}
            onPress={() => void Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
          />
        </Card>
      </View>

      {/* ── legal ───────────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text variant="caption" tone="muted" style={styles.sectionLabel}>
          LEGAL
        </Text>
        <Card padded={false}>
          <MenuRow
            icon="document-text-outline"
            label="Terms of service"
            onPress={() => router.push('/legal/terms')}
          />
          <Divider style={styles.menuDivider} />
          <MenuRow
            icon="shield-outline"
            label="Privacy policy"
            onPress={() => router.push('/legal/privacy')}
          />
          <Divider style={styles.menuDivider} />
          <MenuRow
            icon="refresh-outline"
            label="Cancellation & refunds"
            onPress={() => router.push('/legal/cancellation')}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Button label="Sign out" variant="outline" fullWidth onPress={() => setSignOutOpen(true)} />
        <Text variant="small" tone="muted" center style={styles.version}>
          Mehman · v1.0.0
        </Text>
      </View>

      {/* ── sheets ──────────────────────────────────────────────────────── */}
      <ConfirmSheet
        visible={signOutOpen}
        onClose={() => setSignOutOpen(false)}
        onConfirm={() => void onSignOut()}
        title="Sign out?"
        message="You will need your password to sign back in. Your bookings stay where they are."
        confirmLabel="Sign out"
        destructive
      />

      <Sheet
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit profile"
        footer={<Button label="Save changes" size="lg" fullWidth loading={saving} onPress={() => void onSaveProfile()} />}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change profile photo"
          onPress={() => void onPickPhoto()}
          style={styles.photoPicker}
        >
          <Avatar uri={photoUrl} name={`${firstName} ${lastName}`} size={72} />
          <View style={styles.photoEdit}>
            {pickingPhoto ? (
              <Text variant="caption" tone="inverse">
                …
              </Text>
            ) : (
              <Ionicons name="camera-outline" size={14} color={colors.textInverse} />
            )}
          </View>
        </Pressable>

        <Input label="First name" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
        <Input label="Last name" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
        <Input
          label="Mobile number"
          icon="call-outline"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          hint="Hosts use this to reach you about a booking."
        />
      </Sheet>

      <Sheet
        visible={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        title="Change password"
        footer={
          <Button label="Update password" size="lg" fullWidth loading={saving} onPress={() => void onChangePassword()} />
        }
      >
        <Input label="Current password" value={currentPassword} onChangeText={setCurrentPassword} secure />
        <Input
          label="New password"
          value={newPassword}
          onChangeText={setNewPassword}
          secure
          hint="At least 8 characters."
          error={passwordError ?? undefined}
        />
      </Sheet>
    </Screen>
  );
}

function MenuRow({
  icon, label, value, onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && { backgroundColor: colors.surfaceMuted }]}
    >
      <Ionicons name={icon} size={20} color={colors.textSecondary} />
      <Text variant="body" style={styles.flex}>
        {label}
      </Text>
      {value ? (
        <Text variant="small" tone="muted" numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl, gap: spacing.sm },
  sectionLabel: { marginLeft: spacing.xs },

  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  editButton: { alignSelf: 'flex-start', marginTop: spacing.lg },

  photoPicker: { alignSelf: 'center', marginBottom: spacing.sm },
  photoEdit: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  hostRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  hostIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  becomeHost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
  },
  becomeHostCopy: { opacity: 0.9, marginTop: 2 },
  switchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },

  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  menuDivider: { marginVertical: 0, marginHorizontal: spacing.lg },

  signedOutFooter: { paddingHorizontal: spacing['3xl'] },
  version: { marginTop: spacing.lg },
});
