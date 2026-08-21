import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { errorMessage } from '../../src/api/client';
import { Button, Header, Input, Notice, Screen, Text, useToast } from '../../src/components/ui';
import { LEGAL_URLS } from '../../src/constants';
import { useAuth } from '../../src/store/auth';
import { spacing } from '../../src/theme';

interface Fields {
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  password: string;
  confirmPassword: string;
}

const EMPTY: Fields = {
  firstName: '', lastName: '', email: '', mobileNumber: '', password: '', confirmPassword: '',
};

/**
 * Create an account.
 *
 * Validation runs on submit rather than on every keystroke: marking a field
 * red while someone is still halfway through typing their email is the most
 * common way a sign-up form feels hostile. Once a field has been flagged, its
 * error clears as soon as they edit it.
 */
export default function SignUpScreen() {
  const router = useRouter();
  const toast = useToast();
  const register = useAuth((s) => s.register);

  const [fields, setFields] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  const set = (key: keyof Fields) => (value: string) => {
    setFields((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof Fields, string>> = {};
    if (!fields.firstName.trim()) next.firstName = 'We need a first name.';
    if (!fields.lastName.trim()) next.lastName = 'We need a last name.';
    if (!/^\S+@\S+\.\S+$/.test(fields.email.trim())) next.email = 'That does not look like an email address.';
    // Pakistani mobile numbers, with or without the country code.
    if (fields.mobileNumber && !/^(\+92|0)?3\d{9}$/.test(fields.mobileNumber.replace(/[\s-]/g, ''))) {
      next.mobileNumber = 'Enter a number like 0336 5364506.';
    }
    if (fields.password.length < 8) next.password = 'Use at least 8 characters.';
    if (fields.password !== fields.confirmPassword) next.confirmPassword = 'The passwords do not match.';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    if (submitting || !validate()) return;
    setSubmitting(true);

    try {
      await register({
        login: fields.email.trim().toLowerCase(),
        email: fields.email.trim().toLowerCase(),
        firstName: fields.firstName.trim(),
        lastName: fields.lastName.trim(),
        password: fields.password,
        mobileNumber: fields.mobileNumber.trim() || undefined,
        langKey: 'en',
      });
      setRegistered(true);
    } catch (err) {
      toast.error(errorMessage(err, 'We could not create that account.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (registered) {
    return (
      <Screen scroll padded>
        <Header title="" onBack={() => router.replace('/sign-in')} transparent />
        <View style={styles.done}>
          <Notice
            tone="success"
            icon="mail-open-outline"
            title="Check your email"
            message={`We sent an activation link to ${fields.email.trim().toLowerCase()}. Open it to finish setting up your account, then sign in.`}
          />
          <Button label="Go to sign in" size="lg" fullWidth onPress={() => router.replace('/sign-in')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll padded>
      <Header title="" onBack={() => (router.canGoBack() ? router.back() : router.replace('/sign-in'))} transparent />

      <View style={styles.intro}>
        <Text variant="display">Create your account</Text>
        <Text variant="body" tone="secondary" style={styles.introText}>
          Book verified tours and stays across Pakistan, and talk to hosts directly.
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.nameRow}>
          <Input
            label="First name"
            placeholder="Ayesha"
            value={fields.firstName}
            onChangeText={set('firstName')}
            error={errors.firstName}
            autoComplete="given-name"
            containerStyle={styles.half}
          />
          <Input
            label="Last name"
            placeholder="Khan"
            value={fields.lastName}
            onChangeText={set('lastName')}
            error={errors.lastName}
            autoComplete="family-name"
            containerStyle={styles.half}
          />
        </View>

        <Input
          label="Email"
          icon="mail-outline"
          placeholder="you@example.com"
          value={fields.email}
          onChangeText={set('email')}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
        />

        <Input
          label="Mobile number"
          icon="call-outline"
          placeholder="0336 5364506"
          value={fields.mobileNumber}
          onChangeText={set('mobileNumber')}
          error={errors.mobileNumber}
          hint="Optional, but hosts use it to reach you about a booking."
          keyboardType="phone-pad"
          autoComplete="tel"
        />

        <Input
          label="Password"
          icon="lock-closed-outline"
          placeholder="At least 8 characters"
          value={fields.password}
          onChangeText={set('password')}
          error={errors.password}
          secure
          autoComplete="new-password"
        />

        <Input
          label="Confirm password"
          icon="lock-closed-outline"
          placeholder="Type it again"
          value={fields.confirmPassword}
          onChangeText={set('confirmPassword')}
          error={errors.confirmPassword}
          secure
          autoComplete="new-password"
        />

        <Text variant="small" tone="muted" style={styles.legal}>
          By creating an account you agree to our{' '}
          <Text variant="small" tone="primary" onPress={() => Linking.openURL(LEGAL_URLS.terms)}>
            Terms
          </Text>{' '}
          and{' '}
          <Text variant="small" tone="primary" onPress={() => Linking.openURL(LEGAL_URLS.privacy)}>
            Privacy Policy
          </Text>
          .
        </Text>

        <Button label="Create account" size="lg" fullWidth loading={submitting} onPress={onSubmit} />
      </View>

      <View style={styles.footer}>
        <Text variant="body" tone="secondary">
          Already have an account?
        </Text>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/sign-in')} hitSlop={8}>
          <Text variant="bodyStrong" tone="primary">
            Sign in
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: spacing.xl },
  introText: { marginTop: spacing.sm },

  form: { gap: spacing.lg },
  nameRow: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  legal: { marginTop: spacing.xs },

  done: { gap: spacing.xl, marginTop: spacing['3xl'] },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing['2xl'],
    paddingBottom: spacing.xl,
  },
});
