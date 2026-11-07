import {
  formatAge,
  formatDate,
  formatDateTime,
  formatLiters,
  formatNumber,
  formatSyncStatus,
  initials,
  pluralize,
  relativeTime,
  titleCase,
} from '@/utils/format';

describe('format utilities', () => {
  it('formats dates and handles missing or invalid values', () => {
    expect(formatDate()).toBe('Not available');
    expect(formatDate('not-a-date')).toBe('Not available');
    expect(formatDate('2026-03-05T12:00:00.000Z')).toMatch(/Mar 2026/);
    expect(formatDateTime('2026-03-05T12:00:00.000Z')).toMatch(/Mar 2026/);
  });

  it('describes recent times relative to a fixed now', () => {
    const now = new Date('2026-03-05T12:00:00.000Z');
    expect(relativeTime('2026-03-05T11:59:45.000Z', now)).toBe('Just now');
    expect(relativeTime('2026-03-05T11:50:00.000Z', now)).toBe('10 min ago');
    expect(relativeTime('2026-03-05T10:00:00.000Z', now)).toBe('2 hr ago');
    expect(relativeTime('2026-03-04T12:00:00.000Z', now)).toBe('Yesterday');
    expect(relativeTime('2026-03-02T12:00:00.000Z', now)).toBe('3 days ago');
    expect(relativeTime('not-a-date', now)).toBe('Not available');
  });

  it('formats age with sensible singular and plural units', () => {
    expect(formatAge(undefined)).toBe('Not recorded');
    expect(formatAge(0)).toBe('1 mo');
    expect(formatAge(6)).toBe('6 mo');
    expect(formatAge(12)).toBe('1 year');
    expect(formatAge(18)).toBe('1y 6m');
    expect(formatAge(24)).toBe('2 years');
  });

  it('formats measurements and counts', () => {
    expect(formatLiters(1234.56)).toBe('1,234.6 L');
    expect(formatLiters(undefined)).toBe('Not recorded');
    expect(formatNumber(1234)).toBe('1,234');
    expect(formatNumber(Number.NaN)).toBe('Not recorded');
    expect(pluralize(1, 'cow')).toBe('1 cow');
    expect(pluralize(2, 'cow')).toBe('2 cows');
    expect(pluralize(2, 'animal', 'animals')).toBe('2 animals');
  });

  it('builds initials, titles, and sync labels', () => {
    expect(initials('  ada lovelace ')).toBe('AL');
    expect(initials('Prince')).toBe('P');
    expect(initials('')).toBe('PT');
    expect(titleCase('high_risk-status')).toBe('High Risk Status');
    expect(formatSyncStatus('synced')).toBe('Synced');
    expect(formatSyncStatus('pending')).toBe('Saved locally');
  });
});
