import { ApiError, type ApiErrorCode } from '@/types';

const errorMessages: Record<ApiErrorCode, string> = {
  NETWORK_UNAVAILABLE: 'No internet connection. Check your network and try again.',
  TIMEOUT: 'The request took too long. Please try again.',
  UNAUTHORIZED: 'Your session has expired. Please sign in again.',
  FORBIDDEN: 'You do not have permission to access this information.',
  NOT_FOUND: 'The requested record could not be found.',
  VALIDATION: 'Some details are invalid. Review the form and try again.',
  RATE_LIMITED: 'Too many requests. Wait a moment and try again.',
  SERVER_ERROR: 'The server could not complete the request. Try again shortly.',
  INVALID_RESPONSE: 'The server returned an unexpected response.',
  BACKEND_NOT_CONFIGURED: 'The PathoTrace backend is not configured in this build.',
  OFFLINE: 'A network connection is required for this action.',
  UNKNOWN: 'Something went wrong. Please try again.',
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message || errorMessages[error.code];
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return errorMessages.UNKNOWN;
}

export function getErrorCode(error: unknown): ApiErrorCode {
  return error instanceof ApiError ? error.code : 'UNKNOWN';
}

export function isAuthError(error: unknown): boolean {
  const code = getErrorCode(error);
  return code === 'UNAUTHORIZED' || code === 'FORBIDDEN';
}
