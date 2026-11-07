import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { flushSyncQueue } from '@/services/sync-service';
import { useNetwork } from './network-provider';

export function SyncManager() {
  const { user } = useAuth();
  const { isOnline } = useNetwork();
  const queryClient = useQueryClient();
  const userId = user?.id;

  useEffect(() => {
    if (!userId || !isOnline) return;

    let active = true;
    void flushSyncQueue().then((processed) => {
      if (active && processed > 0) {
        void queryClient.invalidateQueries({ queryKey: ['observations'] });
        void queryClient.invalidateQueries({ queryKey: ['alerts'] });
        void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }
    });

    return () => {
      active = false;
    };
  }, [userId, isOnline, queryClient]);

  return null;
}
