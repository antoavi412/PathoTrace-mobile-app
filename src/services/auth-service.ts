import { IS_DEMO_MODE } from '@/constants/config';
import { ApiError, type AuthSession, type User } from '@/types';
import { demoLogin } from './demo/demo-auth';
import { remoteForgotPassword, remoteLogin, remoteLogout } from './remote/api';

export async function login(identifier: string, password: string): Promise<AuthSession> {
  if (IS_DEMO_MODE) {
    return demoLogin(identifier, password);
  }
  return remoteLogin(identifier, password);
}

export async function logout(): Promise<void> {
  if (IS_DEMO_MODE) return;
  try {
    await remoteLogout();
  } catch {
    return;
  }
}

export async function requestPasswordReset(identifier: string): Promise<void> {
  if (IS_DEMO_MODE) {
    throw new ApiError(
      'BACKEND_NOT_CONFIGURED',
      'Password recovery needs a connected PathoTrace backend. This build does not send reset emails.'
    );
  }
  await remoteForgotPassword(identifier);
}

export function isDemoSession(session: AuthSession): boolean {
  return IS_DEMO_MODE || session.token.startsWith('demo-token-');
}

export function userDisplayRole(user: User): string {
  if (user.role === 'veterinarian') return 'Veterinarian';
  if (user.role === 'cooperative') return 'Cooperative';
  return 'Farmer';
}
