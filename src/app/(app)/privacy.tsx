import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/ui/app-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DemoModeBanner, NoticeBanner } from '@/components/ui/notice-banner';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { colors, radius, spacing } from '@/constants/theme';
import { clearScopedValues } from '@/database';
import { queryClient } from '@/services/query-client';

export default function PrivacyScreen() {
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);

  async function handleClearCache() {
    setClearing(true);
    try {
      await clearScopedValues();
      queryClient.clear();
      setCleared(true);
    } finally {
      setClearing(false);
      setConfirming(false);
    }
  }

  return (
    <Screen scroll>
      <AppHeader
        title="Privacy and data"
        subtitle="What is stored on this device and how it is used"
        showBack
      />

      <DemoModeBanner />

      {cleared ? (
        <NoticeBanner
          title="Cached data cleared"
          message="Herds, assessments, alerts, and locally saved observations have been removed from this device."
          tone="success"
          style={styles.spaced}
        />
      ) : null}

      <View style={styles.section}>
        <SectionHeader title="What the app stores" />
        <Card style={styles.card}>
          <DataPoint
            icon="key-outline"
            title="Session details"
            body="The signed-in session is kept in secure device storage on native platforms. On web, browser storage is used because secure native storage is unavailable."
          />
          <DataPoint
            icon="archive-outline"
            title="Cached records"
            body="Cattle records, assessments, alerts, health records, and preferences are cached locally so previously synchronized information can be reviewed when connectivity is limited."
          />
          <DataPoint
            icon="cloud-upload-outline"
            title="Pending observations"
            body="If a veterinarian saves an observation while offline, it is stored locally and queued for retry. The queue is scoped to that user account."
          />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="How data is used" />
        <Card>
          <AppText variant="small" color={colors.textSecondary}>
            Data is used only to display herd information, assessment history, alerts, and
            veterinary notes inside the app. This build does not include third-party analytics or
            advertising libraries.
          </AppText>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Access and authorization" />
        <Card>
          <AppText variant="small" color={colors.textSecondary}>
            The app hides actions that do not match your role, but the mobile interface is not the
            security boundary. Any connected backend must enforce authentication and authorization
            for every protected record.
          </AppText>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Demonstration data" />
        <Card>
          <AppText variant="small" color={colors.textSecondary}>
            When no API is configured, the app uses a clearly labelled demonstration dataset. Demo
            cattle, assessments, and observations are not real farm records and must not be used for
            clinical decisions.
          </AppText>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Clear cached data"
          subtitle="Remove locally cached records without signing out"
        />
        <Card style={styles.card}>
          <AppText variant="small" color={colors.textSecondary}>
            This removes cached herd data, preferences, and queued observations for the current
            account. The secure session is kept until you sign out.
          </AppText>
          <Button
            label="Clear cached data"
            icon="trash-outline"
            variant="secondary"
            onPress={() => setConfirming(true)}
            fullWidth
          />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Retention" />
        <Card>
          <AppText variant="small" color={colors.textSecondary}>
            Signing out deletes the stored session, clears the account-scoped cache, and removes
            queued local data. Uninstalling the app removes all local data managed by the app.
          </AppText>
        </Card>
      </View>

      <View style={styles.footer}>
        <AppText variant="caption" color={colors.textMuted} center>
          A formal privacy policy must be supplied by the PathoTrace service operator before a
          production release.
        </AppText>
      </View>

      <ConfirmDialog
        visible={confirming}
        title="Clear cached data?"
        message="Cached herd records, alerts, preferences, and queued observations for this account will be removed from this device."
        confirmLabel="Clear data"
        destructive
        loading={clearing}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void handleClearCache()}
      />
    </Screen>
  );
}

function DataPoint({
  icon,
  title,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.dataPoint}>
      <View style={styles.dataIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.dataText}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="small" color={colors.textSecondary}>
          {body}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.lg,
  },
  card: {
    gap: spacing.md,
  },
  dataPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  dataIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataText: {
    flex: 1,
    gap: 2,
  },
  footer: {
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  spaced: {
    marginBottom: spacing.md,
  },
});
