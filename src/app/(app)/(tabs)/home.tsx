import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AlertListItem } from '@/components/alert-list-item';
import { AssessmentCard } from '@/components/assessment-card';
import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DemoModeBanner, StaleDataNotice } from '@/components/ui/notice-banner';
import { QuickAction } from '@/components/ui/quick-action';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { colors, radius, spacing } from '@/constants/theme';
import { useMarkAlertRead, useUnreadAlertCount } from '@/features/alerts/use-alerts';
import { useAuth } from '@/features/auth/auth-context';
import { useDashboard } from '@/features/dashboard/use-dashboard';
import { relativeTime } from '@/utils/format';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const unreadAlerts = useUnreadAlertCount();
  const markAlertRead = useMarkAlertRead();
  const { data, isLoading, isError, error, refetch, isRefetching } = useDashboard();

  const summary = data?.data;
  const firstName = user?.name.split(' ')[0] ?? 'there';

  function openAlert(alertId: string, cowId: string, assessmentId?: string) {
    markAlertRead.mutate(alertId);
    if (assessmentId) {
      router.push({ pathname: '/assessment/[id]', params: { id: assessmentId } });
      return;
    }
    router.push({ pathname: '/cow/[id]', params: { id: cowId } });
  }

  return (
    <Screen scroll refreshing={isRefetching} onRefresh={() => void refetch()}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="small" color={colors.textSecondary}>
            {greeting()},
          </AppText>
          <AppText variant="title">{firstName}</AppText>
          <AppText variant="small" color={colors.textMuted}>
            {user?.farmName ?? 'Your farm'}
          </AppText>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Alerts, ${unreadAlerts} unread`}
            onPress={() => router.push('/alerts')}
            style={({ pressed }) => [styles.bell, pressed && styles.pressed]}>
            <Ionicons name="notifications-outline" size={21} color={colors.text} />
            {unreadAlerts > 0 ? (
              <View style={styles.bellBadge}>
                <AppText variant="tiny" style={styles.bellBadgeText}>
                  {unreadAlerts > 9 ? '9+' : unreadAlerts}
                </AppText>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            onPress={() => router.push('/profile')}>
            <Avatar name={user?.name ?? 'PathoTrace'} size={44} />
          </Pressable>
        </View>
      </View>

      <DemoModeBanner />

      {isLoading ? (
        <LoadingState message="Loading herd summary…" />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !summary ? (
        <EmptyState
          icon="paw-outline"
          title="No herd summary yet"
          message="Your dashboard will populate when cattle records are available."
        />
      ) : (
        <>
          {data?.source === 'cache' ? <StaleDataNotice fetchedAt={data.fetchedAt} /> : null}

          <View style={styles.statsGrid}>
            <StatCard
              label="Total cattle"
              value={summary.totalCattle}
              icon="paw-outline"
              tone={colors.primary}
              soft={colors.accentSoft}
              onPress={() => router.push('/herd')}
            />
            <StatCard
              label="High risk"
              value={summary.highRisk}
              icon="alert-circle-outline"
              tone={colors.high}
              soft={colors.highSoft}
              onPress={() => router.push({ pathname: '/herd', params: { risk: 'high' } })}
            />
            <StatCard
              label="Medium risk"
              value={summary.mediumRisk}
              icon="warning-outline"
              tone={colors.medium}
              soft={colors.mediumSoft}
              onPress={() => router.push({ pathname: '/herd', params: { risk: 'medium' } })}
            />
            <StatCard
              label="Low risk"
              value={summary.lowRisk}
              icon="checkmark-circle-outline"
              tone={colors.low}
              soft={colors.lowSoft}
              onPress={() => router.push({ pathname: '/herd', params: { risk: 'low' } })}
            />
          </View>

          <View style={styles.quickActionsHeader}>
            <SectionHeader title="Quick actions" />
            <View style={styles.quickActions}>
              <QuickAction
                icon="add-circle-outline"
                title="Request assessment"
                subtitle="Submit herd inputs"
                onPress={() => router.push('/assessment/new')}
              />
              <QuickAction
                icon="paw-outline"
                title="View herd"
                subtitle={`${summary.totalCattle} cattle listed`}
                onPress={() => router.push('/herd')}
              />
              <QuickAction
                icon="notifications-outline"
                title="Alerts"
                subtitle={unreadAlerts > 0 ? `${unreadAlerts} unread` : 'All caught up'}
                onPress={() => router.push('/alerts')}
                tone={unreadAlerts > 0 ? colors.high : colors.primary}
                soft={unreadAlerts > 0 ? colors.highSoft : colors.accentSoft}
              />
              {user?.role === 'veterinarian' ? (
                <QuickAction
                  icon="medkit-outline"
                  title="Veterinary review"
                  subtitle="Assigned cattle"
                  onPress={() => router.push('/vet')}
                />
              ) : (
                <QuickAction
                  icon="information-circle-outline"
                  title="Risk guidance"
                  subtitle="How estimates work"
                  onPress={() => router.push('/about')}
                />
              )}
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader
              title="Recent assessments"
              actionLabel="View all"
              onAction={() => router.push('/assessments')}
            />
            {summary.recentAssessments.length === 0 ? (
              <Card style={styles.inlineEmpty}>
                <Ionicons name="pulse-outline" size={20} color={colors.textMuted} />
                <AppText variant="small" color={colors.textSecondary}>
                  No assessments recorded yet.
                </AppText>
              </Card>
            ) : (
              <View style={styles.list}>
                {summary.recentAssessments.slice(0, 3).map((assessment) => (
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
            <Button
              label="Request a new assessment"
              icon="add-circle-outline"
              variant="secondary"
              onPress={() => router.push('/assessment/new')}
              fullWidth
            />
          </View>

          <View style={styles.section}>
            <SectionHeader
              title="Recent alerts"
              actionLabel="View all"
              onAction={() => router.push('/alerts')}
            />
            {summary.recentAlerts.length === 0 ? (
              <Card style={styles.inlineEmpty}>
                <Ionicons name="notifications-off-outline" size={20} color={colors.textMuted} />
                <AppText variant="small" color={colors.textSecondary}>
                  No alerts to review.
                </AppText>
              </Card>
            ) : (
              <View style={styles.list}>
                {summary.recentAlerts.slice(0, 2).map((alert) => (
                  <AlertListItem
                    key={alert.id}
                    alert={alert}
                    onPress={() => openAlert(alert.id, alert.cowId, alert.assessmentId)}
                  />
                ))}
              </View>
            )}
          </View>

          <View style={styles.updated}>
            <Ionicons name="time-outline" size={13} color={colors.textMuted} />
            <AppText variant="caption" color={colors.textMuted}>
              Updated {relativeTime(summary.lastUpdated)}
            </AppText>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bell: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 5,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.high,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  quickActionsHeader: {
    marginTop: spacing.xl,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  section: {
    marginTop: spacing.xl,
    gap: spacing.md,
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
  updated: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
});
