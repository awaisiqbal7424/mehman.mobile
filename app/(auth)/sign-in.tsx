import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { errorMessage } from '../../src/api/client';
import { Button, Header, Input, Notice, Screen, Text, useToast } from '../../src/components/ui';
import { useAuth } from '../../src/store/auth';
import { useWishlist } from '../../src/store/wishlist';
import { spacing } from '../../src/theme';

/**
 * Sign in.
 *
 * `redirect` carries where the person was heading when they hit the wall — the
 * checkout, a saved listing — so signing in resumes the journey instead of
 * dumping them on the home screen. That one parameter is the difference
 * between a booking completed and a booking abandoned.
 */
export default function SignInScreen() {
  const router = useRouter();
  const toast = useToast();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();

  const login = useAuth((s) => s.login);
  const loadWishlist = useWishlist((s) => s.load);

  const passwordRef = useRef<TextInput>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** The backend reports an unactivated account with this key. */
  const [needsActivation, setNeedsActivation] = useState(false);

  const canSubmit = username.trim().length > 0 && password.length > 0;

  const onSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    setNeedsActivation(false);

    try {
      const user = await login({ username: username.trim(), password, rememberMe: true });
      void loadWishlist(user.id);
      toast.success(`Welcome back, ${user.firstName || user.userName}`);

      if (redirect) router.replace(redirect as never);
      else if (router.canGoBack()) router.back();
      else router.replace('/(guest)');
    } catch (err) {
      const message = errorMessage(err, 'Those details did not match an account.');
      // "Not activated" is a fixable state, not a wrong password — say so.
      if (/activat/i.test(message)) {
        setNeedsActivation(true);
        setError(null);
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll padded>
      <Header title="" onBack={() => (router.canGoBack() ? router.back() : router.replace('/(guest)'))} transparent />

      <View style={styles.brand}>
        <Image
          source={require('../../assets/brand/mehman-orange.png')}
          style={styles.logo}
          contentFit="contain"
          accessibilityLabel="Mehman"
        />
        <Text variant="display" center style={styles.headline}>
          Welcome back
        </Text>
        <Text variant="body" tone="secondary" center>
          Sign in to manage your trips, message hosts and pick up where you left off.
        </Text>
      </View>

      {needsActivation ? (
        <Notice
          tone="warning"
          icon="mail-unread-outline"
          title="Confirm your email first"
          message="We sent an activation link when you signed up. Open it, then come back and sign in."
        />
      ) : null}

      <View style={styles.form}>
        <Input
          label="Email or username"
          icon="person-outline"
          placeholder="you@example.com"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          keyboardType="email-address"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          error={error ?? undefined}
        />

        <Input
          ref={passwordRef}
          label="Password"
          icon="lock-closed-outline"
          placeholder="Your password"
          value={password}
          onChangeText={setPassword}
          secure
          autoComplete="current-password"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/forgot-password')}
          hitSlop={8}
          style={styles.forgot}
        >
          <Text variant="smallStrong" tone="primary">
            Forgot your password?
          </Text>
        </Pressable>

        <Button
          label="Sign in"
          size="lg"
          fullWidth
          loading={submitting}
          disabled={!canSubmit}
          onPress={onSubmit}
        />
      </View>

      <View style={styles.footer}>
        <Text variant="body" tone="secondary">
          New to Mehman?
        </Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/sign-up')} hitSlop={8}>
          <Text variant="bodyStrong" tone="primary">
            Create an account
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing['3xl'], paddingHorizontal: spacing.sm },
  logo: { width: 132, height: 44, marginBottom: spacing.lg },
  headline: { marginTop: spacing.sm },

  form: { gap: spacing.lg, marginTop: spacing.lg },
  forgot: { alignSelf: 'flex-end', paddingVertical: spacing.xs },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing['3xl'],
    paddingBottom: spacing.xl,
  },
});
