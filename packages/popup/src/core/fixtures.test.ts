import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { buildTemplatePopup, POPUP_TEMPLATES } from '../templates';
import { buildPopup, el, type FormatPatch } from './build';
import { displayHides, type ShowContext } from './display';
import {
  createPopupDocument,
  defaultDisplay,
  type PopupDisplay,
  type PopupDocument,
} from './document';
import { createPopupRegistry } from './elements';
import { toPopupJSONSchema } from './json-schema';
import { validateSubmission } from './submission';
import { checkPopup, isDraftBlocking, isPublishBlocking, POPUP_DRAFT_TOLERATES } from './validate';

/**
 * The CONTRACT with the server, as files.
 *
 * `schema/popup.schema.json` and `fixtures/` are committed, and this
 * package's alone: a backend in another language keeps a copy of them. Its
 * contract tests read them: every valid fixture must be accepted, every
 * invalid one refused with exactly the codes the manifest names, a draft
 * lenient on exactly the codes in `draft.json` — every case in
 * `submissions.json` must give exactly the result `validateSubmission` gives
 * here, and every case in `show.json` the reason `whyHidden` gives. This test
 * keeps the files honest — it regenerates them in memory and fails when the
 * committed copy differs. Run with `UPDATE_FIXTURES=1` to rewrite them after
 * an intentional change, and commit the result alongside the change.
 */

const registry = createPopupRegistry();
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

const expectFixture = (relative: string, content: string) => {
  expectFile(`fixtures/${relative}`, content);
};

/** Every element of a popup, each used the way it is meant to be. It passes every check. */
function kitchenSink(): PopupDocument {
  return buildPopup(
    registry,
    {
      meta: { name: 'Kitchen sink' },
      format: {
        type: 'modal',
        width: 560,
        height: 520,
        display: { pages: 'except', rules: ['/account/*'], frequency: 'days', days: 7 },
      },
      stable: true,
    },
    [
      el('rect', [0, 0, 560, 120], { fill: '#fdf1e9', radius: 0 }, { name: 'Band' }),
      el('ellipse', [480, 20, 60, 60], { fill: '', stroke: '#e06a1b', strokeWidth: 2 }),
      el('logo', [24, 24, 150, 30], { text: 'marrimauto', color: '#111827' }),
      el('icon', [24, 70, 28, 28], { name: 'gift', color: '#e06a1b' }),
      el('label', [64, 76, 300, 16], { text: 'FREE VALUATION', color: '#c2610c' }),
      el('heading', [24, 136, 512, 34], { text: 'Hello {{visitor.first_name}}!' }),
      el('text', [24, 176, 512, 44], {
        text: 'Your offer for {{page.title}} ends {{offer.ends}}.',
      }),
      el('image', [24, 228, 120, 80], {
        media: { key: 'popup-image/2026/11/car.jpg', width: 1200, height: 800 },
        alt: 'A grey estate car',
      }),
      el('qr', [164, 228, 80, 80], { data: 'https://example.com/app' }),
      el('countdown', [264, 240, 272, 52], { to: '2026-11-30T23:59' }),
      el('line', [24, 320, 512, 1]),
      el('input', [24, 336, 248, 44], {
        name: 'plate',
        label: 'Plate number',
        placeholder: 'AA 123 BC',
        kind: 'plate',
      }),
      el('input', [288, 336, 248, 44], {
        name: 'email',
        label: 'Email',
        kind: 'email',
        required: false,
      }),
      el('input', [24, 388, 248, 44], {
        name: 'phone',
        label: 'Phone',
        placeholder: '+355 69 …',
        kind: 'tel',
        required: false,
      }),
      el('input', [288, 388, 248, 44], {
        name: 'first_name',
        label: 'First name',
        placeholder: 'Ana',
        kind: 'text',
        required: false,
      }),
      el('button', [24, 444, 248, 46], { text: 'Send', action: 'submit', thanks: 'Thank you!' }),
      el('button', [288, 444, 248, 46], {
        text: 'How it works',
        fill: '#ffffff',
        color: '#111827',
        url: 'https://example.com/how',
        newTab: true,
      }),
      el('text', [24, 494, 512, 20], { text: 'Not now', align: 'center', action: 'close' }),
      el('close', [518, 12, 30, 30]),
    ],
  );
}

