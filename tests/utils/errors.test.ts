import { ApiError } from '@/types';
import { getErrorCode, getErrorMessage, isAuthError } from '@/utils/errors';

describe('error utilities', () => {
  it('uses an explicit API error message when present', () => {
    const error = new ApiError('SERVER_ERROR', 'The herd service is unavailable.');
    expect(getErrorMessage(error)).toBe('The herd service is unavailable.');
    expect(getErrorCode(error)).toBe('SERVER_ERROR');
  });

  it('falls back to the code-specific message for empty API errors', () => {
    const error = new ApiError('UNAUTHORIZED', '');
    expect(getErrorMessage(error)).toBe('Your session has expired. Please sign in again.');
  });

  it('passes through ordinary error messages', () => {
    expect(getErrorMessage(new Error('Network request failed'))).toBe('Network request failed');
    expect(getErrorCode(new Error('boom'))).toBe('UNKNOWN');
  });

  it('uses a safe generic message for unknown values', () => {
    expect(getErrorMessage(undefined)).toBe('Something went wrong. Please try again.');
    expect(getErrorMessage({ status: 500 })).toBe('Something went wrong. Please try again.');
  });

  it('identifies authentication and permission errors', () => {
    expect(isAuthError(new ApiError('UNAUTHORIZED', 'Expired'))).toBe(true);
    expect(isAuthError(new ApiError('FORBIDDEN', 'Not allowed'))).toBe(true);
    expect(isAuthError(new ApiError('SERVER_ERROR', 'Failed'))).toBe(false);
    expect(isAuthError(new Error('Failed'))).toBe(false);
  });
});
