import { IS_DEMO_MODE } from '@/constants/config';
import { readValue, removeValue, writeValue } from '@/database';
import { isNetworkAvailable } from '@/services/network';
import { ApiError, type Resource } from '@/types';
import { getErrorCode } from '@/utils/errors';

interface ResolveOptions<T> {
  key: string;
  demo: () => T | Promise<T>;
  remote: () => Promise<T>;
}

function liveResource<T>(data: T): Resource<T> {
  return {
    data,
    source: 'network',
    fetchedAt: new Date().toISOString(),
    stale: false,
  };
}

export function demoResource<T>(data: T): Resource<T> {
  return {
    data,
    source: 'demo',
    fetchedAt: new Date().toISOString(),
    stale: false,
  };
}

export async function resolveResource<T>(options: ResolveOptions<T>): Promise<Resource<T>> {
  if (IS_DEMO_MODE) {
    return demoResource(await options.demo());
  }

  const cached = await readValue<T>(options.key);
  const online = await isNetworkAvailable();

  if (!online) {
    if (cached) {
      return {
        data: cached.value,
        source: 'cache',
        fetchedAt: new Date(cached.updatedAt).toISOString(),
        stale: true,
      };
    }
    throw new ApiError(
      'OFFLINE',
      'You are offline and this record has not been saved on this device.'
    );
  }

  try {
    const data = await options.remote();
    await writeValue(options.key, data);
    return liveResource(data);
  } catch (error) {
    const code = getErrorCode(error);

    if (code === 'UNAUTHORIZED' || code === 'FORBIDDEN' || code === 'NOT_FOUND') {
      await removeValue(options.key);
      throw error;
    }

    const cacheable =
      code === 'NETWORK_UNAVAILABLE' ||
      code === 'TIMEOUT' ||
      code === 'RATE_LIMITED' ||
      code === 'SERVER_ERROR';

    if (cacheable && cached) {
      return {
        data: cached.value,
        source: 'cache',
        fetchedAt: new Date(cached.updatedAt).toISOString(),
        stale: true,
      };
    }
    throw error;
  }
}

export async function requireOnline(): Promise<void> {
  const online = await isNetworkAvailable();
  if (!online) {
    throw new ApiError('OFFLINE', 'A network connection is required for this action.');
  }
}