// ── invalid documents ────────────────────────────────────────────────────────

/** A small valid popup to break in one way per invalid fixture: `n1` the heading, `n2` the input, `n3` the button, `n4` the close. */
function base(format: FormatPatch = {}): PopupDocument {
  return buildPopup(registry, { meta: { name: 'Broken on purpose' }, format, stable: true }, [
    el('heading', [24, 24, 400, 34], { text: 'Sa vlen makina juaj?' }),
    el('input', [24, 80, 272, 44], { name: 'plate', label: 'Targa', kind: 'plate' }),
    el('button', [24, 136, 272, 46], { text: 'Vlerëso', action: 'submit' }),
    el('close', [478, 12, 30, 30]),
  ]);
}

function node(doc: PopupDocument, id: string) {
  const found = doc.nodes[id];
  if (!found) throw new Error(`base() lost ${id}`);
  return found;
}

const INVALID: [name: string, build: () => PopupDocument][] = [
  ['empty', () => createPopupDocument({ name: 'Nothing on it' })],
  [
    'no-close',
    () => {
      const doc = base({ motion: { outside: false, esc: false } });
      node(doc, 'n4').hidden = true;
      return doc;
    },
  ],
  [
    'close-hidden-by-setting',
    // A slide-in has no page behind it to click, so `outside` does not count.
    () => base({ type: 'slidein', width: 520, motion: { closeX: false, esc: false } }),
  ],
  [
    'link-missing',
    () => {
      const doc = base();
      Object.assign(node(doc, 'n1').props, { action: 'link', url: '  ' });
      return doc;
    },
  ],
  [
    'unsafe-button-link',
    () => {
      const doc = base();
      Object.assign(node(doc, 'n3').props, { action: 'link', url: 'javascript:alert(1)' });
      return doc;
    },
  ],
  [
    'unsafe-text-link',
    () => {
      const doc = base();
      Object.assign(node(doc, 'n1').props, { action: 'link', url: 'data:text/html,<b>x</b>' });
      return doc;
    },
  ],
  [
    'input-name-missing',
    () => {
      const doc = base();
      node(doc, 'n2').props.name = '';
      return doc;
    },
  ],
  [
    'input-name-duplicate',
    () => {
      const doc = base();
      node(doc, 'root').children?.push('n9');
      doc.nodes.n9 = { ...structuredClone(node(doc, 'n2')), id: 'n9' };
      return doc;
    },
  ],
  ['no-device', () => base({ display: { desktop: false, mobile: false } })],
  ['selector-missing', () => base({ display: { trigger: 'click', selector: ' ' } })],
  ['pages-missing', () => base({ display: { pages: 'only', rules: [''] } })],
  ['rule-invalid', () => base({ display: { pages: 'except', rules: ['/blog?page=2'] } })],
  ['dates-invalid', () => base({ display: { starts: '2026-12-01', ends: '2026-11-01' } })],
  [
    'missing-child',
    () => {
      const doc = base();
      node(doc, 'root').children?.push('n9');
      return doc;
    },
  ],
  [
    'orphan',
    () => {
      const doc = base();
      doc.nodes.n9 = { ...structuredClone(node(doc, 'n4')), id: 'n9' };
      return doc;
    },
  ],
  [
    'unknown-element',
    () => {
      const doc = base();
      node(doc, 'root').children?.push('n9');
      doc.nodes.n9 = { id: 'n9', type: 'marquee', v: 1, props: {} };
      return doc;
    },
  ],
  [
    'frame-missing',
    () => {
      const doc = base();
      Reflect.deleteProperty(node(doc, 'n1').props, 'frame');
      return doc;
    },
  ],
  [
    'props-wrong-type',
    () => {
      const doc = base();
      node(doc, 'n2').props.required = 'yes';
      return doc;
    },
  ],
  [
    'name-malformed',
    () => {
      const doc = base();
      node(doc, 'n2').props.name = 'Plate Number';
      return doc;
    },
  ],
  [
    'format-malformed',
    () => {
      const doc = base();
      node(doc, 'root').props.width = 50;
      return doc;
    },
  ],
  ['not-a-popup', () => ({ ...base(), schema: 'form/document' as PopupDocument['schema'] })],
  [
    'translation-too-long',
    () => {
      const doc = base();
      doc.i18n = {
        enabled: true,
        base: 'sq',
        translations: { en: { nodes: { n2: { placeholder: 'x'.repeat(121) } } } },
      };
      return doc;
    },
  ],
  /** Every warning the checker has, and one error so the document is refused. */
  [
    'every-warning',
    () =>
      buildPopup(
        registry,
        {
          meta: { name: 'Every warning' },
          format: { display: { trigger: 'load', frequency: 'every' } },
          stable: true,
        },
        [
          el('heading', [24, 24, 400, 34], { text: 'Hello {{customer.name}}' }),
          el('input', [24, 80, 272, 44], { name: 'email', label: ' ', placeholder: '' }),
          el('image', [24, 140, 120, 80], { media: { key: 'popup-image/a.jpg' }, alt: '' }),
          el('rect', [600, 0, 40, 40]),
          el('button', [24, 240, 200, 44], { text: 'Go', action: 'link', url: '' }),
          el('close', [478, 12, 30, 30]),
        ],
      ),
  ],
];

