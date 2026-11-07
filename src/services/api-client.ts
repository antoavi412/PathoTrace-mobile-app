import { API_BASE_URL, API_ENABLED, REQUEST_TIMEOUT_MS } from '@/constants/config';
import { ApiError } from '@/types';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  token?: string | null;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

interface ErrorPayload {
  message?: string;
  error?: string;
  detail?: string;
  code?: string;
}

let authToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setApiToken(token: string | null): void {
  authToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export function getApiToken(): string | null {
  return authToken;
}

function mapStatusToCode(status: number): ApiError['code'] {
  if (status === 400 || status === 422) return 'VALIDATION';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'SERVER_ERROR';
  return 'UNKNOWN';
}

function defaultStatusMessage(status: number): string {
  const code = mapStatusToCode(status);
  const messages: Record<ApiError['code'], string> = {
    VALIDATION: 'The server rejected the request. Check the details and try again.',
    UNAUTHORIZED: 'Your session is no longer valid. Sign in again.',
    FORBIDDEN: 'You do not have permission to perform this action.',
    NOT_FOUND: 'The requested record was not found.',
    RATE_LIMITED: 'Too many requests. Wait a moment and try again.',
    SERVER_ERROR: 'The server could not complete the request. Try again shortly.',
    NETWORK_UNAVAILABLE: 'The network is unavailable.',
    TIMEOUT: 'The request timed out.',
    INVALID_RESPONSE: 'The server response was not valid.',
    BACKEND_NOT_CONFIGURED: 'The backend is not configured.',
    OFFLINE: 'A network connection is required.',
    UNKNOWN: 'The request failed.',
  };
  return messages[code];
}

export function requireRoute(route: string, name: string): string {
  if (!API_ENABLED) {
    throw new ApiError(
      'BACKEND_NOT_CONFIGURED',
      `${name} requires a configured PathoTrace backend. This build is running in demonstration mode.`
    );
  }
  if (!route) {
    throw new ApiError(
      'BACKEND_NOT_CONFIGURED',
      `${name} endpoint is not configured. Set the corresponding EXPO_PUBLIC_* path.`
    );
  }
  return route.startsWith('/') ? route : `/${route}`;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_ENABLED) {
    throw new ApiError(
      'BACKEND_NOT_CONFIGURED',
      'The PathoTrace backend is not configured in this build.'
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.token ?? authToken ? { Authorization: `Bearer ${options.token ?? authToken}` } : {}),
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') ?? '';
    const hasJson = contentType.includes('application/json');
    const payload = hasJson ? await response.json().catch(() => null) : null;

    if (!response.ok) {
      if (response.status === 401 && authToken) {
        unauthorizedHandler?.();
      }
      const errorPayload = (payload ?? {}) as ErrorPayload;
      throw new ApiError(
        mapStatusToCode(response.status),
        errorPayload.message ?? errorPayload.error ?? errorPayload.detail ?? defaultStatusMessage(response.status),
        response.status,
        payload
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('TIMEOUT', 'The request timed out. Check your connection and try again.');
    }
    throw new ApiError('NETWORK_UNAVAILABLE', 'Could not reach the PathoTrace server.');
  } finally {
    clearTimeout(timeout);
  }
}

export function buildPath(base: string, suffix?: string): string {
  const normalized = base.replace(/\/+$/, '');
  if (!suffix) return normalized;
  const cleanSuffix = suffix.replace(/^\/+/, '');
  return `${normalized}/${cleanSuffix}`;
}
