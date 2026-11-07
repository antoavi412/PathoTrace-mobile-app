type ResourceModule = typeof import('@/services/resource');

const originalBaseUrl = process.env.EXPO_PUBLIC_API_URL;
const readValue = jest.fn();
const writeValue = jest.fn();
const removeValue = jest.fn();
const isNetworkAvailable = jest.fn();

function loadResource(baseUrl = 'https://api.test'): ResourceModule {
  process.env.EXPO_PUBLIC_API_URL = baseUrl;
  jest.resetModules();
  jest.doMock('@/database', () => ({ readValue, removeValue, writeValue }));
  jest.doMock('@/services/network', () => ({ isNetworkAvailable }));
  return jest.requireActual<ResourceModule>('@/services/resource');
}

function currentApiError() {
  return jest.requireActual<typeof import('@/types')>('@/types').ApiError;
}

const cachedEntry = {
  value: [{ id: 'cached-cow' }],
  updatedAt: Date.parse('2026-03-01T10:00:00.000Z'),
};

beforeEach(() => {
  readValue.mockReset();
  writeValue.mockReset();
  removeValue.mockReset();
  isNetworkAvailable.mockReset();
});

afterEach(() => {
  if (originalBaseUrl === undefined) {
    delete process.env.EXPO_PUBLIC_API_URL;
  } else {
    process.env.EXPO_PUBLIC_API_URL = originalBaseUrl;
  }
  jest.resetModules();
});

describe('resolveResource', () => {
  it('uses the demo source without reading the network or cache', async () => {
    const resource = loadResource('');
    const remote = jest.fn();

    const result = await resource.resolveResource({
      key: 'cows',
      demo: () => [{ id: 'demo-cow' }],
      remote,
    });

    expect(result).toMatchObject({ data: [{ id: 'demo-cow' }], source: 'demo', stale: false });
    expect(remote).not.toHaveBeenCalled();
    expect(readValue).not.toHaveBeenCalled();
  });

  it('returns cached data while offline and marks it stale', async () => {
    const resource = loadResource();
    isNetworkAvailable.mockResolvedValue(false);
    readValue.mockResolvedValue(cachedEntry);
    const remote = jest.fn();

    const result = await resource.resolveResource({ key: 'cows', demo: () => [], remote });

    expect(result).toMatchObject({
      data: cachedEntry.value,
      source: 'cache',
      stale: true,
      fetchedAt: new Date(cachedEntry.updatedAt).toISOString(),
    });
    expect(remote).not.toHaveBeenCalled();
  });

  it('throws OFFLINE when offline with no cached copy', async () => {
    const resource = loadResource();
    isNetworkAvailable.mockResolvedValue(false);
    readValue.mockResolvedValue(null);

    await expect(
      resource.resolveResource({ key: 'cows', demo: () => [], remote: jest.fn() })
    ).rejects.toMatchObject({ code: 'OFFLINE' });
  });

  it('writes successful network responses to the cache', async () => {
    const resource = loadResource();
    isNetworkAvailable.mockResolvedValue(true);
    readValue.mockResolvedValue(null);
    const data = [{ id: 'network-cow' }];

    const result = await resource.resolveResource({
      key: 'cows',
      demo: () => [],
      remote: async () => data,
    });

    expect(result).toMatchObject({ data, source: 'network', stale: false });
    expect(writeValue).toHaveBeenCalledWith('cows', data);
    expect(removeValue).not.toHaveBeenCalled();
  });

  it('falls back to cache for transient server failures', async () => {
    const resource = loadResource();
    const ApiError = currentApiError();
    isNetworkAvailable.mockResolvedValue(true);
    readValue.mockResolvedValue(cachedEntry);

    const result = await resource.resolveResource({
      key: 'cows',
      demo: () => [],
      remote: async () => {
        throw new ApiError('SERVER_ERROR', 'Service unavailable');
      },
    });

    expect(result).toMatchObject({ data: cachedEntry.value, source: 'cache', stale: true });
    expect(removeValue).not.toHaveBeenCalled();
  });

  it('invalidates cached data when access is forbidden', async () => {
    const resource = loadResource();
    const ApiError = currentApiError();
    isNetworkAvailable.mockResolvedValue(true);
    readValue.mockResolvedValue(cachedEntry);

    await expect(
      resource.resolveResource({
        key: 'cows',
        demo: () => [],
        remote: async () => {
          throw new ApiError('FORBIDDEN', 'Not allowed');
        },
      })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    expect(removeValue).toHaveBeenCalledWith('cows');
  });

  it('invalidates cached data when a record is deleted', async () => {
    const resource = loadResource();
    const ApiError = currentApiError();
    isNetworkAvailable.mockResolvedValue(true);
    readValue.mockResolvedValue(cachedEntry);

    await expect(
      resource.resolveResource({
        key: 'cow:c-1',
        demo: () => [],
        remote: async () => {
          throw new ApiError('NOT_FOUND', 'Gone');
        },
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });

    expect(removeValue).toHaveBeenCalledWith('cow:c-1');
  });

  it('does not hide invalid backend responses behind cached data', async () => {
    const resource = loadResource();
    const ApiError = currentApiError();
    isNetworkAvailable.mockResolvedValue(true);
    readValue.mockResolvedValue(cachedEntry);

    await expect(
      resource.resolveResource({
        key: 'cows',
        demo: () => [],
        remote: async () => {
          throw new ApiError('INVALID_RESPONSE', 'Unexpected shape');
        },
      })
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });

    expect(removeValue).not.toHaveBeenCalled();
  });
});
