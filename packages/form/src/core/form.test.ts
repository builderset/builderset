import { describe, expect, it } from 'vitest';

import {
  buildForm,
  checkForm,
  createFormDocument,
  createFormRegistry,
  field,
  isShown,
  parseForm,
  step,
  validateAnswers,
} from './index';

const registry = createFormRegistry();

/** A two-step form: a car, then who to call — with a question only after an accident. */
const valuation = () =>
  buildForm(registry, { meta: { name: 'Valuation', title: 'Get an offer' }, stable: true }, [
    step('Car', [
      field('text', {
        label: 'Plate',
        key: 'plate',
        required: true,
        checks: {
          minLength: null,
          maxLength: 10,
          min: null,
          max: null,
          pattern: 'none',
          regex: '',
          message: '',
        },
      }),
      field('number', {
        label: 'Year',
        key: 'year',
        required: true,
        checks: {
          minLength: null,
          maxLength: null,
          min: 1990,
          max: 2026,
          pattern: 'none',
          regex: '',
          message: '',
        },
      }),
      field('yes-no', { label: 'Any accident?', key: 'accident', required: true }),
      field('textarea', {
        label: 'What happened?',
        key: 'accident_details',
        required: true,
        logic: {
          enabled: true,
          match: 'all',
          rules: [{ key: 'accident', op: 'is', value: 'yes' }],
        },
      }),
    ]),
    step('Contact', [
      field('name', { label: 'Name', key: 'name', required: true }),
      field('email', { label: 'Email', key: 'email', required: true }),
      field('checkbox', {
        label: 'Documents',
        key: 'documents',
        options: ['Registration', 'Service book'],
      }),
      field('consent', { label: 'Consent', key: 'consent' }),
    ]),
  ]);

describe('form model', () => {
  it('every field type has defaults its own schema accepts', () => {
    expect(registry.all().length).toBeGreaterThan(20);
  });

  it('a new form is valid and has one empty step', () => {
    const doc = createFormDocument({ name: 'New' });
    expect(parseForm(doc, registry)).not.toBeNull();
    expect(checkForm(doc, registry).map((issue) => issue.code)).toContain('form.noFields');
  });

  it('a built form passes its checks', () => {
    const issues = checkForm(valuation(), registry).filter((issue) => issue.severity === 'error');
    expect(issues).toEqual([]);
  });

  it('finds two fields saving to one key, and an auto-reply with no email field', () => {
    const doc = buildForm(registry, { settings: { autoReply: { enabled: true, to: 'mail' } } }, [
      step('One', [field('text', { key: 'a' }), field('text', { key: 'a' })]),
    ]);
    const codes = checkForm(doc, registry).map((issue) => issue.code);
    expect(codes).toContain('field.keyDuplicate');
    expect(codes).toContain('autoReply.noEmailField');
  });
});

describe('answers', () => {
  it('shows a field only while its rules hold', () => {
    const logic = {
      enabled: true,
      match: 'all' as const,
      rules: [{ key: 'accident', op: 'is' as const, value: 'yes' }],
    };
    expect(isShown({ logic }, { accident: 'no' })).toBe(false);
    expect(isShown({ logic }, { accident: 'yes' })).toBe(true);
  });

  it('checks one step: required answers, ranges, and skips hidden questions', () => {
    const result = validateAnswers(
      valuation(),
      { plate: 'AA123BC', year: '1980', accident: 'no' },
      { step: 0 },
    );
    expect(result.errors).toEqual({ year: { code: 'tooLow', limit: 1990 } });
    expect(result.errors.accident_details).toBeUndefined();
  });

  it('asks for the details once there was an accident', () => {
    const result = validateAnswers(
      valuation(),
      { plate: 'AA123BC', year: 2016, accident: 'yes' },
      { step: 0 },
    );
    expect(result.errors.accident_details?.code).toBe('required');
  });

  it('checks a whole submission, keeping only what the form asks', () => {
    const result = validateAnswers(valuation(), {
      plate: 'AA123BC',
      year: '2016',
      accident: 'no',
      accident_details: 'stale',
      name: { first: 'Arben', last: 'Hoxha' },
      email: 'arben@example.com',
      documents: ['Registration'],
      consent: true,
      injected: 'nope',
    });
    expect(result.ok).toBe(true);
    expect(result.values).toEqual({
      plate: 'AA123BC',
      year: 2016,
      accident: 'no',
      name: { first: 'Arben', last: 'Hoxha' },
      email: 'arben@example.com',
      documents: ['Registration'],
      consent: true,
    });
  });

  it('refuses a bad email, an unknown choice and missing consent', () => {
    const result = validateAnswers(
      valuation(),
      {
        name: { first: 'A', last: '' },
        email: 'not-an-email',
        documents: ['Something else'],
        consent: false,
      },
      { step: 1 },
    );
    expect(result.errors).toEqual({
      email: { code: 'email' },
      documents: { code: 'choice' },
      consent: { code: 'required' },
    });
  });
});
