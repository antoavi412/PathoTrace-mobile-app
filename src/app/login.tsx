import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppLogo } from '@/components/ui/app-logo';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { NoticeBanner } from '@/components/ui/notice-banner';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { DEMO_ACCOUNTS, IS_DEMO_MODE } from '@/constants/config';
import { colors, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { getErrorMessage } from '@/utils/errors';
import { hasErrors, validateLoginForm, type FieldErrors } from '@/utils/validation';

export default function LoginScreen() {
  const router = useRouter();
  const { status, login, sessionExpired } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/home');
    }
  }, [status, router]);

  async function handleSubmit() {
    setServerError(null);
    const validationErrors = validateLoginForm(identifier, password);
    setErrors(validationErrors);
    if (hasErrors(validationErrors)) return;

    setSubmitting(true);
    try {
      await login(identifier, password);
    } catch (error) {
      setServerError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo(account: (typeof DEMO_ACCOUNTS)[number]) {
    setIdentifier(account.identifier);
    setPassword(account.password);
    setErrors({});
    setServerError(null);
  }

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}>
        <View style={styles.brand}>
          <AppLogo size={72} />
          <View style={styles.brandText}>
            <AppText variant="display">PathoTrace</AppText>
            <AppText variant="small" color={colors.textSecondary} center>
              Smarter cattle health. Earlier detection.
            </AppText>
          </View>
        </View>

        {sessionExpired ? (
          <NoticeBanner
            title="Session expired"
            message="Your previous session is no longer valid. Sign in again to continue."
            tone="danger"
          />
        ) : null}

        {IS_DEMO_MODE ? (
          <NoticeBanner
            title="Demonstration access"
            message="Sign in with a demo account to explore the app. No live backend is connected."
            tone="warning"
          />
        ) : null}

        <Card style={styles.formCard}>
          <View style={styles.formHeader}>
            <AppText variant="heading">Welcome back</AppText>
            <AppText variant="small" color={colors.textSecondary}>
              Sign in to review herd health and risk assessments.
            </AppText>
          </View>

          {serverError ? (
            <NoticeBanner title="Sign-in failed" message={serverError} tone="danger" />
          ) : null}

          <TextField
            label="Email or username"
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
            icon="person-outline"
            error={errors.identifier}
            returnKeyType="next"
            required
          />

          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            icon="lock-closed-outline"
            secure
            error={errors.password}
            returnKeyType="go"
            onSubmitEditing={() => void handleSubmit()}
            required
          />

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/forgot-password')}
            style={styles.forgot}>
            <AppText variant="smallStrong" color={colors.primary}>
              Forgot password?
            </AppText>
          </Pressable>

          <Button
            label="Sign in"
            icon="log-in-outline"
            onPress={() => void handleSubmit()}
            loading={submitting}
            fullWidth
            size="lg"
          />
        </Card>

        {IS_DEMO_MODE ? (
          <View style={styles.demoSection}>
            <AppText variant="smallStrong" color={colors.textSecondary}>
              Demo accounts
            </AppText>
            <View style={styles.demoAccounts}>
              {DEMO_ACCOUNTS.map((account) => (
                <Pressable
                  key={account.identifier}
                  accessibilityRole="button"
                  accessibilityLabel={`Fill ${account.label} credentials`}
                  onPress={() => fillDemo(account)}
                  style={({ pressed }) => [styles.demoCard, pressed && styles.pressed]}>
                  <View style={styles.demoIcon}>
                    <Ionicons
                      name={account.role === 'farmer' ? 'leaf-outline' : 'medkit-outline'}
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.demoText}>
                    <AppText variant="smallStrong">{account.label}</AppText>
                    <AppText variant="caption" color={colors.textMuted}>
                      {account.identifier}
                    </AppText>
                  </View>
                  <AppText variant="caption" color={colors.primary}>
                    Use
                  </AppText>
                </Pressable>
              ))}
            </View>
            <AppText variant="caption" color={colors.textMuted} center>
              Demo password: demo1234
            </AppText>
          </View>
        ) : null}

        <View style={styles.security}>
          <Ionicons name="shield-checkmark-outline" size={15} color={colors.textMuted} />
          <AppText variant="caption" color={colors.textMuted} center>
            Session details are stored securely on this device.
          </AppText>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.huge,
    justifyContent: 'center',
  },
  keyboard: {
    flex: 1,
    gap: spacing.lg,
    justifyContent: 'center',
  },
  brand: {
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  brandText: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  formCard: {
    gap: spacing.lg,
  },
  formHeader: {
    gap: spacing.xs,
  },
  forgot: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.xs,
  },
  demoSection: {
    gap: spacing.sm,
  },
  demoAccounts: {
    gap: spacing.sm,
  },
  demoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  demoIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoText: {
    flex: 1,
    gap: 1,
  },
  pressed: {
    opacity: 0.75,
  },
  security: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
});
