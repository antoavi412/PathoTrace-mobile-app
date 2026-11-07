import {
  createDemoAssessment,
  getDemoAssessments,
  getDemoHerd,
  resetDemoAssessments,
} from '@/services/demo/demo-data';

const sampleInput = {
  cowId: 'cow-001',
  milkYieldLiters: 14.5,
  somaticCellCount: 420000,
  milkTemperatureC: 38.6,
  daysInMilk: 140,
  lactationNumber: 3,
};

describe('demo herd data', () => {
  it('filters by risk category', () => {
    const page = getDemoHerd({ page: 1, pageSize: 20, risk: 'high' });
    expect(page.total).toBeGreaterThan(0);
    expect(page.items.every((cow) => cow.riskStatus === 'high')).toBe(true);
    expect(page.hasMore).toBe(false);
  });

  it('searches by tag, name, and breed', () => {
    const byName = getDemoHerd({ page: 1, pageSize: 20, query: 'Daisy' });
    expect(byName.items).toHaveLength(1);
    expect(byName.items[0].tagId).toBe('PT-001');
  });

  it('paginates results without duplicates', () => {
    const first = getDemoHerd({ page: 1, pageSize: 4 });
    const second = getDemoHerd({ page: 2, pageSize: 4 });
    expect(first.items).toHaveLength(4);
    expect(second.items).toHaveLength(4);
    expect(first.hasMore).toBe(true);
    const ids = new Set([...first.items, ...second.items].map((cow) => cow.id));
    expect(ids.size).toBe(8);
  });
});

describe('createDemoAssessment', () => {
  beforeEach(() => resetDemoAssessments());
  afterEach(() => resetDemoAssessments());

  it('records a clearly labelled demonstration result without a probability', () => {
    const assessment = createDemoAssessment('cow-001', sampleInput);
    expect(assessment.isDemonstration).toBe(true);
    expect(assessment.probability).toBeUndefined();
    expect(assessment.note).toMatch(/No ML model was used/i);
    expect(assessment.category).toBe('high');
  });

  it('adds the new assessment to history', () => {
    const assessment = createDemoAssessment('cow-001', sampleInput);
    const history = getDemoAssessments('cow-001');
    expect(history[0].id).toBe(assessment.id);
  });
});
