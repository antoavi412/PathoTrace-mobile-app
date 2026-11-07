import type { AssessmentInput } from '@/types';

export type FieldErrors = Record<string, string>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateIdentifier(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return 'Enter your email or username.';
  if (trimmed.length < 3) return 'Enter at least 3 characters.';
  if (trimmed.includes('@') && !emailPattern.test(trimmed)) {
    return 'Enter a valid email address.';
  }
  return undefined;
}

export function validatePassword(value: string): string | undefined {
  if (!value) return 'Enter your password.';
  if (value.length < 6) return 'Password must be at least 6 characters.';
  return undefined;
}

export function validateLoginForm(identifier: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  const identifierError = validateIdentifier(identifier);
  const passwordError = validatePassword(password);
  if (identifierError) errors.identifier = identifierError;
  if (passwordError) errors.password = passwordError;
  return errors;
}

export function parseNumericInput(value: string): number | undefined {
  const normalized = value.replace(/,/g, '.').trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

interface NumericRule {
  key: keyof Omit<AssessmentInput, 'cowId'>;
  label: string;
  min: number;
  max: number;
  unit: string;
}

export const ASSESSMENT_NUMERIC_RULES: NumericRule[] = [
  {
    key: 'milkYieldLiters',
    label: 'Milk yield',
    min: 0,
    max: 100,
    unit: 'L/day',
  },
  {
    key: 'somaticCellCount',
    label: 'Somatic cell count',
    min: 0,
    max: 10000000,
    unit: 'cells/mL',
  },
  {
    key: 'milkTemperatureC',
    label: 'Milk temperature',
    min: 20,
    max: 50,
    unit: '°C',
  },
  {
    key: 'daysInMilk',
    label: 'Days in milk',
    min: 0,
    max: 999,
    unit: 'days',
  },
  {
    key: 'lactationNumber',
    label: 'Lactation number',
    min: 1,
    max: 20,
    unit: '',
  },
];

export function validateAssessmentForm(
  cowId: string | undefined,
  values: Record<string, string>
): FieldErrors {
  const errors: FieldErrors = {};

  if (!cowId) {
    errors.cowId = 'Select a cow to assess.';
  }

  for (const rule of ASSESSMENT_NUMERIC_RULES) {
    const raw = values[rule.key] ?? '';
    const parsed = parseNumericInput(raw);

    if (parsed === undefined) {
      errors[rule.key] = `Enter ${rule.label.toLowerCase()}.`;
      continue;
    }

    if (parsed < rule.min || parsed > rule.max) {
      const range = `${rule.min.toLocaleString('en-GB')}–${rule.max.toLocaleString('en-GB')}`;
      errors[rule.key] = `${rule.label} must be between ${range}${rule.unit ? ` ${rule.unit}` : ''}.`;
    }
  }

  return errors;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
