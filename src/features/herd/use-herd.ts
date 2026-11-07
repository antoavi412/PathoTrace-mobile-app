import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { fetchAllCows, fetchCow, fetchHerd } from '@/services/herd-service';
import type { Cow, CowRiskStatus } from '@/types';

export const HERD_PAGE_SIZE = 8;

export function useHerd(search: string, risk: CowRiskStatus | 'all') {
  return useInfiniteQuery({
    queryKey: ['herd', search.trim().toLowerCase(), risk],
    queryFn: ({ pageParam }) =>
      fetchHerd({
        page: pageParam,
        pageSize: HERD_PAGE_SIZE,
        query: search,
        risk,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.data.hasMore ? lastPage.data.page + 1 : undefined,
  });
}

export function flattenHerdPages(
  pages: Awaited<ReturnType<typeof fetchHerd>>[]
): { cows: Cow[]; total: number } {
  const cows = pages.flatMap((page) => page.data.items);
  const total = pages[0]?.data.total ?? cows.length;
  return { cows, total };
}

export function useCow(id: string | undefined) {
  return useQuery({
    queryKey: ['cow', id],
    queryFn: () => fetchCow(id as string),
    enabled: Boolean(id),
  });
}

export function useAllCows() {
  return useQuery({
    queryKey: ['cows', 'all'],
    queryFn: fetchAllCows,
  });
}
