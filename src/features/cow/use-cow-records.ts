import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-context';
import { addObservation, fetchHealthRecords, fetchObservations } from '@/services/cow-service';
import type { User } from '@/types';

export function useHealthRecords(cowId: string | undefined) {
  return useQuery({
    queryKey: ['health-records', cowId],
    queryFn: () => fetchHealthRecords(cowId as string),
    enabled: Boolean(cowId),
  });
}

export function useObservations(cowId: string | undefined) {
  return useQuery({
    queryKey: ['observations', cowId],
    queryFn: () => fetchObservations(cowId as string),
    enabled: Boolean(cowId),
  });
}

export function useAddObservation(cowId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (note: string) => {
      if (!cowId || !user) throw new Error('Missing cow or user.');
      return addObservation(cowId, note, user as User);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['observations', cowId] });
    },
  });
}
