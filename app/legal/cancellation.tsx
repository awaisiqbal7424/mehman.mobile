import { Ionicons } from '../../src/components/ui/LucideIcon';
import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { CONTACT_EMAIL } from '../../src/constants';
import { useSettingsStore, buildWhatsAppUrl } from '../../src/store/settingsStore';
import { Header, Screen, Text } from '../../src/components/ui';
import { colors, radius, spacing } from '../../src/theme';

const LAST_UPDATED = '20 August 2026';

interface RefundTier {
  window: string;
  refund: number;
}

interface PolicyDefinition {
  label: string;
  summary: string;
  tiers: RefundTier[];
}

/**
 * The four cancellation tiers a host can pick when they list. Kept in step
 * with what the package page and checkout show — see `src/utils/packages.ts`
 * on the web app for the source of truth this was ported from.
 */
const POLICIES: PolicyDefinition[] = [
  {
    label: 'Flexible',
    summary: 'Full refund up to 24 hours before you travel.',
    tiers: [
      { window: 'More than 24 hours before', refund: 100 },
      { window: 'Within 24 hours of the start', refund: 50 },
      { window: 'After the trip or stay begins', refund: 0 },
    ],
  },
  {
    label: 'Moderate',
    summary: 'Full refund up to 5 days before you travel.',
    tiers: [
      { window: 'More than 5 days before', refund: 100 },
      { window: '24 hours to 5 days before', refund: 50 },
      { window: 'Within 24 hours of the start', refund: 0 },
    ],
  },
  {
    label: 'Strict',
    summary: 'Full refund up to 14 days before you travel.',
    tiers: [
      { window: 'More than 14 days before', refund: 100 },
      { window: '7 to 14 days before', refund: 50 },
      { window: 'Less than 7 days before', refund: 0 },
    ],
  },
  {
    label: 'Non-refundable',
    summary: 'This booking cannot be refunded once confirmed.',
    tiers: [{ window: 'Any time after booking', refund: 0 }],
  },
];

/** Applies to every booking regardless of the host's tier. */
const GUARANTEES: string[] = [
  "If your host cancels, you get 100% back — including the service fee — and we'll help you find a replacement.",
  'If the trip or stay is materially different from the listing, report it within 24 hours of arrival and we will investigate and refund the difference.',
  'Cancellations caused by road closures, natural disasters or government restrictions are refunded in full, whichever policy applies.',
  'Refunds are returned to your original payment method within 7 working days of approval.',
  'The Mehman service fee is refunded in full whenever you receive a 100% refund.',
];

const HOW_TO_CANCEL = [
  'Open Your trips and find the booking you want to cancel.',
  'Tap Cancel booking. The refund that applies is shown before you confirm.',
  'Confirm. Your host is notified automatically and you receive an email receipt.',
];

function tierTone(refund: number): { color: string; icon: keyof typeof Ionicons.glyphMap } {
  if (refund >= 100) return { color: colors.success, icon: 'checkmark-circle-outline' };
  if (refund > 0) return { color: colors.warning, icon: 'alert-circle-outline' };
  return { color: colors.textMuted, icon: 'close-circle-outline' };
}

