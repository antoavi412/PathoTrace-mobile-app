import { ApiError, type AuthSession } from '@/types';
import { DEMO_FARMER, DEMO_VETERINARIAN } from './demo-data';

const DEMO_PASSWORD = 'demo1234';

export async function demoLogin(identifier: string, password: string): Promise<AuthSession> {
  const normalized = identifier.trim().toLowerCase();

  if (password !== DEMO_PASSWORD) {
    throw new ApiError('UNAUTHORIZED', 'Invalid email or password. Use a demo account below.');
  }

  const user =
    normalized === DEMO_FARMER.email
      ? DEMO_FARMER
      : normalized === DEMO_VETERINARIAN.email
        ? DEMO_VETERINARIAN
        : null;

  if (!user) {
    throw new ApiError(
      'UNAUTHORIZED',
      'This demonstration build only accepts the demo farmer or demo veterinarian accounts.'
    );
  }

  return {
    token: `demo-token-${user.id}-${Date.now()}`,
    user: { ...user },
  };
}
