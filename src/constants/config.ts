import Constants from 'expo-constants';

const rawBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim() ?? '';

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');
export const API_ENABLED = API_BASE_URL.length > 0;
export const IS_DEMO_MODE = !API_ENABLED;

export const API_ROUTES = {
  login: process.env.EXPO_PUBLIC_AUTH_LOGIN_PATH?.trim() ?? '',
  logout: process.env.EXPO_PUBLIC_AUTH_LOGOUT_PATH?.trim() ?? '',
  forgotPassword: process.env.EXPO_PUBLIC_FORGOT_PASSWORD_PATH?.trim() ?? '',
  cattle: process.env.EXPO_PUBLIC_CATTLE_PATH?.trim() ?? '',
  assessments: process.env.EXPO_PUBLIC_ASSESSMENTS_PATH?.trim() ?? '',
  alerts: process.env.EXPO_PUBLIC_ALERTS_PATH?.trim() ?? '',
  healthRecords: process.env.EXPO_PUBLIC_HEALTH_RECORDS_PATH?.trim() ?? '',
  observations: process.env.EXPO_PUBLIC_OBSERVATIONS_PATH?.trim() ?? '',
} as const;

export const REQUEST_TIMEOUT_MS = 15000;
export const CACHE_STALE_AFTER_MS = 5 * 60 * 1000;

export const DEMO_ACCOUNTS = [
  {
    role: 'farmer' as const,
    label: 'Farmer demo',
    identifier: 'farmer@pathotrace.demo',
    password: 'demo1234',
  },
  {
    role: 'veterinarian' as const,
    label: 'Vet demo',
    identifier: 'vet@pathotrace.demo',
    password: 'demo1234',
  },
];

export const DEMO_NOTICE =
  'Demonstration build: cattle records and assessment results are sample data. No live backend or ML model is connected.';

export const AI_DISCLAIMER =
  'AI-generated results are risk estimates, not confirmed veterinary diagnoses. Always consult a qualified veterinarian for clinical decisions.';

export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
export const APP_SCHEME = Constants.expoConfig?.scheme ?? 'pathotrace';