function PolicyCard({ policy }: { policy: PolicyDefinition }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text variant="caption" tone="primary">
          {policy.label}
        </Text>
        <Text variant="small" tone="secondary" style={styles.cardSummary}>
          {policy.summary}
        </Text>
      </View>
      {policy.tiers.map((tier) => {
        const { color, icon } = tierTone(tier.refund);
        return (
          <View key={tier.window} style={styles.tierRow}>
            <View style={styles.tierLabel}>
              <Ionicons name={icon} size={15} color={color} />
              <Text variant="small" tone="secondary" style={styles.flex} numberOfLines={2}>
                {tier.window}
              </Text>
            </View>
            <Text variant="smallStrong" style={{ color }}>
              {tier.refund}% back
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="heading" style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </View>
  );
}

export default function CancellationPolicyScreen() {
  const router = useRouter();
  const whatsAppNumber = useSettingsStore((s) => s.whatsAppNumber);
  const contactPhoneDisplay = useSettingsStore((s) => s.contactPhoneDisplay);

  return (
    <Screen scroll>
      <Header title="Cancellation & Refunds" />
      <View style={styles.body}>
        <Text variant="caption" tone="primary" style={styles.eyebrow}>
          Guest protection
        </Text>
        <Text variant="body" tone="secondary">
          Plans change. This page sets out exactly what you get back and when — no small print, no
          case-by-case decisions. The policy that applies to a booking is always shown on the
          listing and again at checkout before you pay.
        </Text>
        <Text variant="caption" tone="muted" style={styles.updated}>
          LAST UPDATED {LAST_UPDATED.toUpperCase()}
        </Text>

        <Section title="The four policies">
          <Text variant="body" tone="secondary" style={styles.paragraph}>
            Every host picks one of these when they list. Windows are counted back from the start
            of your trip or the check-in time of your stay, in Pakistan Standard Time.
          </Text>
          <View style={styles.cards}>
            {POLICIES.map((policy) => (
              <PolicyCard key={policy.label} policy={policy} />
            ))}
          </View>
        </Section>

        <Section title="What Mehman covers regardless">
          <Text variant="body" tone="secondary" style={styles.paragraph}>
            These apply to every booking on the platform, whichever policy the host chose. They
            come from us, not from the host.
          </Text>
          <View style={styles.guarantees}>
            {GUARANTEES.map((g) => (
              <View key={g} style={styles.guaranteeRow}>
                <Ionicons name="checkmark-circle" size={17} color={colors.success} style={styles.guaranteeIcon} />
                <Text variant="small" tone="secondary" style={styles.flex}>
                  {g}
                </Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="How to cancel">
          <View style={styles.steps}>
            {HOW_TO_CANCEL.map((step, index) => (
              <View key={step} style={styles.stepRow}>
                <View style={styles.stepMarker}>
                  <Text variant="caption" tone="inverse">
                    {index + 1}
                  </Text>
                </View>
                <Text variant="small" tone="secondary" style={styles.flex}>
                  {step}
                </Text>
              </View>
            ))}
          </View>
          <Text variant="small" tone="secondary" style={styles.paragraph}>
            You can cancel any booking that has not yet started.{' '}
            <Text variant="smallStrong" tone="primary" onPress={() => router.push('/(guest)/trips')}>
              Go to Your trips
            </Text>
          </Text>
        </Section>

        <Section title="When you get your money back">
          <View style={styles.timingCard}>
            <Ionicons name="time-outline" size={18} color={colors.primary} style={styles.guaranteeIcon} />
            <View style={styles.flex}>
              <Text variant="small" tone="secondary">
                Approved refunds are returned to your original payment method within{' '}
                <Text variant="smallStrong">7 working days</Text>. Your bank may take a few days
                more to post it.
              </Text>
              <Text variant="small" tone="secondary" style={styles.paragraph}>
                Cash-on-arrival bookings have nothing to refund if you cancel before the trip — you
                simply owe nothing.
              </Text>
            </View>
          </View>
        </Section>

        <Section title="If your host cancels">
          <Text variant="body" tone="secondary">
            You are refunded in full, including the Mehman service fee, and our team will help you
            find a comparable replacement for the same dates where one exists. Hosts who cancel
            confirmed bookings without good reason may lose their verified status.
          </Text>
        </Section>

        <Section title="If something goes wrong on the trip">
          <Text variant="body" tone="secondary">
            Tell us within 24 hours of arrival, with photos where you can. We will contact the
            host, look at the listing you booked against what you received, and refund the
            difference if the two do not match. Report it while you are still there — it is much
            harder for anyone to establish what happened after you have left.
          </Text>
        </Section>

        <Section title="Talk to a person">
          <Text variant="small" tone="secondary" style={styles.paragraph}>
            If your situation is not covered above, contact us before you cancel — we would rather
            sort it out than have you lose money to a rule that was not written with your case in
            mind.
          </Text>
          <View style={styles.contactRow}>
            <Text
              variant="smallStrong"
              tone="primary"
              onPress={() => void Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
              style={styles.contactLink}
            >
              <Ionicons name="mail-outline" size={14} color={colors.primary} /> {CONTACT_EMAIL}
            </Text>
            <Text
              variant="smallStrong"
              tone="primary"
              onPress={() =>
                void Linking.openURL(buildWhatsAppUrl(whatsAppNumber, 'Hello Mehman, I have a question about a cancellation or refund'))
              }
              style={styles.contactLink}
            >
              <Ionicons name="logo-whatsapp" size={14} color={colors.primary} /> WhatsApp {contactPhoneDisplay}
            </Text>
          </View>
        </Section>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing['3xl'] },
  eyebrow: { marginBottom: spacing.sm },
  updated: { marginTop: spacing.lg },
  paragraph: { marginTop: spacing.sm },

  section: { marginTop: spacing['2xl'], gap: spacing.sm },
  sectionTitle: { marginBottom: spacing.xs },

  cards: { gap: spacing.md, marginTop: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardHead: { padding: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  cardSummary: { marginTop: spacing.xs },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  tierLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },

  guarantees: { gap: spacing.sm, marginTop: spacing.md },
  guaranteeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
  guaranteeIcon: { marginTop: 1 },

  steps: { gap: spacing.md, marginTop: spacing.xs },
  stepRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  stepMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  timingCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
  },

  contactRow: { gap: spacing.md, marginTop: spacing.xs },
  contactLink: { alignSelf: 'flex-start' },
});
