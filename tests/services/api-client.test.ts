type ClientModule = typeof import('@/services/api-client');

const originalBaseUrl = process.env.EXPO_PUBLIC_API_URL;
const originalFetch = globalThis.fetch;
const fetchMock = jest.fn();

function loadClient(baseUrl = 'https://api.test'): ClientModule {
  process.env.EXPO_PUBLIC_API_URL = baseUrl;
  jest.resetModules();
  return jest.requireActual<ClientModule>('@/services/api-client');
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'content-type' ? 'application/json' : null,
    },
    json: async () => body,
  } as unknown as Response;
}

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalBaseUrl === undefined) {
    delete process.env.EXPO_PUBLIC_API_URL;
  } else {
    process.env.EXPO_PUBLIC_API_URL = originalBaseUrl;
  }
  jest.resetModules();
});

describe('apiRequest', () => {
  it('refuses to send requests when no backend is configured', async () => {
    const client = loadClient('');

    await expect(client.apiRequest('/cattle')).rejects.toMatchObject({
      code: 'BACKEND_NOT_CONFIGURED',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the bearer token and returns parsed JSON', async () => {
    const client = loadClient();
    client.setApiToken('token-1');
    fetchMock.mockResolvedValue(jsonResponse(200, { data: [{ id: 'cow-1' }] }));

    const result = await client.apiRequest('/cattle?page=1');

    expect(result).toEqual({ data: [{ id: 'cow-1' }] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(url).toBe('https://api.test/cattle?page=1');
    expect(init.headers.Authorization).toBe('Bearer token-1');
    expect(init.headers.Accept).toBe('application/json');
  });

  it('notifies the session handler on an authenticated 401', async () => {
    const client = loadClient();
    const onUnauthorized = jest.fn();
    client.setUnauthorizedHandler(onUnauthorized);
    client.setApiToken('expired-token');
    fetchMock.mockResolvedValue(jsonResponse(401, { message: 'Session expired' }));

    await expect(client.apiRequest('/cattle')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
      message: 'Session expired',
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('does not expire a session for an unauthenticated 401', async () => {
    const client = loadClient();
    const onUnauthorized = jest.fn();
    client.setUnauthorizedHandler(onUnauthorized);
    client.setApiToken(null);
    fetchMock.mockResolvedValue(jsonResponse(401, { message: 'Invalid credentials' }));

    await expect(client.apiRequest('/auth/login')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('maps validation and permission statuses', async () => {
    const client = loadClient();
    fetchMock.mockResolvedValueOnce(jsonResponse(422, { detail: 'Invalid assessment input' }));
    fetchMock.mockResolvedValueOnce(jsonResponse(403, { error: 'Forbidden' }));

    await expect(client.apiRequest('/assessments')).rejects.toMatchObject({
      code: 'VALIDATION',
      message: 'Invalid assessment input',
    });
    await expect(client.apiRequest('/cattle')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'Forbidden',
    });
  });

  it('maps transport failures to a network error', async () => {
    const client = loadClient();
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));

    await expect(client.apiRequest('/cattle')).rejects.toMatchObject({
      code: 'NETWORK_UNAVAILABLE',
    });
  });

  it('normalizes route and path helpers', () => {
    const client = loadClient();

    expect(client.requireRoute('cattle', 'Cattle')).toBe('/cattle');
    expect(client.requireRoute('/cattle', 'Cattle')).toBe('/cattle');
    expect(() => client.requireRoute('', 'Cattle')).toThrow('Cattle endpoint is not configured');

    expect(client.buildPath('/cattle/')).toBe('/cattle');
    expect(client.buildPath('/cattle/', '/cow-1')).toBe('/cattle/cow-1');
  });
});
