import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { buildTemplateForm, FORM_TEMPLATES } from '../templates';
import { validateAnswers, type Answers } from './answers';
import { buildForm, field, step, type SettingsPatch } from './build';
import { createFormDocument, type FormDocument } from './document';
import { createFormRegistry, noChecks, type FieldChecks } from './fields';
import { toFormJSONSchema } from './json-schema';
import { checkForm, FORM_DRAFT_TOLERATES, isDraftBlocking, isPublishBlocking } from './validate';

/**
 * The CONTRACT with the server, as files.
 *
 * `schema/form.schema.json` and `fixtures/` are committed, and this package's
 * alone: a backend in another language keeps a copy of them. Its contract
 * tests read them: every valid fixture must be accepted, every invalid one
 * refused with exactly the codes the manifest names, a draft lenient on
 * exactly the codes in `draft.json` — and every case in `answers.json` must
 * give exactly the result `validateAnswers` gives here. This test keeps the
 * files honest — it regenerates them in memory and fails when the committed
 * copy differs. Run with `UPDATE_FIXTURES=1` to rewrite them after an
 * intentional change, and commit the result alongside the change.
 */

const registry = createFormRegistry();
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const update = process.env.UPDATE_FIXTURES === '1';

function stable(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function expectFile(relative: string, content: string) {
  const path = join(root, relative);
  if (update) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    return;
  }
  let committed = '';
  try {
    committed = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  } catch {
    throw new Error(`${relative} is missing — run the tests with UPDATE_FIXTURES=1 and commit it.`);
  }
  expect(committed, `${relative} is stale — run with UPDATE_FIXTURES=1`).toBe(content);
}

function expectFixture(relative: string, content: string) {
  expectFile(`fixtures/${relative}`, content);
}

const checks = (some: Partial<FieldChecks>) => ({ checks: { ...noChecks(), ...some } });
const when = (match: 'all' | 'any', ...rules: [key: string, op: string, value?: string][]) => ({
  logic: {
    enabled: true,
    match,
    rules: rules.map(([key, op, value = '']) => ({ key, op, value })),
  },
});

/**
 * Every element of the form, with the checks and logic the answer cases below
 * lean on. It passes every check: no errors, no warnings.
 */
