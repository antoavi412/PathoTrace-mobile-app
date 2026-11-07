import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertListItem } from '@/components/alert-list-item';
import { AppHeader } from '@/components/ui/app-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FilterChips } from '@/components/ui/filter-chips';
import { DemoModeBanner, StaleDataNotice } from '@/components/ui/notice-banner';
import { Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { colors, spacing } from '@/constants/theme';
import {
  useAlerts,
  useMarkAlertRead,
  useMarkAllAlertsRead,
} from '@/features/alerts/use-alerts';

type Filter = 'all' | 'unread';

export default function AlertsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const query = useAlerts();
  const markRead = useMarkAlertRead();
  const markAllRead = useMarkAllAlertsRead();
  const alerts = useMemo(() => query.data?.data ?? [], [query.data]);

  const unread = useMemo(() => alerts.filter((alert) => !alert.read), [alerts]);
  const visible = filter === 'unread' ? unread : alerts;

  function openAlert(alertId: string, cowId: string, assessmentId?: string) {
    markRead.mutate(alertId);
    if (assessmentId) {
      router.push({ pathname: '/assessment/[id]', params: { id: assessmentId } });
      return;
    }
    router.push({ pathname: '/cow/[id]', params: { id: cowId } });
  }

  return (
    <Screen scroll refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <AppHeader
        title="Alerts"
        subtitle="Assessment notifications and follow-up prompts"
        right={
          unread.length > 0 ? (
            <Button
              label="Mark all"
              size="sm"
              variant="secondary"
              loading={markAllRead.isPending}
              onPress={() => markAllRead.mutate(unread.map((alert) => alert.id))}
            />
          ) : undefined
        }
      />

      <DemoModeBanner compact />

      {query.isLoading ? (
        <LoadingState message="Loading alerts…" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          {query.data?.source === 'cache' ? (
            <StaleDataNotice fetchedAt={query.data.fetchedAt} style={styles.spaced} />
          ) : null}

          <Card style={styles.summary}>
            <View style={styles.summaryMain}>
              <AppText variant="heading">{unread.length}</AppText>
              <AppText variant="small" color={colors.textSecondary}>
                unread {unread.length === 1 ? 'alert' : 'alerts'}
              </AppText>
            </View>
            <AppText variant="caption" color={colors.textMuted} style={styles.summaryNote}>
              Open an alert to review the linked assessment or cattle record.
            </AppText>
          </Card>

          <View style={styles.filters}>
            <FilterChips
              options={[
                { value: 'all', label: 'All alerts', count: alerts.length },
                { value: 'unread', label: 'Unread', count: unread.length },
              ]}
              value={filter}
              onChange={(value) => setFilter(value as Filter)}
              accessibilityLabel="Filter alerts"
            />
          </View>

          {visible.length === 0 ? (
            <EmptyState
              icon={filter === 'unread' ? 'checkmark-done-outline' : 'notifications-off-outline'}
              title={filter === 'unread' ? 'You are all caught up' : 'No alerts available'}
              message={
                filter === 'unread'
                  ? 'There are no unread assessment alerts right now.'
                  : 'Alerts will appear here when new assessment notifications are recorded.'
              }
              actionLabel={filter === 'unread' ? 'Show all alerts' : undefined}
              onAction={filter === 'unread' ? () => setFilter('all') : undefined}
            />
          ) : (
            <View style={styles.list}>
              {visible.map((alert) => (
                <AlertListItem
                  key={alert.id}
                  alert={alert}
                  onPress={() => openAlert(alert.id, alert.cowId, alert.assessmentId)}
                />
              ))}
            </View>
          )}

          <AppText variant="caption" color={colors.textMuted} center style={styles.footnote}>
            Alerts are generated from recorded assessment categories, not from invented prediction
            results.
          </AppText>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  summaryMain: {
    alignItems: 'center',
    minWidth: 72,
  },
  summaryNote: {
    flex: 1,
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
