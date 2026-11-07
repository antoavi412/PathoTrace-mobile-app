import { useQuery } from '@tanstack/react-query';

import { fetchDashboard } from '@/services/dashboard-service';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
  });
}