function kitchenSink(): FormDocument {
  return buildForm(
    registry,
    {
      meta: { name: 'Kitchen sink', title: 'Sell your car', intro: 'Every field.', slug: 'sink' },
      stable: true,
    },
    [
      step('About you', [
        field('name', { label: 'Your name', key: 'name', required: true }),
        field('email', {
          label: 'Email',
          key: 'email',
          required: true,
          ...checks({ message: 'We need an email we can answer.' }),
        }),
        field('phone', { label: 'Phone', key: 'phone' }),
        field('text', {
          label: 'When to call',
          key: 'call_time',
          ...when('all', ['phone', 'not_empty']),
        }),
        field('address', { label: 'Address', key: 'address', required: true }),
        field('date', { label: 'Date', key: 'date' }),
        field('time', { label: 'Time', key: 'time' }),
      ]),
      step('The car', [
        field('heading', { text: 'Tell us about it' }),
        field('text', {
          label: 'Nickname',
          key: 'nickname',
          ...checks({ minLength: 2, maxLength: 10, pattern: 'letters' }),
        }),
        field('text', { label: 'Code', key: 'code', ...checks({ pattern: 'digits' }) }),
        field('text', {
          label: 'Plate',
          key: 'plate',
          ...checks({
            pattern: 'custom',
            regex: '^[A-Z]{2}[0-9]{3}[A-Z]{2}$',
            message: 'Use the form AA123BC.',
          }),
        }),
        field('password', { label: 'Password', key: 'password', ...checks({ minLength: 8 }) }),
        field('number', {
          label: 'Year',
          key: 'year',
          required: true,
          ...checks({ min: 1990, max: 2026 }),
        }),
        field('number', { label: 'Doors', key: 'doors' }),
        field('select', { label: 'Fuel', key: 'fuel', options: ['Petrol', 'Diesel', 'Electric'] }),
        field('radio', { label: 'Gearbox', key: 'gearbox', options: ['Manual', 'Automatic'] }),
        field('checkbox', {
          label: 'Extras',
          key: 'extras',
          options: ['Sunroof', 'Leather', 'Navigation', 'Towbar'],
          ...checks({ min: 2, max: 3 }),
        }),
        field('number', {
          label: 'Towing weight',
          key: 'tow_weight',
          required: true,
          ...when('all', ['extras', 'is', 'Towbar']),
        }),
        field('yes-no', { label: 'Any accident?', key: 'accident' }),
        field('textarea', {
          label: 'What happened?',
          key: 'accident_details',
          required: true,
          ...checks({ maxLength: 40 }),
          ...when('all', ['accident', 'is', 'yes']),
        }),
        field('rating', { label: 'Its state', key: 'rating', stars: 5 }),
        field('scale', { label: 'How likely to sell?', key: 'score', from: 0, to: 10 }),
        field('text', {
          label: 'Why so low?',
          key: 'why_low',
          required: true,
          ...when('any', ['score', 'lt', '5'], ['rating', 'lt', '2']),
        }),
        field('text', {
          label: 'Anything about the leather?',
          key: 'leather_note',
          ...when('all', ['extras', 'contains', 'leath'], ['year', 'gt', '2015']),
        }),
        field('slider', {
          label: 'Price',
          key: 'budget',
          min: 1000,
          max: 50000,
          step: 500,
          defaultValue: 10000,
          unit: '€',
        }),
        field('text', {
          label: 'Internal reference',
          key: 'internal_ref',
          required: true,
          hideFromVisitors: true,
        }),
      ]),
      step('Photos', [
        field('paragraph', { text: 'Two photos at most, 1 MB each.' }),
        field('file', {
          label: 'Photos',
          key: 'photos',
          accept: ['jpg', 'png'],
          maxFiles: 2,
          maxMb: 1,
        }),
        field('divider', {}),
        field('image', {
          media: { key: 'form-image/2026/01/car.jpg', width: 1200, height: 800 },
          alt: 'A car',
        }),
        field('signature', { label: 'Signature', key: 'signature' }),
        field('hidden', { label: 'Source', key: 'source', value: '', prefill: 'utm_source' }),
        field('consent', {
          label: 'Consent',
          key: 'consent',
          required: true,
          text: 'I agree to the privacy policy.',
          linkText: 'privacy policy',
          linkUrl: 'https://example.com/privacy',
        }),
      ]),
    ],
  );
}

// ── invalid documents ────────────────────────────────────────────────────────

/** A small valid form to break in one specific way per invalid fixture. */
function base(settings: SettingsPatch = {}): FormDocument {
  return buildForm(registry, { meta: { title: 'Broken on purpose' }, settings, stable: true }, [
    step('One', [
      field('text', { label: 'Plate', key: 'plate' }),
      field('consent', {
        label: 'Consent',
        key: 'consent',
        required: true,
        text: 'I agree.',
        linkText: '',
      }),
    ]),
  ]);
}

/** A node of `base()`: `n1` the text field, `n2` the consent, `n3` their step. */
function node(doc: FormDocument, id: string) {
  const found = doc.nodes[id];
  if (!found) throw new Error(`base() lost ${id}`);
  return found;
}

