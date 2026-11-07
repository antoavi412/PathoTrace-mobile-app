import type { Assessment, Cow } from '@/types';
import {
  countRisk,
  highestRisk,
  normalizeRiskStatus,
  sortAssessmentsByDate,
} from '@/utils/risk';

function cow(id: string, riskStatus: Cow['riskStatus']): Cow {
  return {
    id,
    tagId: id.toUpperCase(),
    breed: 'Test breed',
    farmId: 'farm-1',
    riskStatus,
  };
}

function assessment(id: string, createdAt: string): Assessment {
  return {
    id,
    cowId: 'cow-1',
    cowTagId: 'C1',
    category: 'low',
    createdAt,
    input: {
      cowId: 'cow-1',
      milkYieldLiters: 10,
      somaticCellCount: 100000,
      milkTemperatureC: 38,
      daysInMilk: 100,
      lactationNumber: 1,
    },
    isDemonstration: true,
  };
}

describe('risk utilities', () => {
  it('counts each risk category', () => {
    const counts = countRisk([
      cow('a', 'high'),
      cow('b', 'high'),
      cow('c', 'medium'),
      cow('d', 'low'),
      cow('e', 'unknown'),
    ]);
    expect(counts).toEqual({ high: 2, medium: 1, low: 1, unknown: 1 });
  });

  it('returns the highest risk in the herd', () => {
    expect(highestRisk([cow('a', 'low'), cow('b', 'medium'), cow('c', 'high')])).toBe('high');
    expect(highestRisk([cow('a', 'low'), cow('b', 'unknown')])).toBe('low');
    expect(highestRisk([])).toBe('unknown');
  });

  it('normalizes unsupported risk values to unknown', () => {
    expect(normalizeRiskStatus('high')).toBe('high');
    expect(normalizeRiskStatus('critical')).toBe('unknown');
    expect(normalizeRiskStatus(null)).toBe('unknown');
  });

  it('sorts assessments newest first', () => {
    const sorted = sortAssessmentsByDate([
      assessment('older', '2026-01-01T10:00:00.000Z'),
      assessment('newer', '2026-02-01T10:00:00.000Z'),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(['newer', 'older']);
  });
});
