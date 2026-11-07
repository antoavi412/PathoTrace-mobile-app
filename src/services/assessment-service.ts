import { IS_DEMO_MODE } from '@/constants/config';
import { writeValue } from '@/database';
import { ApiError, type Assessment, type AssessmentInput, type Resource } from '@/types';
import {
  createDemoAssessment,
  getDemoAssessment,
  getDemoAssessments,
} from './demo/demo-data';
import { remoteAssessment, remoteAssessments, remoteCreateAssessment } from './remote/api';
import { resolveResource, requireOnline } from './resource';

export function fetchAssessments(cowId?: string): Promise<Resource<Assessment[]>> {
  return resolveResource({
    key: cowId ? `assessments:cow:${cowId}` : 'assessments:all',
    demo: () => getDemoAssessments(cowId),
    remote: () => remoteAssessments(cowId),
  });
}

export function fetchAssessment(id: string): Promise<Resource<Assessment>> {
  return resolveResource({
    key: `assessment:${id}`,
    demo: () => {
      const assessment = getDemoAssessment(id);
      if (!assessment) throw new ApiError('NOT_FOUND', 'Assessment not found.');
      return assessment;
    },
    remote: () => remoteAssessment(id),
  });
}

export async function submitAssessment(input: AssessmentInput): Promise<Assessment> {
  if (IS_DEMO_MODE) {
    return createDemoAssessment(input.cowId, input);
  }

  await requireOnline();
  const assessment = await remoteCreateAssessment(input);
  await writeValue(`assessment:${assessment.id}`, assessment);
  return assessment;
}