const INVALID: [name: string, build: () => FormDocument][] = [
  [
    'duplicate-key',
    () => {
      const doc = base();
      node(doc, 'n3').children?.push('n9');
      doc.nodes.n9 = { ...structuredClone(node(doc, 'n1')), id: 'n9' };
      return doc;
    },
  ],
  [
    'label-missing',
    () => {
      const doc = base();
      node(doc, 'n1').props.label = '   ';
      return doc;
    },
  ],
  [
    'one-option',
    () => {
      const doc = base();
      node(doc, 'n3').children?.push('n9');
      doc.nodes.n9 = {
        id: 'n9',
        type: 'radio',
        v: 1,
        props: { ...registry.require('radio').defaults(), key: 'pick', options: ['Only', ' '] },
      };
      return doc;
    },
  ],
  [
    'consent-text-missing',
    () => {
      const doc = base();
      node(doc, 'n2').props.text = '';
      return doc;
    },
  ],
  [
    'unsafe-consent-link',
    () => {
      const doc = base();
      node(doc, 'n2').props.linkUrl = 'javascript:alert(1)';
      return doc;
    },
  ],
  ['auto-reply-no-email-field', () => base({ autoReply: { enabled: true, to: 'plate' } })],
  ['redirect-missing', () => base({ after: { mode: 'redirect', redirectUrl: '  ' } })],
  [
    'unsafe-redirect',
    () => base({ after: { mode: 'both', redirectUrl: ' javascript:alert(document.cookie)' } }),
  ],
  ['unsafe-webhook', () => base({ webhook: 'data:text/html,<script>alert(1)</script>' })],
  [
    'pattern-invalid',
    () => {
      const doc = base();
      node(doc, 'n1').props.checks = { ...noChecks(), pattern: 'custom', regex: '([A-Z' };
      return doc;
    },
  ],
  [
    'range-invalid',
    () => {
      const doc = base();
      node(doc, 'n3').children?.push('n9');
      doc.nodes.n9 = {
        id: 'n9',
        type: 'slider',
        v: 1,
        props: { ...registry.require('slider').defaults(), key: 'price', min: 10, max: 10 },
      };
      return doc;
    },
  ],
  [
    'no-fields',
    () => {
      const doc = createFormDocument({ title: 'Nothing to answer' });
      node(doc, 'step1').children?.push('n1');
      doc.nodes.n1 = {
        id: 'n1',
        type: 'heading',
        v: 1,
        props: registry.require('heading').defaults(),
      };
      return doc;
    },
  ],
  [
    'missing-child',
    () => {
      const doc = base();
      node(doc, 'n3').children?.push('n9');
      return doc;
    },
  ],
  [
    'orphan',
    () => {
      const doc = base();
      doc.nodes.n9 = {
        id: 'n9',
        type: 'divider',
        v: 1,
        props: registry.require('divider').defaults(),
      };
      return doc;
    },
  ],
  [
    'unknown-element',
    () => {
      const doc = base();
      node(doc, 'n3').children?.push('n9');
      doc.nodes.n9 = { id: 'n9', type: 'marquee', v: 1, props: {} };
      return doc;
    },
  ],
  [
    'step-in-step',
    () => {
      const doc = base();
      node(doc, 'n3').children?.push('n9');
      doc.nodes.n9 = { id: 'n9', type: 'step', v: 1, props: { title: 'Inner' }, children: [] };
      return doc;
    },
  ],
  [
    'field-in-root',
    () => {
      const doc = base();
      node(doc, 'root').children?.push('n9');
      doc.nodes.n9 = { ...structuredClone(node(doc, 'n1')), id: 'n9' };
      doc.nodes.n9.props.key = 'other';
      return doc;
    },
  ],
  [
    'no-steps',
    () => {
      const doc = base();
      node(doc, 'root').children = [];
      for (const id of ['n1', 'n2', 'n3']) Reflect.deleteProperty(doc.nodes, id);
      return doc;
    },
  ],
  [
    'props-wrong-type',
    () => {
      const doc = base();
      node(doc, 'n1').props.required = 'yes';
      return doc;
    },
  ],
  [
    'key-malformed',
    () => {
      const doc = base();
      node(doc, 'n1').props.key = 'First Name';
      return doc;
    },
  ],
  [
    'settings-malformed',
    () => {
      const doc = base();
      (doc.settings.style as { width: number }).width = 100;
      return doc;
    },
  ],
  ['not-a-form', () => ({ ...base(), schema: 'email/document' as FormDocument['schema'] })],
  [
    'translation-too-long',
    () => {
      const doc = base();
      doc.i18n = {
        enabled: true,
        base: 'en',
        translations: { de: { nodes: { n1: { label: 'x'.repeat(301) } } } },
      };
      return doc;
    },
  ],
  /** Every warning the checker has, and one error so the document is refused. */
  [
    'every-warning',
    () => {
      const doc = buildForm(
        registry,
        {
          meta: { title: ' ' },
          settings: {
            notify: { enabled: true, recipients: [] },
            spam: { captcha: 'off', honeypot: false },
          },
          stable: true,
        },
        [
          step('One', [
            field('email', { label: 'Email', key: 'email', ...when('all', ['later', 'is', 'x']) }),
            field('text', { label: 'Later', key: 'later' }),
            field('image', { media: { key: 'form-image/a.jpg' }, alt: '' }),
            field('text', { label: '', key: 'unlabelled' }),
          ]),
          step('Empty', []),
        ],
      );
      return doc;
    },
  ],
];

