import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { CONTACT_EMAIL } from '../constants';
import { colors, spacing } from '../theme';
import { Header, Screen, Text } from './ui';

export interface LegalSection {
  heading: string;
  body: React.ReactNode;
}

/**
 * Shared shell for the in-app policy pages — mirrors the web version's
 * layout (eyebrow, numbered sections, a contact footer) so the content reads
 * the same wherever someone meets it, without ever leaving the app to do so.
 */
export function LegalPage({
  eyebrow, title, intro, lastUpdated, sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  lastUpdated: string;
  sections: LegalSection[];
}) {
  return (
    <Screen scroll>
      <Header title={title} />
      <View style={styles.body}>
        <Text variant="caption" tone="primary" style={styles.eyebrow}>
          {eyebrow}
        </Text>
        <Text variant="body" tone="secondary">
          {intro}
        </Text>
        <Text variant="caption" tone="muted" style={styles.updated}>
          LAST UPDATED {lastUpdated.toUpperCase()}
        </Text>

        {sections.map((section, index) => (
          <View key={section.heading} style={styles.section}>
            <Text variant="heading" style={styles.sectionTitle}>
              <Text variant="heading" tone="muted">
                {index + 1}.{' '}
              </Text>
              {section.heading}
            </Text>
            {section.body}
          </View>
        ))}

        <View style={styles.contact}>
          <Text variant="small" tone="secondary">
            Questions about this page? Email{' '}
            <Text variant="smallStrong" tone="primary" onPress={() => void Linking.openURL(`mailto:${CONTACT_EMAIL}`)}>
              {CONTACT_EMAIL}
            </Text>
            .
          </Text>
        </View>
      </View>
    </Screen>
  );
}

/** A body paragraph. */
export function P({ children }: { children: React.ReactNode }) {
  return (
    <Text variant="body" tone="secondary" style={styles.paragraph}>
      {children}
    </Text>
  );
}

/** Emphasis within a paragraph or list item — nests inside a `Text` as plain RN inline styling does. */
export function Bold({ children }: { children: React.ReactNode }) {
  return <Text variant="bodyStrong">{children}</Text>;
}

/** A tappable inline reference — a mailto, or another legal page. */
export function LegalLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Text variant="bodyStrong" tone="primary" onPress={onPress}>
      {label}
    </Text>
  );
}

/** A bullet or numbered list. Pass `ordered` for steps that must be read in sequence. */
export function List({ items, ordered }: { items: React.ReactNode[]; ordered?: boolean }) {
  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <View key={index} style={styles.listRow}>
          {ordered ? (
            <View style={styles.step}>
              <Text variant="caption" tone="inverse">
                {index + 1}
              </Text>
            </View>
          ) : (
            <View style={styles.bullet} />
          )}
          <Text variant="body" tone="secondary" style={styles.listText}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Links this page to another legal page, e.g. Terms pointing at the refund policy. */
export function useLegalNav() {
  const router = useRouter();
  return {
    terms: () => router.push('/legal/terms'),
    privacy: () => router.push('/legal/privacy'),
    cancellation: () => router.push('/legal/cancellation'),
  };
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing['3xl'] },
  eyebrow: { marginBottom: spacing.sm },
  updated: { marginTop: spacing.lg },

  section: { marginTop: spacing['2xl'], gap: spacing.sm },
  sectionTitle: { marginBottom: spacing.xs },
  paragraph: {},

  list: { gap: spacing.sm, marginTop: spacing.xs },
  listRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  listText: { flex: 1 },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
    marginTop: 9,
  },
  step: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  contact: {
    marginTop: spacing['3xl'],
    paddingTop: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});

export default LegalPage;
