import {
  hasErrors,
  parseNumericInput,
  validateAssessmentForm,
  validateLoginForm,
} from '@/utils/validation';

const validAssessmentValues = {
  milkYieldLiters: '18.5',
  somaticCellCount: '240000',
  milkTemperatureC: '38.4',
  daysInMilk: '120',
  lactationNumber: '2',
};

describe('validateLoginForm', () => {
  it('requires an identifier and password', () => {
    const errors = validateLoginForm('', '');
    expect(errors.identifier).toBeDefined();
    expect(errors.password).toBeDefined();
    expect(hasErrors(errors)).toBe(true);
  });

  it('accepts a valid email and password', () => {
    expect(validateLoginForm('farmer@pathotrace.demo', 'demo1234')).toEqual({});
  });

  it('rejects malformed email addresses', () => {
    const errors = validateLoginForm('not-an-email@', 'demo1234');
    expect(errors.identifier).toMatch(/valid email/i);
  });

  it('requires a password of at least six characters', () => {
    expect(validateLoginForm('user@example.com', '123').password).toMatch(/6 characters/i);
  });
});

describe('validateAssessmentForm', () => {
  it('accepts valid assessment inputs', () => {
    expect(validateAssessmentForm('cow-001', validAssessmentValues)).toEqual({});
  });

  it('requires a selected cow', () => {
    expect(validateAssessmentForm(undefined, validAssessmentValues).cowId).toBeDefined();
  });

  it('rejects out-of-range temperature values', () => {
    const errors = validateAssessmentForm('cow-001', {
      ...validAssessmentValues,
      milkTemperatureC: '60',
    });
    expect(errors.milkTemperatureC).toMatch(/between/i);
  });

  it('rejects missing numeric values', () => {
    const errors = validateAssessmentForm('cow-001', {
      ...validAssessmentValues,
      somaticCellCount: '',
    });
    expect(errors.somaticCellCount).toBeDefined();
  });
});

describe('parseNumericInput', () => {
  it('parses decimal commas', () => {
    expect(parseNumericInput('18,5')).toBe(18.5);
  });

  it('returns undefined for empty or invalid input', () => {
    expect(parseNumericInput('')).toBeUndefined();
    expect(parseNumericInput('abc')).toBeUndefined();
  });
});
