import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { CowListItem } from '@/components/cow-list-item';
import { AppHeader } from '@/components/ui/app-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { FilterChips } from '@/components/ui/filter-chips';
import { StaleDataNotice } from '@/components/ui/notice-banner';
import { Screen } from '@/components/ui/screen';
import { SearchBar } from '@/components/ui/search-bar';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { colors, spacing } from '@/constants/theme';
import { flattenHerdPages, useHerd } from '@/features/herd/use-herd';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import type { CowRiskStatus } from '@/types';
import { relativeTime } from '@/utils/format';
import { RISK_FILTER_OPTIONS } from '@/utils/risk';

type RiskFilter = CowRiskStatus | 'all';

function parseRisk(value: string | string[] | undefined): RiskFilter {
  const candidate = Array.isArray(value) ? value[0] : value;
  return RISK_FILTER_OPTIONS.some((option) => option.value === candidate)
    ? (candidate as RiskFilter)
    : 'all';
}

export default function HerdScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ risk?: string }>();
  const [search, setSearch] = useState('');
  const risk = parseRisk(params.risk);
  const debouncedSearch = useDebouncedValue(search, 300);

  const query = useHerd(debouncedSearch, risk);
  const herd = useMemo(
    () => (query.data ? flattenHerdPages(query.data.pages) : { cows: [], total: 0 }),
    [query.data]
  );

  const header = (
    <View>
      <AppHeader
        title="My Herd"
        subtitle={
          query.data
            ? `${herd.total} ${herd.total === 1 ? 'animal' : 'animals'} in this view`
            : 'Search and review cattle records'
        }
      />
      {query.data?.pages[0]?.source === 'cache' ? (
        <StaleDataNotice fetchedAt={query.data.pages[0].fetchedAt} style={styles.spaced} />
      ) : null}
      <View style={styles.controls}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search tag, name, breed…"
          accessibilityLabel="Search herd"
        />
        <FilterChips
          options={RISK_FILTER_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          value={risk}
          onChange={(value) => router.setParams({ risk: value })}
          accessibilityLabel="Filter herd by risk"
        />
      </View>
      <View style={styles.actionRow}>
        <AppText variant="small" color={colors.textSecondary}>
          Sorted by risk priority
        </AppText>
        <Button
          label="Assess"
          icon="add-circle-outline"
          size="sm"
          onPress={() => router.push('/assessment/new')}
        />
      </View>
    </View>
  );

  return (
    <Screen padded={false}>
      <FlatList
        data={herd.cows}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CowListItem
            cow={item}
            onPress={() => router.push({ pathname: '/cow/[id]', params: { id: item.id } })}
            subtitle={`${item.breed}${
              item.lastAssessmentAt ? ` · assessed ${relativeTime(item.lastAssessmentAt)}` : ''
            }`}
          />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={
          query.isLoading ? (
            <LoadingState message="Loading cattle records…" />
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => void query.refetch()} />
          ) : (
            <EmptyState
              icon="search-outline"
              title="No cattle match these filters"
              message="Try a different search term or risk category."
              actionLabel="Clear filters"
              onAction={() => {
                setSearch('');
                router.setParams({ risk: 'all' });
              }}
            />
          )
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.primary} />
              <AppText variant="caption" color={colors.textSecondary}>
                Loading more cattle…
              </AppText>
            </View>
          ) : herd.cows.length > 0 && !query.hasNextPage ? (
            <AppText variant="caption" color={colors.textMuted} center style={styles.end}>
              End of list
            </AppText>
          ) : undefined
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        refreshing={query.isRefetching && !query.isFetchingNextPage}
        onRefresh={() => void query.refetch()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  controls: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  separator: {
    height: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  end: {
    paddingVertical: spacing.lg,
  },
  spaced: {
    marginBottom: spacing.md,
  },
});