function invalid(name: string): FormDocument {
  const found = INVALID.find(([candidate]) => candidate === name);
  if (!found) throw new Error(`no invalid fixture "${name}"`);
  return found[1]();
}

// ── answers ──────────────────────────────────────────────────────────────────

interface AnswerCase {
  name: string;
  /** A valid fixture's name, or the document itself. */
  form: string | FormDocument;
  answers: Answers;
  step?: number;
}

/** What a filled-in kitchen sink sends when everything is right. */
const good = (): Answers => ({
  name: { first: 'Ana', last: 'Kurti' },
  email: 'ana@example.com',
  address: { street: 'Rruga e Kavajës 1', city: 'Tirana', zip: '1001' },
  year: 2018,
  rating: 4,
  score: 8,
  consent: true,
});

/** Keys JavaScript objects already have a member for: read as the visitor's, never inherited. */
const prototypeForm = (): FormDocument =>
  buildForm(registry, { meta: { title: 'Inline' }, stable: true }, [
    step('Only', [
      field('text', { label: 'Builder', key: 'constructor', required: true }),
      field('text', {
        label: 'Follow-up',
        key: 'follow_up',
        ...when('all', ['constructor', 'not_empty']),
      }),
    ]),
  ]);

const sliderForm = (): FormDocument =>
  buildForm(registry, { meta: { title: 'Inline' }, stable: true }, [
    step('Only', [
      field('slider', { label: 'Km', key: 'km', min: -50, max: 50, step: 0.5, defaultValue: 0 }),
      field('rating', { label: 'Stars', key: 'stars', stars: 3, required: true }),
      field('scale', { label: 'Score', key: 'score', from: 1, to: 5 }),
    ]),
  ]);

