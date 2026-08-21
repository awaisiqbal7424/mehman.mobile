import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { errorMessage } from '../../src/api/client';
import { authApi } from '../../src/api/services';
import { Button, Header, Input, Notice, Screen, Text, useToast } from '../../src/components/ui';
import { spacing } from '../../src/theme';

/**
 * Password reset.
 *
 * The confirmation is deliberately the same whether or not the address is on
 * file: telling a stranger "no account with that email" turns this screen into
 * a way of checking who has an account here.
 */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    const address = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(address)) {
      setError('That does not look like an email address.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await authApi.requestPasswordReset(address);
      setSent(true);
    } catch (err) {
      toast.error(errorMessage(err, 'We could not start the reset just now.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll padded>
      <Header title="" onBack={() => (router.canGoBack() ? router.back() : router.replace('/sign-in'))} transparent />

      <View style={styles.intro}>
        <Text variant="display">Reset your password</Text>
        <Text variant="body" tone="secondary" style={styles.introText}>
          Enter the email you signed up with and we will send you a link to set a new password.
        </Text>
      </View>

      {sent ? (
        <View style={styles.done}>
          <Notice
            tone="success"
            icon="mail-open-outline"
            title="Check your email"
            message={`If ${email.trim().toLowerCase()} has an account with us, a reset link is on its way. It expires in 24 hours.`}
          />
          <Button label="Back to sign in" size="lg" fullWidth onPress={() => router.replace('/sign-in')} />
        </View>
      ) : (
        <View style={styles.form}>
          <Input
            label="Email"
            icon="mail-outline"
            placeholder="you@example.com"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setError(null);
            }}
            error={error ?? undefined}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            returnKeyType="send"
            onSubmitEditing={onSubmit}
          />
          <Button label="Send reset link" size="lg" fullWidth loading={submitting} onPress={onSubmit} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: spacing.xl },
  introText: { marginTop: spacing.sm },
  form: { gap: spacing.xl },
  done: { gap: spacing.xl },
});
