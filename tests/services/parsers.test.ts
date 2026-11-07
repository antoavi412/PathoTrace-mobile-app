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
} from '@/services/remote/parsers';
import { ApiError } from '@/types';

function expectInvalidResponse(callback: () => unknown) {
  try {
    callback();
    throw new Error('Expected the parser to reject invalid data.');
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('INVALID_RESPONSE');
  }
}

describe('remote response parsers', () => {
  it('parses user aliases and normalizes roles', () => {
    const user = parseUser({
      data: {
        user_id: 'u-1',
        full_name: 'Ada Vet',
        username: 'ada@example.com',
        user_role: 'vet',
        farm_id: 'farm-1',
        phone_number: '555-0100',
        assigned_cow_ids: ['c-1', 7, 'c-2'],
      },
    });

    expect(user).toEqual({
      id: 'u-1',
      name: 'Ada Vet',
      email: 'ada@example.com',
      role: 'veterinarian',
      farmId: 'farm-1',
      farmName: undefined,
      phone: '555-0100',
      assignedCowIds: ['c-1', 'c-2'],
    });
    expect(parseUser({ id: 'u-2', name: 'Pat', email: 'pat@example.com' }).role).toBe('farmer');
    expectInvalidResponse(() => parseUser({ id: 'missing-name' }));
  });

  it('parses cattle aliases, fallbacks, and unknown risk', () => {
    const cow = parseCow({
      cow_id: 'c-1',
      ear_tag: 'T-100',
      cattleBreed: 'Holstein',
      current_risk: 'high',
      age_months: '48',
      days_in_milk: '120',
      last_assessment_at: '2026-03-01T10:00:00.000Z',
    });

    expect(cow).toMatchObject({
      id: 'c-1',
      tagId: 'T-100',
      breed: 'Holstein',
      riskStatus: 'high',
      ageMonths: 48,
      daysInMilk: 120,
      farmId: '',
      lastAssessmentAt: '2026-03-01T10:00:00.000Z',
    });

    const minimal = parseCow({ id: 'c-2' });
    expect(minimal.tagId).toBe('c-2');
    expect(minimal.breed).toBe('Not recorded');
    expect(minimal.riskStatus).toBe('unknown');
    expectInvalidResponse(() => parseCow({ breed: 'Missing id' }));
  });

  it('parses assessments with nested cattle and numeric strings', () => {
    const assessment = parseAssessment({
      assessment_id: 'a-1',
      cow: { id: 'c-1', tag_id: 'T-100', name: 'Bella' },
      risk_category: 'medium',
      created_at: '2026-03-02T09:30:00.000Z',
      risk_probability: '0.42',
      model_version: 'model-v3',
      inputs: {
        milk_yield_liters: '22.5',
        somatic_cell_count: '180000',
        temperature: '38.4',
        dim: '110',
        lactation: '2',
      },
    });

    expect(assessment).toMatchObject({
      id: 'a-1',
      cowId: 'c-1',
      cowTagId: 'T-100',
      cowName: 'Bella',
      category: 'medium',
      probability: 0.42,
      modelVersion: 'model-v3',
      isDemonstration: false,
    });
    expect(assessment.input).toEqual({
      cowId: 'c-1',
      milkYieldLiters: 22.5,
      somaticCellCount: 180000,
      milkTemperatureC: 38.4,
      daysInMilk: 110,
      lactationNumber: 2,
    });

    expectInvalidResponse(() =>
      parseAssessment({
        id: 'a-2',
        cowId: 'c-1',
        cowTagId: 'T-100',
        category: 'critical',
        createdAt: '2026-03-02T09:30:00.000Z',
      })
    );
  });

  it('parses alerts and health records with safe defaults', () => {
    const alert = parseAlert({
      alert_id: 'al-1',
      cow_id: 'c-1',
      cow_tag_id: 'T-100',
      risk: 'high',
      timestamp: '2026-03-03T08:00:00.000Z',
      description: 'Milk temperature above threshold.',
      is_read: true,
    });

    expect(alert).toMatchObject({
      id: 'al-1',
      cowId: 'c-1',
      cowTagId: 'T-100',
      category: 'high',
      severity: 'high',
      title: 'high risk alert',
      message: 'Milk temperature above threshold.',
      read: true,
    });

    const record = parseHealthRecord({
      record_id: 'hr-1',
      cow_id: 'c-1',
      name: 'Routine check',
      date: '2026-02-20T08:00:00.000Z',
      type: 'unsupported',
    });

    expect(record).toMatchObject({
      id: 'hr-1',
      cowId: 'c-1',
      title: 'Routine check',
      kind: 'checkup',
      isDemonstration: false,
    });
  });

  it('parses observations and returns a safe veterinarian fallback', () => {
    const observation = parseObservation({
      observation_id: 'o-1',
      cow_id: 'c-1',
      text: 'Follow-up recommended.',
      date: '2026-03-04T08:00:00.000Z',
    });

    expect(observation).toMatchObject({
      id: 'o-1',
      cowId: 'c-1',
      note: 'Follow-up recommended.',
      veterinarianName: 'Veterinarian',
      veterinarianId: '',
      syncStatus: 'synced',
      isDemonstration: false,
    });
  });

  it('parses lists and paginated envelopes', () => {
    const cow = { id: 'c-1', tagId: 'T-100' };
    expect(parseList([cow], parseCow)).toHaveLength(1);
    expect(parseList({ data: { results: [cow] } }, parseCow)).toHaveLength(1);

    const paginated = parsePaginated(
      {
        data: {
          items: [cow],
          total: 12,
          page: 1,
          page_size: 8,
        },
      },
      parseCow,
      1,
      8
    );

    expect(paginated).toEqual({
      items: [expect.objectContaining({ id: 'c-1' })],
      page: 1,
      pageSize: 8,
      total: 12,
      hasMore: true,
    });

    const complete = parsePaginated([cow], parseCow, 2, 8);
    expect(complete).toMatchObject({ page: 2, pageSize: 8, total: 1, hasMore: false });
    expectInvalidResponse(() => parseList({ unexpected: true }, parseCow));
  });

  it('parses authentication sessions from wrapped responses', () => {
    const session = parseAuthSession({
      data: {
        access_token: 'token-123',
        profile: {
          id: 'u-1',
          name: 'Ada Vet',
          email: 'ada@example.com',
          role: 'veterinarian',
        },
      },
    });

    expect(session.token).toBe('token-123');
    expect(session.user).toMatchObject({ id: 'u-1', role: 'veterinarian' });
    expectInvalidResponse(() => parseAuthSession({ data: { user: { id: 'u-1' } } }));
  });
});
