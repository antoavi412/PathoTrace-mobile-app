import type {
  Assessment,
  AssessmentInput,
  Cow,
  HealthAlert,
  HealthRecord,
  Paginated,
  RiskCategory,
  User,
  UserRole,
  VeterinaryObservation,
} from '@/types';
import { ApiError } from '@/types';
import { isRiskCategory, normalizeRiskStatus } from '@/utils/risk';

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function firstString(record: JsonRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = optionalString(record[key]);
    if (value) return value;
  }
  return undefined;
}

function optionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function firstNumber(record: JsonRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = optionalNumber(record[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function invalidResponse(message: string): never {
  throw new ApiError('INVALID_RESPONSE', message);
}

export function unwrapPayload(value: unknown): unknown {
  const record = asRecord(value);
  if (record && record.data !== undefined) return record.data;
  return value;
}

export function parseUser(value: unknown): User {
  const record = asRecord(unwrapPayload(value));
  if (!record) invalidResponse('User response is missing required fields.');

  const id = firstString(record, ['id', 'userId', 'user_id']);
  const name = firstString(record, ['name', 'fullName', 'full_name', 'displayName']);
  const email = firstString(record, ['email', 'username']);
  const rawRole = firstString(record, ['role', 'userRole', 'user_role']) ?? 'farmer';

  if (!id || !name || !email) {
    invalidResponse('User response is missing id, name, or email.');
  }

  const role: UserRole =
    rawRole === 'veterinarian' || rawRole === 'vet'
      ? 'veterinarian'
      : rawRole === 'cooperative'
        ? 'cooperative'
        : 'farmer';

  const assigned = record.assignedCowIds ?? record.assigned_cow_ids;

  return {
    id,
    name,
    email,
    role,
    farmId: firstString(record, ['farmId', 'farm_id']),
    farmName: firstString(record, ['farmName', 'farm_name']),
    phone: firstString(record, ['phone', 'phoneNumber', 'phone_number']),
    assignedCowIds: Array.isArray(assigned)
      ? assigned.filter((item): item is string => typeof item === 'string')
      : undefined,
  };
}

export function parseCow(value: unknown): Cow {
  const record = asRecord(value);
  if (!record) invalidResponse('Cattle record is missing required fields.');

  const id = firstString(record, ['id', 'cowId', 'cow_id']);
  const tagId = firstString(record, ['tagId', 'tag_id', 'earTag', 'ear_tag', 'identifier']) ?? id;
  const breed = firstString(record, ['breed', 'cattleBreed']) ?? 'Not recorded';

  if (!id || !tagId) {
    invalidResponse('Cattle record is missing an id or tag.');
  }

  return {
    id,
    tagId,
    name: firstString(record, ['name', 'cowName', 'cow_name']),
    breed,
    ageMonths: firstNumber(record, ['ageMonths', 'age_months', 'ageInMonths']),
    lactationNumber: firstNumber(record, ['lactationNumber', 'lactation_number', 'lactation']),
    lactationStage: firstString(record, ['lactationStage', 'lactation_stage']),
    daysInMilk: firstNumber(record, ['daysInMilk', 'days_in_milk', 'dim']),
    farmId: firstString(record, ['farmId', 'farm_id']) ?? '',
    farmName: firstString(record, ['farmName', 'farm_name']),
    riskStatus: normalizeRiskStatus(
      firstString(record, ['riskStatus', 'risk_status', 'currentRisk', 'current_risk'])
    ),
    lastAssessmentAt: firstString(record, [
      'lastAssessmentAt',
      'last_assessment_at',
      'lastAssessmentDate',
    ]),
    lastAssessmentId: firstString(record, ['lastAssessmentId', 'last_assessment_id']),
    notes: firstString(record, ['notes', 'healthNotes']),
  };
}

function parseAssessmentInput(value: unknown, cowId: string): AssessmentInput {
  const record = asRecord(value) ?? {};
  return {
    cowId,
    milkYieldLiters: firstNumber(record, ['milkYieldLiters', 'milk_yield_liters', 'milkYield']) ?? 0,
    somaticCellCount:
      firstNumber(record, ['somaticCellCount', 'somatic_cell_count', 'scc']) ?? 0,
    milkTemperatureC:
      firstNumber(record, ['milkTemperatureC', 'milk_temperature_c', 'temperature']) ?? 0,
    daysInMilk: firstNumber(record, ['daysInMilk', 'days_in_milk', 'dim']) ?? 0,
    lactationNumber: firstNumber(record, ['lactationNumber', 'lactation_number', 'lactation']) ?? 1,
  };
}

export function parseAssessment(value: unknown): Assessment {
  const record = asRecord(value);
  if (!record) invalidResponse('Assessment record is missing required fields.');

  const id = firstString(record, ['id', 'assessmentId', 'assessment_id']);
  const cow = asRecord(record.cow);
  const cowId =
    firstString(record, ['cowId', 'cow_id']) ?? (cow ? firstString(cow, ['id']) : undefined);
  const cowTagId =
    firstString(record, ['cowTagId', 'cow_tag_id', 'tagId']) ??
    (cow ? firstString(cow, ['tagId', 'tag_id']) : undefined);
  const rawCategory = firstString(record, ['category', 'riskCategory', 'risk_category', 'risk']);
  const createdAt = firstString(record, ['createdAt', 'created_at', 'assessedAt']);

  if (!id || !cowId || !cowTagId || !createdAt || !isRiskCategory(rawCategory)) {
    invalidResponse('Assessment response is missing id, cow, category, or timestamp.');
  }

  const probability = firstNumber(record, ['probability', 'riskProbability', 'risk_probability']);

  return {
    id,
    cowId,
    cowTagId,
    cowName: firstString(record, ['cowName', 'cow_name']) ?? (cow ? optionalString(cow.name) : undefined),
    category: rawCategory as RiskCategory,
    createdAt,
    input: parseAssessmentInput(record.input ?? record.inputs, cowId),
    isDemonstration: false,
    probability,
    modelVersion: firstString(record, ['modelVersion', 'model_version']),
    note: firstString(record, ['note', 'notes']),
  };
}

export function parseAlert(value: unknown): HealthAlert {
  const record = asRecord(value);
  if (!record) invalidResponse('Alert record is missing required fields.');

  const id = firstString(record, ['id', 'alertId', 'alert_id']);
  const cowId = firstString(record, ['cowId', 'cow_id']);
  const cowTagId = firstString(record, ['cowTagId', 'cow_tag_id', 'tagId']);
  const rawCategory = firstString(record, ['category', 'riskCategory', 'risk_category', 'risk']);
  const createdAt = firstString(record, ['createdAt', 'created_at', 'timestamp']);

  if (!id || !cowId || !cowTagId || !createdAt || !isRiskCategory(rawCategory)) {
    invalidResponse('Alert response is missing id, cow, category, or timestamp.');
  }

  const category = rawCategory as RiskCategory;
  return {
    id,
    cowId,
    cowTagId,
    cowName: firstString(record, ['cowName', 'cow_name']),
    category,
    severity: category,
    title: firstString(record, ['title']) ?? `${category} risk alert`,
    message: firstString(record, ['message', 'description']) ?? '',
    createdAt,
    read: Boolean(record.read ?? record.isRead ?? record.is_read),
    assessmentId: firstString(record, ['assessmentId', 'assessment_id']),
  };
}

export function parseHealthRecord(value: unknown): HealthRecord {
  const record = asRecord(value);
  if (!record) invalidResponse('Health record is missing required fields.');

  const id = firstString(record, ['id', 'recordId', 'record_id']);
  const cowId = firstString(record, ['cowId', 'cow_id']);
  const title = firstString(record, ['title', 'name']);
  const recordedAt = firstString(record, ['recordedAt', 'recorded_at', 'date', 'createdAt']);
  const rawKind = firstString(record, ['kind', 'type']) ?? 'checkup';

  if (!id || !cowId || !title || !recordedAt) {
    invalidResponse('Health record response is missing id, cow, title, or date.');
  }

  const kind: HealthRecord['kind'] =
    rawKind === 'illness' ||
    rawKind === 'treatment' ||
    rawKind === 'observation' ||
    rawKind === 'vaccination'
      ? rawKind
      : 'checkup';

  return {
    id,
    cowId,
    kind,
    title,
    description: firstString(record, ['description', 'details']),
    recordedAt,
    recordedBy: firstString(record, ['recordedBy', 'recorded_by', 'veterinarian']),
    isDemonstration: false,
  };
}

export function parseObservation(value: unknown): VeterinaryObservation {
  const record = asRecord(value);
  if (!record) invalidResponse('Observation response is missing required fields.');

  const id = firstString(record, ['id', 'observationId', 'observation_id']);
  const cowId = firstString(record, ['cowId', 'cow_id']);
  const note = firstString(record, ['note', 'observation', 'text']);
  const createdAt = firstString(record, ['createdAt', 'created_at', 'date']);
  const veterinarianName =
    firstString(record, ['veterinarianName', 'veterinarian_name', 'authorName']) ?? 'Veterinarian';

  if (!id || !cowId || !note || !createdAt) {
    invalidResponse('Observation response is missing id, cow, note, or timestamp.');
  }

  return {
    id,
    cowId,
    veterinarianId: firstString(record, ['veterinarianId', 'veterinarian_id', 'authorId']) ?? '',
    veterinarianName,
    note,
    createdAt,
    syncStatus: 'synced',
    isDemonstration: false,
  };
}

export function parseList<T>(value: unknown, parser: (item: unknown) => T): T[] {
  const unwrapped = unwrapPayload(value);
  if (Array.isArray(unwrapped)) return unwrapped.map(parser);
  const record = asRecord(unwrapped);
  if (record) {
    const items = record.items ?? record.results ?? record.cattle ?? record.data;
    if (Array.isArray(items)) return items.map(parser);
  }
  invalidResponse('The server did not return a list.');
}

export function parsePaginated<T>(
  value: unknown,
  parser: (item: unknown) => T,
  page: number,
  pageSize: number
): Paginated<T> {
  const unwrapped = unwrapPayload(value);
  if (Array.isArray(unwrapped)) {
    return {
      items: unwrapped.map(parser),
      page,
      pageSize,
      total: unwrapped.length,
      hasMore: false,
    };
  }

  const record = asRecord(unwrapped);
  if (!record) invalidResponse('The server did not return a paginated list.');

  const rawItems = record.items ?? record.results ?? record.cattle ?? record.data;
  if (!Array.isArray(rawItems)) invalidResponse('The paginated response is missing items.');

  const items = rawItems.map(parser);
  const total = firstNumber(record, ['total', 'count', 'totalCount', 'total_count']) ?? items.length;
  const currentPage = firstNumber(record, ['page', 'currentPage', 'current_page']) ?? page;
  const resolvedPageSize =
    firstNumber(record, ['pageSize', 'page_size', 'limit']) ?? Math.max(pageSize, items.length);
  const explicitHasMore = record.hasMore ?? record.has_more;
  const hasMore =
    typeof explicitHasMore === 'boolean'
      ? explicitHasMore
      : currentPage * resolvedPageSize < total;

  return { items, page: currentPage, pageSize: resolvedPageSize, total, hasMore };
}

export function parseAuthSession(value: unknown): { token: string; user: User } {
  const record = asRecord(unwrapPayload(value));
  if (!record) invalidResponse('Authentication response is invalid.');
  const token = firstString(record, ['token', 'accessToken', 'access_token']);
  const user = record.user ?? record.profile;
  if (!token || !user) invalidResponse('Authentication response is missing a token or user.');
  return { token, user: parseUser(user) };
}
