import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AssessmentCard } from '@/components/assessment-card';
import { AppHeader } from '@/components/ui/app-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FilterChips } from '@/components/ui/filter-chips';
import { DemoModeBanner, StaleDataNotice } from '@/components/ui/notice-banner';
import { Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { colors, spacing } from '@/constants/theme';
import { useAssessments } from '@/features/assessments/use-assessments';
import type { RiskCategory } from '@/types';

type Filter = RiskCategory | 'all';

export default function AssessmentsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const query = useAssessments();
  const assessments = useMemo(() => query.data?.data ?? [], [query.data]);

  const counts = useMemo(() => {
    const base: Record<Filter, number> = {
      all: assessments.length,
      high: 0,
      medium: 0,
      low: 0,
    };
    for (const assessment of assessments) base[assessment.category] += 1;
    return base;
  }, [assessments]);

  const visible = useMemo(
    () =>
      filter === 'all'
        ? assessments
        : assessments.filter((assessment) => assessment.category === filter),
    [assessments, filter]
  );

  return (
    <Screen scroll refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <AppHeader
        title="Assessments"
        subtitle="Risk assessment history across the herd"
        right={
          <Button
            label="New"
            icon="add"
            size="sm"
            onPress={() => router.push('/assessment/new')}
          />
        }
      />

      <DemoModeBanner compact />

      {query.isLoading ? (
        <LoadingState message="Loading assessments…" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          {query.data?.source === 'cache' ? (
            <StaleDataNotice fetchedAt={query.data.fetchedAt} style={styles.spaced} />
          ) : null}

          <Card style={styles.summary}>
            <View>
              <AppText variant="heading">{counts.all}</AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                Total assessments
              </AppText>
            </View>
            <View style={styles.summaryDivider} />
            <View>
              <AppText variant="heading" color={colors.high}>
                {counts.high}
              </AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                High risk
              </AppText>
            </View>
            <View style={styles.summaryDivider} />
            <View>
              <AppText variant="heading" color={colors.medium}>
                {counts.medium}
              </AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                Medium risk
              </AppText>
            </View>
            <View style={styles.summaryDivider} />
            <View>
              <AppText variant="heading" color={colors.low}>
                {counts.low}
              </AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                Low risk
              </AppText>
            </View>
          </Card>

          <View style={styles.filters}>
            <FilterChips
              options={[
                { value: 'all', label: 'All', count: counts.all },
                { value: 'high', label: 'High', count: counts.high },
                { value: 'medium', label: 'Medium', count: counts.medium },
                { value: 'low', label: 'Low', count: counts.low },
              ]}
              value={filter}
              onChange={(value) => setFilter(value as Filter)}
              accessibilityLabel="Filter assessments by risk category"
            />
          </View>

          {visible.length === 0 ? (
            <EmptyState
              icon="pulse-outline"
              title={assessments.length === 0 ? 'No assessments yet' : 'No assessments in this category'}
              message={
                assessments.length === 0
                  ? 'Request an assessment to create the first record for this herd.'
                  : 'Choose another risk category to review more records.'
              }
              actionLabel={assessments.length === 0 ? 'Request assessment' : 'Show all'}
              onAction={() =>
                assessments.length === 0
                  ? router.push('/assessment/new')
                  : setFilter('all')
              }
            />
          ) : (
            <View style={styles.list}>
              {visible.map((assessment) => (
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

          <AppText variant="caption" color={colors.textMuted} center style={styles.footnote}>
            Risk categories are estimates and are not confirmed veterinary diagnoses.
          </AppText>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  summaryDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
  filters: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  footnote: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  spaced: {
    marginTop: spacing.md,
  },
});