const ANSWER_CASES: AnswerCase[] = [
  { name: 'everything right', form: 'kitchen-sink', answers: good() },
  { name: 'nothing sent: every required field', form: 'kitchen-sink', answers: {} },
  {
    name: 'blank strings and a blank name are no answer',
    form: 'kitchen-sink',
    answers: { ...good(), email: '   ', name: { first: ' ', last: '' }, nickname: '' },
  },
  {
    name: 'a name needs its first part',
    form: 'kitchen-sink',
    answers: { ...good(), name: { first: '', last: 'Kurti' } },
  },
  {
    name: 'an address needs a street and a city',
    form: 'kitchen-sink',
    answers: { ...good(), address: { street: 'Rruga 1', city: '', zip: '1001' } },
  },
  {
    name: 'a name sent as text',
    form: 'kitchen-sink',
    answers: { ...good(), name: 'Ana Kurti' },
  },
  {
    name: 'email format, with the form’s own message',
    form: 'kitchen-sink',
    answers: { ...good(), email: 'ana@example' },
  },
  {
    name: 'an email is trimmed to check but kept as sent',
    form: 'kitchen-sink',
    answers: { ...good(), email: '  ana@example.com ' },
  },
  {
    name: 'phone formats',
    form: 'kitchen-sink',
    answers: { ...good(), phone: '06x 123', call_time: 'mornings' },
  },
  {
    name: 'a phone number shows the question after it',
    form: 'kitchen-sink',
    answers: { ...good(), phone: '+355 (69) 123-4567', call_time: 'mornings' },
  },
  {
    name: 'no phone: its follow-up is hidden and dropped',
    form: 'kitchen-sink',
    answers: { ...good(), call_time: 'mornings' },
  },
  {
    name: 'date and time formats',
    form: 'kitchen-sink',
    answers: { ...good(), date: '2026/01/31', time: '9:30' },
  },
  {
    name: 'a date and a time in shape',
    form: 'kitchen-sink',
    answers: { ...good(), date: '2026-01-31', time: '09:30' },
  },
  {
    name: 'too short',
    form: 'kitchen-sink',
    answers: { ...good(), nickname: 'A', password: 'short' },
  },
  {
    name: 'too long',
    form: 'kitchen-sink',
    answers: {
      ...good(),
      nickname: 'Bartholomew',
      accident: 'yes',
      accident_details: 'x'.repeat(41),
    },
  },
  {
    name: 'length counts UTF-16 units, as the browser does',
    form: 'kitchen-sink',
    answers: { ...good(), password: '😀😀😀😀', nickname: 'Ëëë' },
  },
  {
    name: 'letters: any alphabet, spaces, apostrophes and hyphens',
    form: 'kitchen-sink',
    answers: { ...good(), nickname: "D'Ana-Çelë" },
  },
  {
    name: 'letters and digits refused',
    form: 'kitchen-sink',
    answers: { ...good(), nickname: 'Ana2', code: '12a' },
  },
  {
    name: 'digits are ASCII digits',
    form: 'kitchen-sink',
    answers: { ...good(), code: '١٢٣' },
  },
  {
    name: 'a custom pattern, with the form’s own message',
    form: 'kitchen-sink',
    answers: { ...good(), plate: 'aa123bc' },
  },
  {
    name: 'a custom pattern matched',
    form: 'kitchen-sink',
    answers: { ...good(), plate: ' AA123BC ' },
  },
  {
    name: 'numbers from strings, spaces removed',
    form: 'kitchen-sink',
    answers: { ...good(), year: ' 2 019 ', doors: '5', rating: '4', score: '9', budget: '12500' },
  },
  {
    name: 'numbers as JavaScript reads them: hex, exponent, leading dot',
    form: 'kitchen-sink',
    answers: { ...good(), year: '0x7E2', doors: '5e0', budget: '.5e4' },
  },
  {
    name: 'not a number',
    form: 'kitchen-sink',
    answers: { ...good(), year: '20x9', doors: 'Infinity', budget: true },
  },
  {
    name: 'a number range',
    form: 'kitchen-sink',
    answers: { ...good(), year: 1985 },
  },
  {
    name: 'a number range from above',
    form: 'kitchen-sink',
    answers: { ...good(), year: '2030' },
  },
  {
    name: 'rating, scale and slider bounds',
    form: 'kitchen-sink',
    answers: { ...good(), rating: 6, score: -1, budget: 60000 },
  },
  {
    name: 'rating and slider from below',
    form: 'kitchen-sink',
    answers: { ...good(), rating: 0, budget: '999.5' },
  },
  {
    name: 'a choice not in the options',
    form: 'kitchen-sink',
    answers: { ...good(), fuel: 'Hydrogen', gearbox: 'manual' },
  },
  {
    name: 'a choice in the options',
    form: 'kitchen-sink',
    answers: { ...good(), fuel: 'Diesel', gearbox: ' Automatic' },
  },
  {
    name: 'a single choice sent as a list',
    form: 'kitchen-sink',
    answers: { ...good(), fuel: ['Diesel'], gearbox: ['Manual'], accident: ['no'] },
  },
  {
    name: 'yes or no only',
    form: 'kitchen-sink',
    answers: { ...good(), accident: 'maybe' },
  },
  {
    name: 'too few choices',
    form: 'kitchen-sink',
    answers: { ...good(), extras: ['Sunroof'] },
  },
  {
    name: 'too many choices',
    form: 'kitchen-sink',
    answers: { ...good(), extras: ['Sunroof', 'Leather', 'Navigation', 'Towbar'], tow_weight: 900 },
  },
  {
    name: 'choices not in the options, or not a list',
    form: 'kitchen-sink',
    answers: { ...good(), extras: ['Sunroof', 'Spoiler'], gearbox: ['Manual', 'Automatic'] },
  },
  {
    name: 'choices sent as text',
    form: 'kitchen-sink',
    answers: { ...good(), extras: 'Sunroof' },
  },
  {
    name: 'a choice ticked shows its follow-up, which is required',
    form: 'kitchen-sink',
    answers: { ...good(), extras: ['Towbar', 'Leather'] },
  },
  {
    name: 'a follow-up answered',
    form: 'kitchen-sink',
    answers: {
      ...good(),
      extras: ['Towbar', 'Leather'],
      tow_weight: '1 500',
      leather_note: 'Mint',
    },
  },
  {
    name: 'contains and gt: case-insensitive, on numbers',
    form: 'kitchen-sink',
    answers: { ...good(), year: 2010, extras: ['Leather', 'Sunroof'], leather_note: 'Worn' },
  },
  {
    name: 'a yes shows the details question',
    form: 'kitchen-sink',
    answers: { ...good(), accident: 'yes' },
  },
  {
    name: 'a no hides the details and drops the stale answer',
    form: 'kitchen-sink',
    answers: { ...good(), accident: 'no', accident_details: 'A dent' },
  },
  {
    name: 'any rule: a low score shows the why',
    form: 'kitchen-sink',
    answers: { ...good(), score: 3, rating: 5 },
  },
  {
    name: 'any rule: a high score and good rating hide it',
    form: 'kitchen-sink',
    answers: { ...good(), score: 9, rating: 4, why_low: 'stale' },
  },
  {
    name: 'an empty answer matches neither lt nor gt',
    form: 'kitchen-sink',
    answers: { ...good(), rating: 5, score: undefined, why_low: 'stale', year: '  ' },
  },
  {
    name: 'an answer that is not a number matches neither lt nor gt',
    form: 'kitchen-sink',
    answers: {
      ...good(),
      year: 'unknown',
      rating: 'great',
      score: 'low',
      why_low: 'stale',
      extras: ['Leather', 'Sunroof'],
      leather_note: 'stale',
    },
  },
  {
    name: 'gt on a number given as text',
    form: 'kitchen-sink',
    answers: { ...good(), year: ' 2019 ', extras: ['Leather', 'Sunroof'], leather_note: 'Mint' },
  },
  {
    name: 'consent must be true',
    form: 'kitchen-sink',
    answers: { ...good(), consent: 'yes' },
  },
  {
    name: 'consent unticked',
    form: 'kitchen-sink',
    answers: { ...good(), consent: false },
  },
  {
    name: 'too many files',
    form: 'kitchen-sink',
    answers: {
      ...good(),
      photos: [{ name: 'a.jpg' }, { name: 'b.jpg' }, { name: 'c.jpg' }],
    },
  },
  {
    name: 'a file of the wrong type',
    form: 'kitchen-sink',
    answers: { ...good(), photos: [{ name: 'a.JPG', size: 1000 }, { name: 'b.gif' }] },
  },
  {
    name: 'a file too big',
    form: 'kitchen-sink',
    answers: { ...good(), photos: [{ name: 'a.png', size: 1048577 }] },
  },
  {
    name: 'files within bounds',
    form: 'kitchen-sink',
    answers: { ...good(), photos: [{ name: 'a.png', size: 1048576 }, { name: 'b.jpg' }] },
  },
  {
    name: 'files not sent as a list',
    form: 'kitchen-sink',
    answers: { ...good(), photos: { name: 'a.png' } },
  },
  {
    name: 'a file without a name, or not an object, is of no type',
    form: 'kitchen-sink',
    answers: { ...good(), photos: [{ size: 10 }] },
  },
  {
    name: 'a file given as text is of no type',
    form: 'kitchen-sink',
    answers: { ...good(), photos: ['a.jpg'] },
  },
  {
    name: 'a hidden field is kept as sent; questions the form does not ask are dropped',
    form: 'kitchen-sink',
    answers: { ...good(), source: 'newsletter', utm_campaign: 'spring', internal_ref: '' },
  },
  {
    name: 'a field hidden from visitors is never required',
    form: 'kitchen-sink',
    answers: { ...good(), internal_ref: 'R-1' },
  },
  {
    name: 'one step at a time: the first',
    form: 'kitchen-sink',
    answers: { email: 'nope' },
    step: 0,
  },
  {
    name: 'one step at a time: the last',
    form: 'kitchen-sink',
    answers: { name: { first: 'Ana' } },
    step: 2,
  },
  {
    name: 'a template: the topic shows the reference',
    form: 'contact',
    answers: {
      name: { first: 'Ana', last: 'Kurti' },
      email: 'ana@example.com',
      topic: 'Support',
      reference: 'A-17',
      message: 'Where is my order?',
      consent: true,
    },
  },
  {
    name: 'a template: the message too short',
    form: 'contact',
    answers: {
      name: { first: 'Ana', last: '' },
      email: 'ana@example.com',
      topic: 'Sales',
      reference: 'dropped',
      message: 'Hi',
      consent: true,
    },
  },
  {
    name: 'a form given inline: negative and fractional bounds',
    form: sliderForm(),
    answers: { km: '-50.5', stars: 3, score: 0 },
  },
  {
    name: 'a form given inline: in bounds',
    form: sliderForm(),
    answers: { km: -0.5, stars: '2', score: 5 },
  },
  {
    name: 'a key named like an Object member is an ordinary key: unanswered',
    form: prototypeForm(),
    answers: { follow_up: 'stale' },
  },
  {
    name: 'a key named like an Object member is an ordinary key: answered',
    form: prototypeForm(),
    answers: { constructor: 'Ana', follow_up: 'Yes' },
  },
];

