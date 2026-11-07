import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/ui/app-header';
import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { IconButton } from '@/components/ui/button';
import { MenuRow } from '@/components/ui/menu-row';
import { DemoModeBanner } from '@/components/ui/notice-banner';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { APP_VERSION } from '@/constants/config';
import { colors, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { useUnreadAlertCount } from '@/features/alerts/use-alerts';
import { userDisplayRole } from '@/services/auth-service';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isDemo, logout } = useAuth();
  const unreadAlerts = useUnreadAlertCount();
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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
      <AppHeader
        title="Profile"
        subtitle="Account, preferences, and session"
        right={
          <IconButton
            icon="settings-outline"
            accessibilityLabel="Open settings"
            onPress={() => router.push('/settings')}
          />
        }
      />

      <DemoModeBanner compact />

      <Card style={styles.identity} raised>
        <View style={styles.identityTop}>
          <Avatar name={user?.name ?? 'PathoTrace'} size={64} />
          <View style={styles.identityText}>
            <AppText variant="heading">{user?.name ?? 'Unknown user'}</AppText>
            <AppText variant="small" color={colors.textSecondary}>
              {user ? userDisplayRole(user) : ''}
            </AppText>
            {user?.farmName ? (
              <View style={styles.farmRow}>
                <AppText variant="caption" color={colors.primary}>
                  {user.farmName}
                </AppText>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.identityDetails}>
          <View style={styles.detailRow}>
            <AppText variant="caption" color={colors.textMuted}>
              Email
            </AppText>
            <AppText variant="small">{user?.email ?? 'Not recorded'}</AppText>
          </View>
          <View style={styles.detailRow}>
            <AppText variant="caption" color={colors.textMuted}>
              Phone
            </AppText>
            <AppText variant="small">{user?.phone ?? 'Not recorded'}</AppText>
          </View>
          <View style={styles.detailRow}>
            <AppText variant="caption" color={colors.textMuted}>
              Session
            </AppText>
            <AppText variant="small" color={isDemo ? colors.warning : colors.success}>
              {isDemo ? 'Demo session' : 'Secure session'}
            </AppText>
          </View>
        </View>
      </Card>

      <View style={styles.section}>
        <SectionHeader title="Account" />
        <Card padded={false} style={styles.menuCard}>
          <MenuRow
            icon="person-outline"
            title="Profile and settings"
            subtitle="Contact details and notification preferences"
            onPress={() => router.push('/settings')}
          />
          <View style={styles.divider} />
          <MenuRow
            icon="paw-outline"
            title="My herd"
            subtitle="Search and review cattle records"
            onPress={() => router.push('/herd')}
          />
          <View style={styles.divider} />
          <MenuRow
            icon="notifications-outline"
            title="Alerts"
            subtitle={unreadAlerts > 0 ? `${unreadAlerts} unread` : 'No unread alerts'}
            onPress={() => router.push('/alerts')}
          />
          {user?.role === 'veterinarian' ? (
            <>
              <View style={styles.divider} />
              <MenuRow
                icon="medkit-outline"
                title="Veterinary workspace"
                subtitle="Assigned cattle and observations"
                onPress={() => router.push('/vet')}
              />
            </>
          ) : null}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Information" />
        <Card padded={false} style={styles.menuCard}>
          <MenuRow
            icon="information-circle-outline"
            title="About PathoTrace"
            subtitle="How risk estimates and limitations are handled"
            onPress={() => router.push('/about')}
          />
          <View style={styles.divider} />
          <MenuRow
            icon="shield-checkmark-outline"
            title="Privacy and data"
            subtitle="Local caching and account data"
            onPress={() => router.push('/privacy')}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Card padded={false} style={styles.menuCard}>
          <MenuRow
            icon="log-out-outline"
            title="Sign out"
            subtitle="End this session on the device"
            tone={colors.danger}
            soft={colors.dangerSoft}
            destructive
            onPress={() => setConfirmingLogout(true)}
          />
        </Card>
      </View>

      <View style={styles.footer}>
        <AppText variant="caption" color={colors.textMuted} center>
          PathoTrace v{APP_VERSION}
        </AppText>
        <AppText variant="caption" color={colors.textMuted} center>
          {isDemo
            ? 'Demo data is clearly labelled and separate from live services.'
            : 'Connected to the configured PathoTrace services.'}
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

const styles = StyleSheet.create({
  identity: {
    marginTop: spacing.lg,
    gap: spacing.lg,
  },
  identityTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  identityText: {
    flex: 1,
    gap: 3,
  },
  farmRow: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginTop: 2,
  },
  identityDetails: {
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 3,
  },
  section: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  menuCard: {
    paddingHorizontal: spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  footer: {
    marginTop: spacing.xxl,
    gap: spacing.xs,
  },
});
