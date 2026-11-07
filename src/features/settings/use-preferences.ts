import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
} from '@/services/preferences-service';
import type { NotificationPreferences, UserPreferences } from '@/types';

export function usePreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(Boolean(user));

  useEffect(() => {
    let mounted = true;
    if (!user) {
      return;
    }
    void loadPreferences(user.id).then((loaded) => {
      if (mounted) {
        setPreferences(loaded);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [user]);

  const updateNotifications = useCallback(
    async (patch: Partial<NotificationPreferences>) => {
      if (!user) return;
      const next: UserPreferences = {
        ...preferences,
        notifications: { ...preferences.notifications, ...patch },
      };
      setPreferences(next);
      await savePreferences(user.id, next);
    },
    [preferences, user]
  );

  return { preferences, loading, updateNotifications };
}
