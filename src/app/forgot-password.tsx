import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { NoticeBanner } from '@/components/ui/notice-banner';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { IS_DEMO_MODE } from '@/constants/config';
import { colors, spacing } from '@/constants/theme';
import { requestPasswordReset } from '@/services/auth-service';
import { getErrorMessage } from '@/utils/errors';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!identifier.trim()) {
      setError('Enter the email or username for your account.');
      return;
    }
    setSubmitting(true);
    try {
      await requestPasswordReset(identifier.trim());
      setSent(true);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll>
      <View style={styles.header}>
        <AppText variant="title">Password recovery</AppText>
        <AppText variant="small" color={colors.textSecondary}>
          Recover access to your PathoTrace account.
        </AppText>
      </View>

      {IS_DEMO_MODE ? (
        <>
          <Card style={styles.card}>
            <View style={styles.icon}>
              <Ionicons name="lock-open-outline" size={24} color={colors.primary} />
            </View>
            <AppText variant="subheading" center>
              Recovery is unavailable in demo mode
            </AppText>
            <AppText variant="small" color={colors.textSecondary} center>
              This build is not connected to the PathoTrace authentication service, so password
              reset emails cannot be sent. Use one of the demo accounts on the sign-in screen.
            </AppText>
            <Button
              label="Back to sign in"
              variant="secondary"
              onPress={() => router.replace('/login')}
            />
          </Card>
          <NoticeBanner
            message="When a verified backend is connected, this screen will submit a password-reset request to the recovery endpoint."
            tone="info"
          />
        </>
      ) : (
        <Card style={styles.card}>
          {sent ? (
            <>
              <View style={styles.icon}>
                <Ionicons name="mail-outline" size={24} color={colors.primary} />
              </View>
              <AppText variant="subheading" center>
                Request received
              </AppText>
              <AppText variant="small" color={colors.textSecondary} center>
                If the account exists, the backend will send a recovery message. Follow the
                instructions in that message.
              </AppText>
              <Button label="Back to sign in" onPress={() => router.replace('/login')} />
            </>
          ) : (
            <>
              {error ? <NoticeBanner message={error} tone="danger" /> : null}
              <TextField
                label="Email or username"
                value={identifier}
                onChangeText={setIdentifier}
                placeholder="you@example.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                icon="person-outline"
                required
              />
              <Button
                label="Request password reset"
                onPress={() => void handleSubmit()}
                loading={submitting}
                fullWidth
              />
              <Button
                label="Back to sign in"
                variant="ghost"
                onPress={() => router.replace('/login')}
              />
            </>
          )}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.xs,
  },
  card: {
    gap: spacing.md,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
