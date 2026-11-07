import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { CowListItem } from '@/components/cow-list-item';
import { AppHeader } from '@/components/ui/app-header';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { DemoModeBanner, NoticeBanner } from '@/components/ui/notice-banner';
import { Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { useAllCows } from '@/features/herd/use-herd';
import { countRisk, riskWeight } from '@/utils/risk';
import { relativeTime } from '@/utils/format';
import { canAccessVetWorkspace } from '@/utils/permissions';

export default function VetWorkspaceScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const query = useAllCows();

  const assigned = useMemo(() => {
    const cows = query.data?.data ?? [];
    const ids = user?.assignedCowIds;
    if (!ids) return [...cows].sort((a, b) => riskWeight(b.riskStatus) - riskWeight(a.riskStatus));
    return cows
      .filter((cow) => ids.includes(cow.id) || ids.includes(cow.tagId))
      .sort((a, b) => riskWeight(b.riskStatus) - riskWeight(a.riskStatus));
  }, [query.data, user?.assignedCowIds]);

  const counts = countRisk(assigned);

  if (!canAccessVetWorkspace(user)) {
    return (
      <Screen>
        <AppHeader title="Veterinary workspace" showBack />
        <EmptyState
          icon="lock-closed-outline"
          title="Veterinarian access only"
          message="This workspace is available to authorized veterinarian accounts."
          actionLabel="Back to home"
          onAction={() => router.replace('/home')}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <AppHeader
        title="Veterinary workspace"
        subtitle="Assigned cattle and professional observations"
        showBack
      />

      <DemoModeBanner compact />

      {query.isLoading ? (
        <LoadingState message="Loading assigned cattle…" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : assigned.length === 0 ? (
        <EmptyState
          icon="medkit-outline"
          title="No assigned cattle"
          message="Cattle assigned to your account will appear here. Ask an administrator if you expect to see animals."
        />
      ) : (
        <>
          <Card style={styles.summary}>
            <View style={styles.summaryItem}>
              <AppText variant="heading">{assigned.length}</AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                Assigned animals
              </AppText>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryItem}>
              <AppText variant="heading" color={colors.high}>
                {counts.high}
              </AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                High risk
              </AppText>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryItem}>
              <AppText variant="heading" color={colors.medium}>
                {counts.medium}
              </AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                Medium risk
              </AppText>
            </View>
          </Card>

          <NoticeBanner
            message="Open an animal profile to review assessment history and add a professional observation. Only authorized veterinarian accounts can submit observations."
            tone="info"
            style={styles.notice}
          />

          <View style={styles.listHeader}>
            <AppText variant="subheading">Assigned cattle</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              Sorted by risk priority
            </AppText>
          </View>

          <View style={styles.list}>
            {assigned.map((cow) => (
              <CowListItem
                key={cow.id}
                cow={cow}
                onPress={() => router.push({ pathname: '/cow/[id]', params: { id: cow.id } })}
                subtitle={`${cow.breed}${
                  cow.lastAssessmentAt
                    ? ` · assessed ${relativeTime(cow.lastAssessmentAt)}`
                    : ' · not assessed'
                }`}
              />
            ))}
          </View>
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
    marginTop: spacing.lg,
    paddingVertical: spacing.lg,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
  notice: {
    marginTop: spacing.md,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
});
