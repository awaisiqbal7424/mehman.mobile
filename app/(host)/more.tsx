import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { messageApi } from '../../src/api/services';
import {
  Avatar, Badge, Button, Card, ConfirmSheet, Divider, PageHeading, Screen, Sheet,
  SheetOption, Text,
} from '../../src/components/ui';
import { CONTACT_EMAIL, whatsAppUrl } from '../../src/constants';
import { useAuth } from '../../src/store/auth';
import { useWishlist } from '../../src/store/wishlist';
import { colors, radius, spacing } from '../../src/theme';

/**
 * The host's everything-else screen.
 *
 * It also carries the switch back to travelling. Keeping both directions of the
 * role switch one tap from a tab bar is what stops the app feeling like two
 * apps bolted together — a host who wants to book their own holiday should not
 * have to sign out.
 */
export default function HostMoreScreen() {
  const router = useRouter();

  const user = useAuth((s) => s.user);
  const provider = useAuth((s) => s.provider);
  const providers = useAuth((s) => s.providers);
  const setRole = useAuth((s) => s.setRole);
  const setActiveProvider = useAuth((s) => s.setActiveProvider);
  const logout = useAuth((s) => s.logout);
  const clearWishlist = useWishlist((s) => s.clear);

  const [signOutOpen, setSignOutOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const unread = useQuery({
    queryKey: ['host-unread'],
    queryFn: () => messageApi.unreadCount(),
    refetchInterval: 60_000,
  });

  const onSwitchToGuest = async () => {
    await setRole('guest');
    router.replace('/(guest)');
  };

  const onSignOut = async () => {
    await logout();
    clearWishlist();
    setSignOutOpen(false);
    router.replace('/(guest)');
  };

  const approvedProviders = providers.filter((p) => p.isApproved);

  return (
    <Screen scroll>
      <PageHeading title="More" />

      {/* ── the business ────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Card>
          <View style={styles.identity}>
            <Avatar uri={provider?.logoUrl} name={provider?.name} size={56} />
            <View style={styles.flex}>
              <Text variant="heading" numberOfLines={1}>
                {provider?.name ?? 'Your business'}
              </Text>
              <Text variant="small" tone="muted" numberOfLines={1}>
                {provider?.city ?? ''}
                {provider?.isTourOperator ? ' · Tour operator' : ''}
              </Text>
            </View>
            <Badge label="Approved" tone="success" icon="checkmark-circle" />
          </View>

          {approvedProviders.length > 1 ? (
            <Button
              label="Switch business"
              variant="outline"
              size="sm"
              icon="swap-horizontal"
              style={styles.inlineButton}
              onPress={() => setSwitcherOpen(true)}
            />
          ) : null}
        </Card>
      </View>

      {/* ── running the business ────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text variant="caption" tone="muted" style={styles.sectionLabel}>
          YOUR BUSINESS
        </Text>
        <Card padded={false}>
          <MenuRow
            icon="cash-outline"
            label="Earnings & payouts"
            onPress={() => router.push('/host/earnings')}
          />
          <Divider style={styles.menuDivider} />
          <MenuRow
            icon="chatbubbles-outline"
            label="Messages"
            badge={unread.data?.total ? String(unread.data.total) : undefined}
            onPress={() => router.push('/host/messages')}
          />
          <Divider style={styles.menuDivider} />
          <MenuRow
            icon="document-text-outline"
            label="Trip requests"
            onPress={() => router.push('/host/quotes')}
          />
          <Divider style={styles.menuDivider} />
          <MenuRow icon="star-outline" label="Reviews" onPress={() => router.push('/host/reviews')} />
          <Divider style={styles.menuDivider} />
          <MenuRow
            icon="business-outline"
            label="Business profile"
            onPress={() => router.push('/host/profile')}
          />
        </Card>
      </View>

      {/* ── switch back ─────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Switch to travelling"
          onPress={() => void onSwitchToGuest()}
          style={({ pressed }) => [styles.switchCard, pressed && { opacity: 0.94 }]}
        >
          <View style={styles.switchIcon}>
            <Ionicons name="compass-outline" size={22} color={colors.textInverse} />
          </View>
          <View style={styles.flex}>
            <Text variant="bodyStrong" tone="inverse">
              Switch to travelling
            </Text>
            <Text variant="small" tone="inverse" style={styles.switchCopy}>
              Browse and book like any other guest.
            </Text>
          </View>
          <Ionicons name="swap-horizontal" size={22} color={colors.textInverse} />
        </Pressable>
      </View>

      {/* ── account ─────────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text variant="caption" tone="muted" style={styles.sectionLabel}>
          ACCOUNT
        </Text>
        <Card padded={false}>
          <MenuRow
            icon="person-outline"
            label={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Your account'}
            value={user?.email}
            onPress={() => router.push('/(guest)/profile')}
          />
          <Divider style={styles.menuDivider} />
          <MenuRow
            icon="logo-whatsapp"
            label="Host support"
            onPress={() => void Linking.openURL(whatsAppUrl('Hello Mehman, I need help with my listings'))}
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

      <View style={styles.section}>
        <Button label="Sign out" variant="outline" fullWidth onPress={() => setSignOutOpen(true)} />
      </View>

      <ConfirmSheet
        visible={signOutOpen}
        onClose={() => setSignOutOpen(false)}
        onConfirm={() => void onSignOut()}
        title="Sign out?"
        message="Your listings and bookings stay exactly as they are."
        confirmLabel="Sign out"
        destructive
      />

      <Sheet
        visible={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        title="Which business?"
        scroll={false}
      >
        {approvedProviders.map((option) => (
          <SheetOption
            key={option.id}
            label={option.name ?? 'Business'}
            description={option.city}
            selected={option.id === provider?.id}
            onPress={() => {
              setActiveProvider(option.id);
              setSwitcherOpen(false);
            }}
          />
        ))}
      </Sheet>
    </Screen>
  );
}

function MenuRow({
  icon, label, value, badge, onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  badge?: string;
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
      <Text variant="body" style={styles.flex} numberOfLines={1}>
        {label}
      </Text>
      {badge ? <Badge label={badge} tone="primary" /> : null}
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

  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  inlineButton: { alignSelf: 'flex-start', marginTop: spacing.lg },

  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
  },
  switchIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchCopy: { opacity: 0.9 },

  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  menuDivider: { marginVertical: 0, marginHorizontal: spacing.lg },
});
