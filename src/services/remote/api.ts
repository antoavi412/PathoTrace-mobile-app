import { API_ROUTES } from '@/constants/config';
import { ApiError, type Assessment, type AssessmentInput, type Cow, type HealthAlert, type HealthRecord, type HerdQuery, type Paginated, type User, type VeterinaryObservation } from '@/types';
import { apiRequest, buildPath, requireRoute } from '@/services/api-client';
import {
  parseAlert,
  parseAssessment,
  parseAuthSession,
  parseCow,
  parseHealthRecord,
  parseList,
  parseObservation,
  parsePaginated,
  parseUser,
  unwrapPayload,
} from './parsers';

export async function remoteLogin(
  identifier: string,
  password: string
): Promise<{ token: string; user: User }> {
  const path = requireRoute(API_ROUTES.login, 'Login');
  const payload = await apiRequest<unknown>(path, {
    method: 'POST',
    body: { identifier, password },
  });
  return parseAuthSession(payload);
}

export async function remoteLogout(): Promise<void> {
  if (!API_ROUTES.logout) return;
  await apiRequest(API_ROUTES.logout, { method: 'POST' });
}

export async function remoteForgotPassword(identifier: string): Promise<void> {
  const path = requireRoute(API_ROUTES.forgotPassword, 'Password recovery');
  await apiRequest(path, { method: 'POST', body: { identifier } });
}

export async function remoteCurrentUser(): Promise<User> {
  if (!API_ROUTES.login) {
    throw new ApiError('BACKEND_NOT_CONFIGURED', 'User profile endpoint is not configured.');
  }
  const path = buildPath(API_ROUTES.login.replace(/\/login\/?$/, ''), 'me');
  return parseUser(await apiRequest<unknown>(path));
}

export async function remoteHerd(query: HerdQuery): Promise<Paginated<Cow>> {
  const base = requireRoute(API_ROUTES.cattle, 'Cattle list');
  const parameters = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.query?.trim()) parameters.set('q', query.query.trim());
  if (query.risk && query.risk !== 'all') parameters.set('risk', query.risk);

  const payload = await apiRequest<unknown>(`${base}?${parameters.toString()}`);
  return parsePaginated(payload, parseCow, query.page, query.pageSize);
}

export async function remoteAllCows(): Promise<Cow[]> {
  const base = requireRoute(API_ROUTES.cattle, 'Cattle list');
  const collected: Cow[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 10) {
    const parameters = new URLSearchParams({ page: String(page), pageSize: '100' });
    const payload = await apiRequest<unknown>(`${base}?${parameters.toString()}`);
    const parsed = parsePaginated(payload, parseCow, page, 100);
    collected.push(...parsed.items);
    hasMore = parsed.hasMore;
    page += 1;
  }

  return collected;
}

export async function remoteCow(id: string): Promise<Cow> {
  const base = requireRoute(API_ROUTES.cattle, 'Cattle record');
  return parseCow(await apiRequest<unknown>(buildPath(base, id)));
}

export async function remoteAssessments(cowId?: string): Promise<Assessment[]> {
  const base = requireRoute(API_ROUTES.assessments, 'Assessments');
  const suffix = cowId ? `?cowId=${encodeURIComponent(cowId)}` : '';
  const payload = await apiRequest<unknown>(`${base}${suffix}`);
  return parseList(payload, parseAssessment);
}

export async function remoteAssessment(id: string): Promise<Assessment> {
  const base = requireRoute(API_ROUTES.assessments, 'Assessment');
  return parseAssessment(await apiRequest<unknown>(buildPath(base, id)));
}

export async function remoteCreateAssessment(input: AssessmentInput): Promise<Assessment> {
  const base = requireRoute(API_ROUTES.assessments, 'Assessment submission');
  const payload = await apiRequest<unknown>(base, { method: 'POST', body: input });
  return parseAssessment(unwrapPayload(payload));
}

export async function remoteAlerts(): Promise<HealthAlert[]> {
  const base = requireRoute(API_ROUTES.alerts, 'Alerts');
  return parseList(await apiRequest<unknown>(base), parseAlert);
}

export async function remoteMarkAlertRead(id: string): Promise<void> {
  const base = requireRoute(API_ROUTES.alerts, 'Alert update');
  await apiRequest(buildPath(base, id), { method: 'PATCH', body: { read: true } });
}

export async function remoteHealthRecords(cowId: string): Promise<HealthRecord[]> {
  const base = requireRoute(API_ROUTES.healthRecords, 'Health records');
  const payload = await apiRequest<unknown>(`${base}?cowId=${encodeURIComponent(cowId)}`);
  return parseList(payload, parseHealthRecord);
}

export async function remoteObservations(cowId: string): Promise<VeterinaryObservation[]> {
  const base = requireRoute(API_ROUTES.observations, 'Veterinary observations');
  const payload = await apiRequest<unknown>(`${base}?cowId=${encodeURIComponent(cowId)}`);
  return parseList(payload, parseObservation);
}

export async function remoteCreateObservation(
  cowId: string,
  note: string
): Promise<VeterinaryObservation> {
  const base = requireRoute(API_ROUTES.observations, 'Observation submission');
  const payload = await apiRequest<unknown>(base, {
    method: 'POST',
    body: { cowId, note },
  });
  return parseObservation(unwrapPayload(payload));
}
