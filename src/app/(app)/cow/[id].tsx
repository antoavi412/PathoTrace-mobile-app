import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AssessmentCard } from '@/components/assessment-card';
import { HealthRecordCard } from '@/components/health-record-card';
import { ObservationCard } from '@/components/observation-card';
import { AppHeader } from '@/components/ui/app-header';
import { AppText } from '@/components/ui/app-text';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { KeyValueRow } from '@/components/ui/key-value-row';
import {
  AiDisclaimer,
  DemoModeBanner,
  NoticeBanner,
  StaleDataNotice,
} from '@/components/ui/notice-banner';
import { RiskGauge } from '@/components/ui/risk-gauge';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { IS_DEMO_MODE } from '@/constants/config';
import { colors, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { useAssessments } from '@/features/assessments/use-assessments';
import { useHealthRecords, useObservations } from '@/features/cow/use-cow-records';
import { useCow } from '@/features/herd/use-herd';
import { AddObservationModal } from '@/features/vet/add-observation-modal';
import { getErrorMessage } from '@/utils/errors';
import { formatAge, formatDateTime, relativeTime } from '@/utils/format';
import { canAddVeterinaryObservation } from '@/utils/permissions';

export default function CowDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const cowId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user } = useAuth();
  const [observationOpen, setObservationOpen] = useState(false);

  const cowQuery = useCow(cowId);
  const assessmentsQuery = useAssessments(cowId);
  const recordsQuery = useHealthRecords(cowId);
  const observationsQuery = useObservations(cowId);

  const cow = cowQuery.data?.data;
  const assessments = assessmentsQuery.data?.data ?? [];
  const records = recordsQuery.data?.data ?? [];
  const observations = observationsQuery.data?.data ?? [];

  const canAddObservation = canAddVeterinaryObservation(user, cow);

  if (!cowId) {
    return (
      <Screen>
        <AppHeader title="Cattle profile" showBack />
        <EmptyState
          icon="alert-circle-outline"
          title="Cattle record unavailable"
          message="The selected record could not be identified."
          actionLabel="Back to herd"
          onAction={() => router.replace('/herd')}
        />
      </Screen>
    );
  }

  if (cowQuery.isLoading) {
    return (
      <Screen>
        <AppHeader title="Cattle profile" showBack />
        <LoadingState message="Loading cattle record…" />
      </Screen>
    );
  }

  if (cowQuery.isError || !cow) {
    return (
      <Screen>
        <AppHeader title="Cattle profile" showBack />
        <ErrorState
          error={cowQuery.error ?? new Error('Cattle record not found.')}
          title="Unable to load this cattle record"
          onRetry={() => void cowQuery.refetch()}
        />
      </Screen>
    );
  }

  const title = cow.tagId;
  const subtitle = cow.name ? `${cow.name} · ${cow.breed}` : cow.breed;

  return (
    <Screen scroll refreshing={cowQuery.isRefetching} onRefresh={() => void cowQuery.refetch()}>
      <AppHeader
        title={title}
        subtitle={subtitle}
        showBack
        right={
          canAddObservation ? (
            <IconButton
              icon="medkit-outline"
              accessibilityLabel="Add veterinary observation"
              onPress={() => setObservationOpen(true)}
            />
          ) : undefined
        }
      />

      <DemoModeBanner compact />

      {cowQuery.data?.source === 'cache' ? (
        <StaleDataNotice fetchedAt={cowQuery.data.fetchedAt} style={styles.spaced} />
      ) : null}

      <Card style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.cowAvatar}>
            <MaterialCommunityIcons name="cow" size={34} color={colors.primary} />
          </View>
          <View style={styles.heroText}>
            <AppText variant="heading">
              {cow.tagId}
              {cow.name ? ` · ${cow.name}` : ''}
            </AppText>
            <AppText variant="small" color={colors.textSecondary}>
              {cow.breed}
            </AppText>
            <View style={styles.heroBadges}>
              <StatusBadge status={cow.riskStatus} size="sm" />
              {cow.lactationStage ? (
                <View style={styles.stageBadge}>
                  <AppText variant="tiny" color={colors.textSecondary}>
                    {cow.lactationStage.toUpperCase()}
                  </AppText>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.details}>
          <KeyValueRow label="Age" value={formatAge(cow.ageMonths)} />
          <KeyValueRow
            label="Lactation"
            value={cow.lactationNumber ? `Number ${cow.lactationNumber}` : 'Not recorded'}
          />
          <KeyValueRow
            label="Days in milk"
            value={cow.daysInMilk !== undefined ? `${cow.daysInMilk} days` : 'Not recorded'}
          />
          <KeyValueRow label="Farm" value={cow.farmName ?? 'Not recorded'} />
          <KeyValueRow
            label="Last assessment"
            value={cow.lastAssessmentAt ? formatDateTime(cow.lastAssessmentAt) : 'Not assessed'}
          />
        </View>
        {cow.notes ? (
          <View style={styles.notes}>
            <AppText variant="caption" color={colors.textMuted}>
              Notes
            </AppText>
            <AppText variant="small" color={colors.textSecondary}>
              {cow.notes}
            </AppText>
          </View>
        ) : null}
      </Card>

      <View style={styles.section}>
        <SectionHeader title="Current risk" subtitle="Latest recorded assessment category" />
        <Card style={styles.riskCard}>
          <RiskGauge status={cow.riskStatus} />
          {cow.lastAssessmentAt ? (
            <AppText variant="small" color={colors.textSecondary} center>
              Last recorded {relativeTime(cow.lastAssessmentAt)}
            </AppText>
          ) : (
            <AppText variant="small" color={colors.textSecondary} center>
              No assessment has been recorded for this animal yet.
            </AppText>
          )}
          <AiDisclaimer />
          {IS_DEMO_MODE ? (
            <NoticeBanner
              message="In this demonstration build, requesting an assessment records a sample category from existing demo data. No ML model is called and no probability is generated."
              tone="warning"
            />
          ) : null}
          <Button
            label="Request assessment"
            icon="pulse-outline"
            fullWidth
            onPress={() =>
              router.push({ pathname: '/assessment/new', params: { cowId: cow.id } })
            }
          />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Assessment history"
          subtitle={`${assessments.length} ${assessments.length === 1 ? 'record' : 'records'}`}
          actionLabel="View all"
          onAction={() => router.push('/assessments')}
        />
        {assessmentsQuery.isLoading ? (
          <SectionLoading />
        ) : assessmentsQuery.isError ? (
          <NoticeBanner message={getErrorMessage(assessmentsQuery.error)} tone="danger" />
        ) : assessments.length === 0 ? (
          <Card style={styles.inlineEmpty}>
            <Ionicons name="pulse-outline" size={20} color={colors.textMuted} />
            <AppText variant="small" color={colors.textSecondary}>
              No assessments recorded for this animal.
            </AppText>
          </Card>
        ) : (
          <View style={styles.list}>
            {assessments.map((assessment) => (
              <AssessmentCard
                key={assessment.id}
                assessment={assessment}
                onPress={() =>
                  router.push({
                    pathname: '/assessment/[id]',
                    params: { id: assessment.id },
                  })
                }
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Health records" subtitle="Recorded checkups and treatments" />
        {recordsQuery.isLoading ? (
          <SectionLoading />
        ) : recordsQuery.isError ? (
          <NoticeBanner message={getErrorMessage(recordsQuery.error)} tone="danger" />
        ) : records.length === 0 ? (
          <Card style={styles.inlineEmpty}>
            <Ionicons name="clipboard-outline" size={20} color={colors.textMuted} />
            <AppText variant="small" color={colors.textSecondary}>
              No health records are available for this animal.
            </AppText>
          </Card>
        ) : (
          <View style={styles.list}>
            {records.map((record) => (
              <HealthRecordCard key={record.id} record={record} />
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Veterinary observations"
          subtitle={
            observations.length === 0
              ? 'Professional notes for this animal'
              : `${observations.length} ${observations.length === 1 ? 'note' : 'notes'}`
          }
          actionLabel={canAddObservation ? 'Add' : undefined}
          onAction={canAddObservation ? () => setObservationOpen(true) : undefined}
        />
        {observationsQuery.isLoading ? (
          <SectionLoading />
        ) : observationsQuery.isError ? (
          <NoticeBanner message={getErrorMessage(observationsQuery.error)} tone="danger" />
        ) : observations.length === 0 ? (
          <Card style={styles.inlineEmpty}>
            <Ionicons name="medkit-outline" size={20} color={colors.textMuted} />
            <AppText variant="small" color={colors.textSecondary}>
              No veterinary observations have been recorded.
            </AppText>
          </Card>
        ) : (
          <View style={styles.list}>
            {observations.map((observation) => (
              <ObservationCard key={observation.id} observation={observation} />
            ))}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <AppText variant="caption" color={colors.textMuted} center>
          Only records returned by the configured service are displayed. Missing information is
          shown as not recorded.
        </AppText>
      </View>

      {observationOpen ? (
        <AddObservationModal
          cowId={cow.id}
          cowLabel={`${cow.tagId}${cow.name ? ` · ${cow.name}` : ''}`}
          onClose={() => setObservationOpen(false)}
        />
      ) : null}
    </Screen>
  );
}

function SectionLoading() {
  return (
    <View style={styles.sectionLoading}>
      <ActivityIndicator color={colors.primary} />
      <AppText variant="caption" color={colors.textSecondary}>
        Loading…
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.lg,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  cowAvatar: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
    gap: 3,
  },
  heroBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 4,
  },
  stageBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  details: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  notes: {
    gap: 2,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  section: {
    marginTop: spacing.xl,
  },
  riskCard: {
    gap: spacing.md,
    alignItems: 'stretch',
  },
  list: {
    gap: spacing.sm,
  },
  inlineEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  sectionLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  footer: {
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  spaced: {
    marginBottom: spacing.md,
  },
});
