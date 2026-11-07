import { useCallback, useEffect, useMemo, useState } from 'react';

import { IS_DEMO_MODE } from '@/constants/config';
import { clearScopedValues, setCacheScope } from '@/database';
import { setApiToken, setUnauthorizedHandler } from '@/services/api-client';
import { login as loginService, logout as logoutService } from '@/services/auth-service';
import { queryClient } from '@/services/query-client';
import {
  deleteSecureValue,
  readSecureValue,
  saveSecureValue,
  SESSION_STORAGE_KEY,
} from '@/services/secure-store';
import type { AuthSession, User } from '@/types';
import { AuthContext, type AuthStatus, type AuthContextValue } from './auth-context';

function isValidSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as AuthSession;
  return Boolean(
    session.token &&
      session.user &&
      session.user.id &&
      session.user.name &&
      session.user.email &&
      session.user.role
  );
}

async function persistSession(session: AuthSession): Promise<void> {
  await saveSecureValue(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      try {
        const stored = await readSecureValue(SESSION_STORAGE_KEY);
        if (!stored) {
          if (mounted) setStatus('unauthenticated');
          return;
        }

        const parsed: unknown = JSON.parse(stored);
        if (!isValidSession(parsed)) {
          await deleteSecureValue(SESSION_STORAGE_KEY);
          if (mounted) setStatus('unauthenticated');
          return;
        }

        setApiToken(parsed.token);
        setCacheScope(parsed.user.id);
        if (mounted) {
          setSession(parsed);
          setStatus('authenticated');
        }
      } catch {
        if (mounted) setStatus('unauthenticated');
      }
    }

    void hydrate();
    return () => {
      mounted = false;
    };
  }, []);

  const clearLocalSession = useCallback(async () => {
    await deleteSecureValue(SESSION_STORAGE_KEY);
    await clearScopedValues();
    setApiToken(null);
    setCacheScope(null);
    queryClient.clear();
    setSession(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSessionExpired(true);
      void clearLocalSession().finally(() => setStatus('unauthenticated'));
    });
    return () => setUnauthorizedHandler(null);
  }, [clearLocalSession]);

  const login = useCallback(async (identifier: string, password: string) => {
    const next = await loginService(identifier, password);
    setApiToken(next.token);
    setCacheScope(next.user.id);
    await persistSession(next);
    setSessionExpired(false);
    setSession(next);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    await logoutService();
    await clearLocalSession();
    setSessionExpired(false);
    setStatus('unauthenticated');
  }, [clearLocalSession]);

  const updateProfile = useCallback(
    async (patch: Partial<Pick<User, 'name' | 'phone'>>) => {
      if (!session) return;
      const next: AuthSession = {
        ...session,
        user: { ...session.user, ...patch },
      };
      await persistSession(next);
      setSession(next);
    },
    [session]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user: session?.user ?? null,
      token: session?.token ?? null,
      isDemo: IS_DEMO_MODE || Boolean(session?.token?.startsWith('demo-token-')),
      sessionExpired,
      login,
      logout,
      updateProfile,
    }),
    [status, session, sessionExpired, login, logout, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
