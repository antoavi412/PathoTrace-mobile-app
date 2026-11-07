import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppLogo } from '@/components/ui/app-logo';
import { AppHeader } from '@/components/ui/app-header';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { AiDisclaimer, DemoModeBanner } from '@/components/ui/notice-banner';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { APP_VERSION, IS_DEMO_MODE } from '@/constants/config';
import { colors, radius, spacing } from '@/constants/theme';

export default function AboutScreen() {
  return (
    <Screen scroll>
      <AppHeader title="About PathoTrace" showBack />

      <View style={styles.brand}>
        <AppLogo size={80} />
        <View style={styles.brandText}>
          <AppText variant="title" center>
            PathoTrace
          </AppText>
          <AppText variant="small" color={colors.textSecondary} center>
            Smarter cattle health. Earlier detection.
          </AppText>
          <AppText variant="caption" color={colors.textMuted} center>
            Version {APP_VERSION}
          </AppText>
        </View>
      </View>

      <DemoModeBanner />

      <Card style={styles.card}>
        <AppText variant="subheading">Purpose</AppText>
        <AppText variant="small" color={colors.textSecondary}>
          PathoTrace is an AI-assisted bovine mastitis risk monitoring and cattle health management
          application. It gives farmers, veterinarians, and cooperatives a mobile view of cattle
          records, assessment history, alerts, and permitted follow-up notes.
        </AppText>
      </Card>

      <View style={styles.section}>
        <SectionHeader title="Risk estimates, not diagnoses" />
        <AiDisclaimer />
        <Card style={styles.spacedCard}>
          <InfoPoint
            icon="analytics-outline"
            title="Category-based presentation"
            body="Risk categories are shown alongside the assessment record they came from. The app does not invent probabilities, accuracy figures, explanations, or contributing factors."
          />
          <InfoPoint
            icon="medkit-outline"
            title="Professional judgement"
            body="A high-risk category is a prompt to review the animal and seek qualified veterinary advice. It is not a confirmed case of mastitis or any other condition."
          />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Prediction integration" />
        <Card>
          <AppText variant="small" color={colors.textSecondary}>
            {IS_DEMO_MODE
              ? 'This demonstration build is not connected to a live backend or ML inference service. New assessment requests record a sample category from the demonstration dataset and do not calculate a probability.'
              : 'This build is configured to use a remote PathoTrace service. Assessment results are displayed exactly as returned by that service. Availability and model behaviour depend on the connected backend.'}
          </AppText>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="What the app does not do" />
        <Card style={styles.spacedCard}>
          <InfoPoint
            icon="close-circle-outline"
            title="No invented health records"
            body="Missing information is displayed as not recorded. The app does not fill gaps with fictional checkups, treatments, or readings."
          />
          <InfoPoint
            icon="cloud-offline-outline"
            title="No offline assessments"
            body="New assessment requests require connectivity unless a verified on-device inference implementation is added."
          />
          <InfoPoint
            icon="notifications-off-outline"
            title="No push notifications"
            body="Alerts are available inside the app. Push notification delivery is not enabled in this build."
          />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Offline behaviour" />
        <Card>
          <AppText variant="small" color={colors.textSecondary}>
            Previously synchronized records are cached locally and shown with a stale-data notice.
            The app shows an offline indicator when connectivity is unavailable and retries queued
            veterinary observations when the connection returns.
          </AppText>
        </Card>
      </View>

      <View style={styles.footer}>
        <AppText variant="caption" color={colors.textMuted} center>
          Built with React Native, Expo, and TypeScript.
        </AppText>
        <AppText variant="caption" color={colors.textMuted} center>
          PathoTrace Mobile · {APP_VERSION}
        </AppText>
      </View>
    </Screen>
  );
}

function InfoPoint({
  icon,
  title,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.infoPoint}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.infoText}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="small" color={colors.textSecondary}>
          {body}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  brandText: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  card: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  section: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  spacedCard: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  infoPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    gap: 2,
  },
  footer: {
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
});
