import { riskTone } from '@/constants/theme';
import type { Assessment, Cow, CowRiskStatus, RiskCategory } from '@/types';

export const RISK_CATEGORIES: RiskCategory[] = ['low', 'medium', 'high'];

export const RISK_FILTER_OPTIONS: { value: CowRiskStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'unknown', label: 'Not assessed' },
];

export function isRiskCategory(value: unknown): value is RiskCategory {
  return value === 'low' || value === 'medium' || value === 'high';
}

export function normalizeRiskStatus(value: unknown): CowRiskStatus {
  return isRiskCategory(value) ? value : 'unknown';
}

export function riskLabel(status: CowRiskStatus): string {
  return riskTone[status].label;
}

export function riskColor(status: CowRiskStatus): string {
  return riskTone[status].color;
}

export function riskSoftColor(status: CowRiskStatus): string {
  return riskTone[status].soft;
}

export function riskWeight(status: CowRiskStatus): number {
  if (status === 'high') return 3;
  if (status === 'medium') return 2;
  if (status === 'low') return 1;
  return 0;
}

export function sortAssessmentsByDate(assessments: Assessment[]): Assessment[] {
  return [...assessments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function countRisk(cows: Cow[]): Record<CowRiskStatus, number> {
  const counts: Record<CowRiskStatus, number> = {
    high: 0,
    medium: 0,
    low: 0,
    unknown: 0,
  };
  for (const cow of cows) {
    counts[cow.riskStatus] += 1;
  }
  return counts;
}

export function highestRisk(cows: Cow[]): CowRiskStatus {
  let highest: CowRiskStatus = 'unknown';
  for (const cow of cows) {
    if (riskWeight(cow.riskStatus) > riskWeight(highest)) {
      highest = cow.riskStatus;
    }
  }
  return highest;
}
