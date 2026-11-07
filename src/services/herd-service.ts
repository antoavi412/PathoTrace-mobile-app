import { IS_DEMO_MODE } from '@/constants/config';
import type { Cow, HerdQuery, Paginated, Resource } from '@/types';
import { DEMO_COWS, getDemoCow, getDemoHerd } from './demo/demo-data';
import { remoteAllCows, remoteCow, remoteHerd } from './remote/api';
import { resolveResource } from './resource';

function herdCacheKey(query: HerdQuery): string {
  return `herd:${query.page}:${query.pageSize}:${query.risk ?? 'all'}:${(query.query ?? '').trim().toLowerCase()}`;
}

export function fetchHerd(query: HerdQuery): Promise<Resource<Paginated<Cow>>> {
  return resolveResource({
    key: herdCacheKey(query),
    demo: () => getDemoHerd(query),
    remote: () => remoteHerd(query),
  });
}

export function fetchCow(id: string): Promise<Resource<Cow>> {
  return resolveResource({
    key: `cow:${id}`,
    demo: () => {
      const cow = getDemoCow(id);
      if (!cow) throw new Error('Cattle record not found.');
      return cow;
    },
    remote: () => remoteCow(id),
  });
}

export function fetchAllCows(): Promise<Resource<Cow[]>> {
  return resolveResource({
    key: 'cows:all',
    demo: () => [...DEMO_COWS],
    remote: remoteAllCows,
  });
}

export function isDemoHerd(): boolean {
  return IS_DEMO_MODE;
}