function invalid(name: string): PopupDocument {
  const found = INVALID.find(([candidate]) => candidate === name);
  if (!found) throw new Error(`no invalid fixture "${name}"`);
  return found[1]();
}

// ── submissions ──────────────────────────────────────────────────────────────

interface SubmissionCase {
  name: string;
  /** A valid fixture's name. */
  popup: string;
  values: unknown;
}

const good = () => ({ plate: 'AA 123 BC', email: 'ana@example.com', phone: '+355 69 123 4567' });

const SUBMISSION_CASES: SubmissionCase[] = [
  { name: 'everything right', popup: 'kitchen-sink', values: good() },
  { name: 'nothing sent: the required plate', popup: 'kitchen-sink', values: {} },
  { name: 'not an object of answers', popup: 'kitchen-sink', values: ['AA 123 BC'] },
  { name: 'null', popup: 'kitchen-sink', values: null },
  {
    name: 'blank strings are no answer',
    popup: 'kitchen-sink',
    values: { plate: '   ', email: ' ', first_name: '' },
  },
  {
    name: 'answers are trimmed; names the popup does not ask are dropped',
    popup: 'kitchen-sink',
    values: { ...good(), plate: '  TR-482-KL ', first_name: ' Ana ', utm_source: 'mail' },
  },
  {
    name: 'an email in the wrong shape',
    popup: 'kitchen-sink',
    values: { ...good(), email: 'ana@example' },
  },
  {
    name: 'a phone in the wrong shape',
    popup: 'kitchen-sink',
    values: { ...good(), phone: '06x 123' },
  },
  {
    name: 'plates: letters and digits, single spaces or hyphens between',
    popup: 'kitchen-sink',
    values: { ...good(), plate: 'AA  123' },
  },
  { name: 'a plate of one character', popup: 'kitchen-sink', values: { ...good(), plate: 'A' } },
  {
    name: 'a plate too long',
    popup: 'kitchen-sink',
    values: { ...good(), plate: 'ABCDEFGHIJKLM' },
  },
  {
    name: 'a plate with a letter outside ASCII',
    popup: 'kitchen-sink',
    values: { ...good(), plate: 'ÇA 123 BC' },
  },
  { name: 'a number is not text', popup: 'kitchen-sink', values: { ...good(), first_name: 42 } },
  { name: 'false is not text', popup: 'kitchen-sink', values: { ...good(), email: false } },
  {
    name: 'too long, in UTF-16 units as the browser counts',
    popup: 'kitchen-sink',
    values: { ...good(), first_name: '😀'.repeat(251) },
  },
  {
    name: 'just long enough',
    popup: 'kitchen-sink',
    values: { ...good(), first_name: '😀'.repeat(250) },
  },
  {
    name: 'a name like an Object member is an ordinary name',
    popup: 'kitchen-sink',
    values: { ...good(), constructor: 'x', toString: 'y' },
  },
];

// ── display rules ────────────────────────────────────────────────────────────

interface ShowCase {
  name: string;
  display: Partial<PopupDisplay>;
  context: ShowContext;
}

