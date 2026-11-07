import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/ui/app-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
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
import { ErrorState, LoadingState } from '@/components/ui/states';
import { colors, spacing } from '@/constants/theme';
import { useAssessment } from '@/features/assessments/use-assessments';
import { formatDateTime, formatLiters, formatNumber, relativeTime } from '@/utils/format';

export default function AssessmentDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const assessmentId = Array.isArray(params.id) ? params.id[0] : params.id;
  const query = useAssessment(assessmentId);

  if (query.isLoading) {
    return (
      <Screen>
        <AppHeader title="Assessment result" showBack />
        <LoadingState message="Loading assessment…" />
      </Screen>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Screen>
        <AppHeader title="Assessment result" showBack />
        <ErrorState
          error={query.error ?? new Error('Assessment not found.')}
          title="Unable to load this assessment"
          onRetry={() => void query.refetch()}
        />
      </Screen>
    );
  }

  const assessment = query.data.data;

  return (
    <Screen scroll>
      <AppHeader
        title="Assessment result"
        subtitle={`${assessment.cowTagId}${assessment.cowName ? ` · ${assessment.cowName}` : ''}`}
        showBack
      />

      <DemoModeBanner compact />

      {query.data.source === 'cache' ? (
        <StaleDataNotice fetchedAt={query.data.fetchedAt} style={styles.spaced} />
      ) : null}

      <Card style={styles.resultCard} raised>
        <View style={styles.resultHeader}>
          <StatusBadge status={assessment.category} />
          <AppText variant="caption" color={colors.textMuted}>
            {relativeTime(assessment.createdAt)}
          </AppText>
        </View>
        <RiskGauge status={assessment.category} caption="Recorded risk" />
        <AppText variant="small" color={colors.textSecondary} center>
          Recorded {formatDateTime(assessment.createdAt)}
        </AppText>
        {assessment.probability !== undefined ? (
          <View style={styles.probability}>
            <AppText variant="caption" color={colors.textSecondary}>
              Model probability value
            </AppText>
            <AppText variant="subheading">
              {assessment.probability.toLocaleString('en-GB')}
            </AppText>
            <AppText variant="caption" color={colors.textMuted} center>
              Displayed exactly as returned by the assessment service.
            </AppText>
          </View>
        ) : (
          <AppText variant="caption" color={colors.textMuted} center>
            No probability value was returned with this record, so none is displayed.
          </AppText>
        )}
      </Card>

      {assessment.isDemonstration ? (
        <NoticeBanner
          title="Demonstration result"
          message="No machine-learning model was used to produce this record. The sample category comes from the demonstration dataset and is not a prediction."
          tone="warning"
          style={styles.notice}
        />
      ) : null}

      <AiDisclaimer />

      <View style={styles.section}>
        <SectionHeader title="Recorded inputs" subtitle="Values submitted with this assessment" />
        <Card>
          <KeyValueRow label="Animal" value={`${assessment.cowTagId}${assessment.cowName ? ` · ${assessment.cowName}` : ''}`} />
          <KeyValueRow label="Milk yield" value={formatLiters(assessment.input.milkYieldLiters)} />
          <KeyValueRow
            label="Somatic cell count"
            value={`${formatNumber(assessment.input.somaticCellCount)} cells/mL`}
          />
          <KeyValueRow
            label="Milk temperature"
            value={`${assessment.input.milkTemperatureC} °C`}
          />
          <KeyValueRow label="Days in milk" value={`${assessment.input.daysInMilk} days`} />
          <KeyValueRow
            label="Lactation number"
            value={String(assessment.input.lactationNumber)}
          />
          {assessment.modelVersion ? (
            <KeyValueRow label="Model version" value={assessment.modelVersion} />
          ) : null}
        </Card>
      </View>

      {assessment.note ? (
        <View style={styles.section}>
          <SectionHeader title="Record note" />
          <Card>
            <AppText variant="small" color={colors.textSecondary}>
              {assessment.note}
            </AppText>
          </Card>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          label="View cattle profile"
          icon="paw-outline"
          variant="secondary"
          onPress={() =>
            router.push({ pathname: '/cow/[id]', params: { id: assessment.cowId } })
          }
          fullWidth
        />
        <Button
          label="Request another assessment"
          icon="pulse-outline"
          onPress={() =>
            router.push({ pathname: '/assessment/new', params: { cowId: assessment.cowId } })
          }
          fullWidth
        />
      </View>

      <AppText variant="caption" color={colors.textMuted} center style={styles.footnote}>
        Contact a qualified veterinarian for clinical decisions. A risk category alone does not
        confirm mastitis or any other condition.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  resultCard: {
    gap: spacing.md,
    marginTop: spacing.lg,
    alignItems: 'stretch',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  probability: {
    alignItems: 'center',
    gap: 2,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  notice: {
    marginTop: spacing.md,
  },
  section: {
    marginTop: spacing.xl,
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  footnote: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  spaced: {
    marginBottom: spacing.md,
  },
});
