export type UserRole = 'farmer' | 'veterinarian' | 'cooperative';

export type RiskCategory = 'low' | 'medium' | 'high';
export type CowRiskStatus = RiskCategory | 'unknown';

export type DataSource = 'network' | 'cache' | 'demo';

export interface Resource<T> {
  data: T;
  source: DataSource;
  fetchedAt: string;
  stale: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  farmId?: string;
  farmName?: string;
  phone?: string;
  assignedCowIds?: string[];
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface Cow {
  id: string;
  tagId: string;
  name?: string;
  breed: string;
  ageMonths?: number;
  lactationNumber?: number;
  lactationStage?: string;
  daysInMilk?: number;
  farmId: string;
  farmName?: string;
  riskStatus: CowRiskStatus;
  lastAssessmentAt?: string;
  lastAssessmentId?: string;
  notes?: string;
}

export interface AssessmentInput {
  cowId: string;
  milkYieldLiters: number;
  somaticCellCount: number;
  milkTemperatureC: number;
  daysInMilk: number;
  lactationNumber: number;
}

export interface Assessment {
  id: string;
  cowId: string;
  cowTagId: string;
  cowName?: string;
  category: RiskCategory;
  createdAt: string;
  input: AssessmentInput;
  isDemonstration: boolean;
  probability?: number;
  modelVersion?: string;
  note?: string;
}

export type AlertCategory = RiskCategory;
export type AlertSeverity = 'high' | 'medium' | 'low';

export interface HealthAlert {
  id: string;
  cowId: string;
  cowTagId: string;
  cowName?: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  assessmentId?: string;
}

export interface HealthRecord {
  id: string;
  cowId: string;
  kind: 'checkup' | 'illness' | 'treatment' | 'observation' | 'vaccination';
  title: string;
  description?: string;
  recordedAt: string;
  recordedBy?: string;
  isDemonstration: boolean;
}

export interface VeterinaryObservation {
  id: string;
  cowId: string;
  veterinarianId: string;
  veterinarianName: string;
  note: string;
  createdAt: string;
  syncStatus: 'synced' | 'pending';
  isDemonstration: boolean;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface DashboardSummary {
  totalCattle: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  unknownRisk: number;
  recentAssessments: Assessment[];
  recentAlerts: HealthAlert[];
  lastUpdated: string;
}

export interface HerdQuery {
  page: number;
  pageSize: number;
  query?: string;
  risk?: CowRiskStatus | 'all';
}

export interface NotificationPreferences {
  high: boolean;
  medium: boolean;
  low: boolean;
}

export interface UserPreferences {
  language: 'en';
  notifications: NotificationPreferences;
}

export type ApiErrorCode =
  | 'NETWORK_UNAVAILABLE'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'INVALID_RESPONSE'
  | 'BACKEND_NOT_CONFIGURED'
  | 'OFFLINE'
  | 'UNKNOWN';

export class ApiError extends Error {
  code: ApiErrorCode;
  status?: number;
  details?: unknown;

  constructor(code: ApiErrorCode, message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
