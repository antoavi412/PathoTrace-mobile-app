import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchAssessment, fetchAssessments, submitAssessment } from '@/services/assessment-service';
import type { AssessmentInput } from '@/types';

export function useAssessments(cowId?: string) {
  return useQuery({
    queryKey: ['assessments', cowId ?? 'all'],
    queryFn: () => fetchAssessments(cowId),
  });
}

export function useAssessment(id: string | undefined) {
  return useQuery({
    queryKey: ['assessment', id],
    queryFn: () => fetchAssessment(id as string),
    enabled: Boolean(id),
  });
}

export function useSubmitAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AssessmentInput) => submitAssessment(input),
    onSuccess: (assessment) => {
      queryClient.setQueryData(['assessment', assessment.id], {
        data: assessment,
        source: 'network',
        fetchedAt: new Date().toISOString(),
        stale: false,
      });
      void queryClient.invalidateQueries({ queryKey: ['assessments'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['cow'] });
      void queryClient.invalidateQueries({ queryKey: ['herd'] });
    },
  });
}