const NOW = Date.UTC(2026, 10, 20, 12, 0);
const DAY = 86_400_000;
const at = (context: Partial<ShowContext> = {}): ShowContext => ({
  path: '/',
  device: 'desktop',
  now: NOW,
  today: '2026-11-20',
  ...context,
});

const SHOW_CASES: ShowCase[] = [
  { name: 'the defaults, a first visit', display: {}, context: at() },
  {
    name: 'desktop only, on a phone',
    display: { mobile: false },
    context: at({ device: 'mobile' }),
  },
  { name: 'phones only, on a desktop', display: { desktop: false }, context: at() },
  { name: 'before it starts', display: { starts: '2026-11-21' }, context: at() },
  { name: 'on its first day', display: { starts: '2026-11-20' }, context: at() },
  { name: 'on its last day', display: { ends: '2026-11-20' }, context: at() },
  { name: 'after it ends', display: { ends: '2026-11-19' }, context: at() },
  {
    name: 'only on listed pages: listed',
    display: { pages: 'only', rules: ['/vleresim'] },
    context: at({ path: '/vleresim/?utm=x#top' }),
  },
  {
    name: 'only on listed pages: not listed',
    display: { pages: 'only', rules: ['/vleresim'] },
    context: at({ path: '/vleresim/hapi-2' }),
  },
  {
    name: 'a wildcard takes any part, slashes too',
    display: { pages: 'only', rules: ['/blog/*'] },
    context: at({ path: '/blog/2026/makina-elektrike' }),
  },
  {
    name: 'a wildcard after a slash needs something there',
    display: { pages: 'only', rules: ['/blog/*'] },
    context: at({ path: '/blog' }),
  },
  {
    name: 'a wildcard in the middle',
    display: { pages: 'only', rules: ['/*/oferta'] },
    context: at({ path: '/tirane/oferta' }),
  },
  {
    name: 'paths are case-sensitive',
    display: { pages: 'only', rules: ['/Blog'] },
    context: at({ path: '/blog' }),
  },
  {
    name: 'a rule without its leading slash',
    display: { pages: 'only', rules: ['kontakt'] },
    context: at({ path: '/kontakt' }),
  },
  {
    name: 'dots and brackets are themselves',
    display: { pages: 'only', rules: ['/a.b(c)'] },
    context: at({ path: '/axb(c)' }),
  },
  {
    name: 'all except listed: listed',
    display: { pages: 'except', rules: ['/vleresim', '/llogaria/*'] },
    context: at({ path: '/llogaria/profili' }),
  },
  {
    name: 'all except listed: elsewhere',
    display: { pages: 'except', rules: ['/vleresim', '/llogaria/*'] },
    context: at({ path: '/makina' }),
  },
  {
    name: 'the home page is /',
    display: { pages: 'only', rules: ['/'] },
    context: at({ path: '' }),
  },
  { name: 'new visitors, a new one', display: { audience: 'new' }, context: at() },
  {
    name: 'new visitors, a returning one',
    display: { audience: 'new' },
    context: at({ returning: true }),
  },
  { name: 'returning visitors, a new one', display: { audience: 'returning' }, context: at() },
  {
    name: 'one language, the page in it',
    display: { language: 'sq' },
    context: at({ language: 'sq-AL' }),
  },
  {
    name: 'one language, the page in another',
    display: { language: 'sq' },
    context: at({ language: 'en' }),
  },
  { name: 'one language, the page’s unknown', display: { language: 'de' }, context: at() },
  {
    name: 'a region asks for that region',
    display: { language: 'pt-BR' },
    context: at({ language: 'pt-PT' }),
  },
  {
    name: 'every visit: shown again',
    display: { frequency: 'every' },
    context: at({ seen: { shownAt: NOW - 1000, closedAt: NOW - 500 }, session: 's1' }),
  },
  {
    name: 'once a session: this session',
    display: { frequency: 'session' },
    context: at({ seen: { shownAt: NOW - 1000, session: 's1' }, session: 's1' }),
  },
  {
    name: 'once a session: a new session',
    display: { frequency: 'session' },
    context: at({ seen: { shownAt: NOW - 1000, session: 's1' }, session: 's2' }),
  },
  {
    name: 'every seven days: six days on',
    display: { frequency: 'days', days: 7 },
    context: at({ seen: { shownAt: NOW - 6 * DAY } }),
  },
  {
    name: 'every seven days: seven days on',
    display: { frequency: 'days', days: 7 },
    context: at({ seen: { shownAt: NOW - 7 * DAY } }),
  },
  {
    name: 'until closed: shown, not closed',
    display: { frequency: 'until' },
    context: at({ seen: { shownAt: NOW - 1000 } }),
  },
  {
    name: 'until closed: closed',
    display: { frequency: 'until' },
    context: at({ seen: { shownAt: NOW - 1000, closedAt: NOW - 900 } }),
  },
  {
    name: 'filled in: never asked again',
    display: { frequency: 'days', days: 1 },
    context: at({ seen: { shownAt: NOW - 30 * DAY, submittedAt: NOW - 30 * DAY } }),
  },
  {
    name: 'the first rule that hides it is the reason',
    display: { mobile: false, ends: '2026-01-01', audience: 'returning' },
    context: at({ device: 'mobile' }),
  },
];