describe('the server contract', () => {
  it('commits the JSON Schema of the standard document', () => {
    expectFile('schema/form.schema.json', stable(toFormJSONSchema(registry)));
  });

  it('commits the codes a draft may still carry', () => {
    // An unfinished form saves; a broken one never does.
    const unfinished = checkForm(invalid('no-fields'), registry);
    expect(unfinished.some(isDraftBlocking)).toBe(false);
    expect(unfinished.some(isPublishBlocking)).toBe(true);
    for (const name of ['unsafe-consent-link', 'unsafe-redirect', 'unsafe-webhook']) {
      expect(checkForm(invalid(name), registry).some(isDraftBlocking), name).toBe(true);
    }
    // A path on the same site is a fine place to send a visitor.
    const relative = base({ after: { mode: 'redirect', redirectUrl: '/thank-you' } });
    expect(checkForm(relative, registry)).toEqual([]);
    expectFixture('draft.json', stable({ tolerates: FORM_DRAFT_TOLERATES }));
  });

  const valid: Record<string, FormDocument> = {
    'kitchen-sink': kitchenSink(),
    empty: createFormDocument({ name: 'Empty', title: 'Empty' }),
    ...Object.fromEntries(
      FORM_TEMPLATES.map((template) => [
        template.id,
        buildTemplateForm(registry, template, { stable: true }),
      ]),
    ),
  };

  it('commits valid fixtures the checker accepts', () => {
    for (const [name, doc] of Object.entries(valid)) {
      const issues = checkForm(doc, registry);
      if (name === 'empty') {
        // A new form: no question yet. A draft, not yet something to publish.
        expect(issues.map((issue) => issue.code).sort(), name).toEqual([
          'form.noFields',
          'step.empty',
        ]);
        expect(issues.some(isDraftBlocking), name).toBe(false);
      } else {
        expect(issues, name).toEqual([]);
      }
      expectFixture(`valid/${name}.json`, stable(doc));
    }
  });

  it('commits invalid fixtures, each refused with the codes the manifest names', () => {
    const manifest: Record<string, { errors: string[]; warnings: string[] }> = {};
    for (const [name, build] of INVALID) {
      const doc = build();
      const issues = checkForm(doc, registry);
      const codes = (severity: 'error' | 'warning') => [
        ...new Set(
          issues.filter((issue) => issue.severity === severity).map((issue) => issue.code),
        ),
      ];
      const errors = codes('error').sort();
      expect(errors.length, name).toBeGreaterThan(0);
      manifest[`${name}.json`] = { errors, warnings: codes('warning').sort() };
      expectFixture(`invalid/${name}.json`, stable(doc));
    }
    expectFixture('invalid/manifest.json', stable(manifest));
  });

  it('commits answer cases with the result validateAnswers gives', () => {
    const cases = ANSWER_CASES.map(({ name, form, answers, step: index }) => {
      const doc = typeof form === 'string' ? valid[form] : form;
      if (!doc)
        throw new Error(`${name}: no valid fixture "${typeof form === 'string' ? form : ''}"`);
      const expected = validateAnswers(doc, answers, index === undefined ? {} : { step: index });
      return { name, form, answers, ...(index === undefined ? {} : { step: index }), expected };
    });
    expect(cases.length).toBeGreaterThanOrEqual(25);
    expect(new Set(cases.map((one) => one.name)).size).toBe(cases.length);
    expectFixture('answers.json', stable({ cases }));
  });
});
