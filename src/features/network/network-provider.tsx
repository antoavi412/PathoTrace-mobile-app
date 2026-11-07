import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { isNetworkAvailable, subscribeToNetworkChanges } from '@/services/network';

interface NetworkContextValue {
  isOnline: boolean;
  isChecking: boolean;
  lastCheckedAt: string;
  recheck: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(true);
  const [lastCheckedAt, setLastCheckedAt] = useState(new Date().toISOString());

  const recheck = useCallback(async () => {
    setIsChecking(true);
    const online = await isNetworkAvailable();
    setIsOnline(online);
    setLastCheckedAt(new Date().toISOString());
    setIsChecking(false);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToNetworkChanges((online) => {
      setIsOnline(online);
      setLastCheckedAt(new Date().toISOString());
    });

    const initialCheck = setTimeout(() => {
      void recheck();
    }, 0);

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void recheck();
    });

    return () => {
      clearTimeout(initialCheck);
      unsubscribe();
      appStateSubscription.remove();
    };
  }, [recheck]);

  const value = useMemo(
    () => ({ isOnline, isChecking, lastCheckedAt, recheck }),
    [isOnline, isChecking, lastCheckedAt, recheck]
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork(): NetworkContextValue {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within NetworkProvider');
  }
  return context;
}