describe('the server contract', () => {
  it('commits the JSON Schema of the standard document', () => {
    expectFile('schema/popup.schema.json', stable(toPopupJSONSchema(registry)));
  });

  it('commits the codes a draft may still carry', () => {
    // An unfinished popup saves; a broken one never does.
    const unfinished = checkPopup(invalid('empty'), registry);
    expect(unfinished.some(isDraftBlocking)).toBe(false);
    expect(unfinished.some(isPublishBlocking)).toBe(true);
    for (const name of ['unsafe-button-link', 'unsafe-text-link']) {
      expect(checkPopup(invalid(name), registry).some(isDraftBlocking), name).toBe(true);
    }
    expectFixture('draft.json', stable({ tolerates: POPUP_DRAFT_TOLERATES }));
  });

  const valid: Record<string, PopupDocument> = {
    'kitchen-sink': kitchenSink(),
    ...Object.fromEntries(
      POPUP_TEMPLATES.map((template) => [
        template.id,
        buildTemplatePopup(registry, template, { stable: true }),
      ]),
    ),
  };

  it('commits valid fixtures the checker accepts', () => {
    for (const [name, doc] of Object.entries(valid)) {
      expect(checkPopup(doc, registry), name).toEqual([]);
      expectFixture(`valid/${name}.json`, stable(doc));
    }
  });

  it('commits invalid fixtures, each refused with the codes the manifest names', () => {
    const manifest: Record<string, { errors: string[]; warnings: string[] }> = {};
    for (const [name, build] of INVALID) {
      const issues = checkPopup(build(), registry);
      const codes = (severity: 'error' | 'warning') => [
        ...new Set(
          issues.filter((issue) => issue.severity === severity).map((issue) => issue.code),
        ),
      ];
      const errors = codes('error').sort();
      expect(errors.length, name).toBeGreaterThan(0);
      manifest[`${name}.json`] = { errors, warnings: codes('warning').sort() };
      expectFixture(`invalid/${name}.json`, stable(build()));
    }
    expectFixture('invalid/manifest.json', stable(manifest));
  });

  it('commits submission cases with the result validateSubmission gives', () => {
    const cases = SUBMISSION_CASES.map(({ name, popup, values }) => {
      const doc = valid[popup];
      if (!doc) throw new Error(`${name}: no valid fixture "${popup}"`);
      return { name, popup, values, expected: validateSubmission(doc, values) };
    });
    expect(new Set(cases.map((one) => one.name)).size).toBe(cases.length);
    expectFixture('submissions.json', stable({ cases }));
  });

  it('commits display cases with the reason whyHidden gives', () => {
    const cases = SHOW_CASES.map(({ name, display, context }) => {
      const full = { ...defaultDisplay(), ...display };
      return { name, display: full, context, expected: displayHides(full, context) };
    });
    expect(new Set(cases.map((one) => one.name)).size).toBe(cases.length);
    // Every reason is exercised, and so is showing.
    expect(new Set(cases.map((one) => one.expected))).toEqual(
      new Set([null, 'device', 'dates', 'pages', 'audience', 'language', 'frequency']),
    );
    expectFixture('show.json', stable({ cases }));
  });
});
