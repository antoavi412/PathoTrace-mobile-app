import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchAlerts, markAlertRead, markAllAlertsRead } from '@/services/alert-service';
import type { HealthAlert, Resource } from '@/types';

export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: fetchAlerts,
  });
}

export function useUnreadAlertCount(): number {
  const query = useAlerts();
  return query.data?.data.filter((alert) => !alert.read).length ?? 0;
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markAlertRead(id),
    onMutate: async (id) => {
      const previous = queryClient.getQueryData<Resource<HealthAlert[]>>(['alerts']);
      if (previous) {
        queryClient.setQueryData<Resource<HealthAlert[]>>(['alerts'], {
          ...previous,
          data: previous.data.map((alert) => (alert.id === id ? { ...alert, read: true } : alert)),
        });
      }
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['alerts'], context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['alerts'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useMarkAllAlertsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => markAllAlertsRead(ids),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['alerts'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
