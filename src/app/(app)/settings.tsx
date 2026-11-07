import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { AppHeader } from '@/components/ui/app-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { NoticeBanner } from '@/components/ui/notice-banner';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { TextField } from '@/components/ui/text-field';
import { APP_VERSION } from '@/constants/config';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { usePreferences } from '@/features/settings/use-preferences';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, updateProfile, logout } = useAuth();
  const { preferences, loading, updateNotifications } = usePreferences();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleSaveProfile() {
    setSaved(false);
    setNameError(null);
    if (name.trim().length < 2) {
      setNameError('Enter the name shown on your account.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() || undefined });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      router.replace('/login');
    } finally {
      setLoggingOut(false);
      setConfirmingLogout(false);
    }
  }

  return (
    <Screen scroll>
      <AppHeader title="Settings" subtitle="Profile, notifications, and session" showBack />

      <View style={styles.section}>
        <SectionHeader
          title="Your profile"
          subtitle="Contact details associated with this account"
        />
        <Card style={styles.card}>
          {saved ? (
            <NoticeBanner
              message="Profile details were saved on this device."
              tone="success"
            />
          ) : null}
          <TextField
            label="Full name"
            value={name}
            onChangeText={(value) => {
              setName(value);
              setSaved(false);
            }}
            autoCapitalize="words"
            icon="person-outline"
            error={nameError ?? undefined}
            required
          />
          <TextField
            label="Phone"
            value={phone}
            onChangeText={(value) => {
              setPhone(value);
              setSaved(false);
            }}
            placeholder="Optional contact number"
            keyboardType="phone-pad"
            icon="call-outline"
          />
          <TextField
            label="Email"
            value={user?.email ?? ''}
            editable={false}
            icon="mail-outline"
            hint="The sign-in email cannot be changed in the app."
          />
          <Button
            label="Save profile"
            icon="checkmark-outline"
            onPress={() => void handleSaveProfile()}
            loading={saving}
            fullWidth
          />
          <AppText variant="caption" color={colors.textMuted}>
            In this build, profile edits are stored locally on the device and are not submitted to
            a backend.
          </AppText>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Notifications"
          subtitle="Choose which risk categories should prompt alerts"
        />
        <Card style={styles.card}>
          {loading ? (
            <AppText variant="small" color={colors.textSecondary}>
              Loading preferences…
            </AppText>
          ) : (
            <>
              <SwitchRow
                title="High-risk alerts"
                description="Prompt follow-up when a high-risk category is recorded."
                value={preferences.notifications.high}
                onChange={(value) => void updateNotifications({ high: value })}
              />
              <View style={styles.divider} />
              <SwitchRow
                title="Medium-risk alerts"
                description="Show prompts for medium-risk categories."
                value={preferences.notifications.medium}
                onChange={(value) => void updateNotifications({ medium: value })}
              />
              <View style={styles.divider} />
              <SwitchRow
                title="Low-risk alerts"
                description="Include low-risk category notifications."
                value={preferences.notifications.low}
                onChange={(value) => void updateNotifications({ low: value })}
              />
            </>
          )}
          <AppText variant="caption" color={colors.textMuted}>
            Preferences are stored locally. Push notifications are not enabled in this build.
          </AppText>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Session" subtitle="Manage access on this device" />
        <Card style={styles.card}>
          <Button
            label="Sign out"
            icon="log-out-outline"
            variant="danger"
            onPress={() => setConfirmingLogout(true)}
            fullWidth
          />
          <AppText variant="caption" color={colors.textMuted}>
            Signing out removes cached herd data from this device.
          </AppText>
        </Card>
      </View>

      <View style={styles.footer}>
        <AppText variant="caption" color={colors.textMuted} center>
          PathoTrace v{APP_VERSION}
        </AppText>
      </View>

      <ConfirmDialog
        visible={confirmingLogout}
        title="Sign out?"
        message="Cached herd data for this session will be removed from this device. You will need to sign in again to continue."
        confirmLabel="Sign out"
        destructive
        loading={loggingOut}
        onCancel={() => setConfirmingLogout(false)}
        onConfirm={() => void handleLogout()}
      />
    </Screen>
  );
}

function SwitchRow({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchText}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="small" color={colors.textSecondary}>
          {description}
        </AppText>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.borderStrong, true: colors.accent }}
        thumbColor={colors.surface}
        accessibilityLabel={title}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  card: {
    gap: spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  switchText: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  footer: {
    paddingBottom: spacing.xl,
  },
});
