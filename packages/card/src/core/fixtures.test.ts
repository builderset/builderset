import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { buildTemplateCard, CARD_TEMPLATES } from '../templates';
import { buildCard, el, side, type BuildCardOptions } from './build';
import { EXAMPLE_MEMBERS, type CardField } from './data';
import { createCardDocument, type CardDocument } from './document';
import { createCardRegistry } from './elements';
import { fieldsUsed, fillCard } from './fill';
import { toCardJSONSchema } from './json-schema';
import { CARD_DRAFT_TOLERATES, checkCard, isDraftBlocking, isPrintBlocking } from './validate';

/**
 * The CONTRACT with the server, as files.
 *
 * `schema/card.schema.json` and `fixtures/` are committed, and this package's
 * alone: a backend in another language keeps a copy of them. Its contract
 * tests read them: every valid fixture must be accepted, every invalid one
 * refused with exactly the codes the manifest names, a draft lenient on
 * exactly the codes in `draft.json`, and every case in `fields.json` checked
 * against a host's own member fields with exactly the issues it names, and
 * every case in `filled.json` filled in for its member exactly so. This
 * test keeps the files honest — it regenerates them in memory and fails when
 * the committed copy differs. Run with `UPDATE_FIXTURES=1` to rewrite them
 * after an intentional change, and commit the result alongside the change.
 */

const registry = createCardRegistry();
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

const media = { key: 'card-image/2026/11/pattern.png', width: 1200, height: 800 };

/** Every element of a card, on a bank card. It passes every check: no errors, no warnings. */
function kitchenSink(): CardDocument {
  return buildCard(registry, {
    meta: { name: 'Kitchen sink' },
    format: 'bank',
    card: { source: 'Anëtarët aktivë', print: { quantity: 500 } },
    stable: true,
    front: side('#111827', [
      el('ellipse', [57, -18, 50, 50], { fill: '#e06a1b' }, { name: 'Orange circle' }),
      el('ellipse', [65, -10, 33, 33], {
        fill: '',
        stroke: '#ffffff',
        strokeWidth: 0.25,
        opacity: 0.35,
      }),
      el('rect', [-3, 46, 91.6, 11], { fill: '#1f2937', radius: 0 }, { name: 'Bottom band' }),
      el('logo', [4, 3.7, 27, 5]),
      el('icon', [50, 4, 5, 5], { name: 'car', color: '#ffffff' }),
      el('heading', [4, 10, 40, 6], { text: 'Klubi', size: 10, color: '#ffffff' }),
      el('chip', [10.25, 19.23, 11, 9]),
      el('label', [32, 18, 27, 3], { text: 'Anëtari', size: 6 }),
      el('field', [32, 21.5, 30, 5.7], { text: '{{member.name}}', size: 9, color: '#ffffff' }),
      el(
        'text',
        [4, 33, 20, 4.7],
        {
          text: '{{member.tier}}',
          size: 6.5,
          weight: 700,
          align: 'center',
          valign: 'middle',
          upper: true,
          color: '#111827',
          background: '#ffffff',
          backgroundRadius: 2.3,
        },
        { name: 'Tier' },
      ),
      el('line', [4, 40, 30, 0.3]),
      el('nfc', [58, 41.7, 3.7, 3.7], { color: '#9ca3af' }),
      el('image', [36, 38, 10, 7], { media, fit: 'contain' }),
      el('photo', [67.6, 30.6, 14, 17.3]),
      el('text', [4, 42, 30, 4], { text: 'Hidden note', size: 7 }, { hidden: true }),
    ]),
    back: side('#ffffff', [
      el('stripe', [0, 5.54, 85.6, 12.7]),
      el('qr', [4, 20, 16, 16], { data: '{{member.qr}}' }),
      el('qr', [64, 20, 16, 16], { data: 'https://marrimauto.com/k/{{member.qr}}', level: 'Q' }),
      el('barcode', [23, 21, 38, 7], { data: '{{member.number}}' }),
      el('sign', [23, 30, 38, 6]),
      el('text', [4, 39, 77, 8], {
        text: 'Karta është personale. Nëse e gjeni, kthejeni në marrimauto.com.',
        size: 6.5,
        color: '#6b7280',
      }),
    ]),
  });
}

// ── invalid documents ────────────────────────────────────────────────────────

/** A small valid card to break in one way per invalid fixture: `n1` a field on the front, `n2` a QR code on the back. */
function base(options: Partial<BuildCardOptions> = {}): CardDocument {
  return buildCard(registry, {
    meta: { name: 'Broken on purpose' },
    stable: true,
    front: side('#111827', [el('field', [5, 20, 50, 6], { text: '{{member.name}}', size: 9 })]),
    back: side('#ffffff', [el('qr', [5, 5, 20, 20])]),
    ...options,
  });
}

function node(doc: CardDocument, id: string) {
  const found = doc.nodes[id];
  if (!found) throw new Error(`base() lost ${id}`);
  return found;
}

const INVALID: [name: string, build: () => CardDocument][] = [
  [
    'unsafe-qr-link',
    () => {
      const doc = base();
      node(doc, 'n2').props.data = 'javascript:alert(document.cookie)';
      return doc;
    },
  ],
  [
    'unsafe-qr-hidden-scheme',
    () => {
      const doc = base();
      node(doc, 'n2').props.data = ' java\tscript:alert(1)';
      return doc;
    },
  ],
  [
    'unsafe-qr-data-url',
    () => {
      const doc = base();
      node(doc, 'n2').props.data = 'DATA:text/html,<script>alert(1)</script>';
      return doc;
    },
  ],
  [
    'unknown-variable',
    () => {
      const doc = base();
      node(doc, 'n1').props.text = '{{member.nickname}} · {{ member.name }}';
      return doc;
    },
  ],
  [
    'photo-unknown-field',
    () => {
      const doc = base();
      node(doc, 'front').children?.push('n9');
      doc.nodes.n9 = {
        id: 'n9',
        type: 'photo',
        v: 1,
        props: {
          ...registry.require('photo').defaults(),
          frame: { x: 60, y: 20, w: 14, h: 17, r: 0 },
          bind: 'member.name',
        },
      };
      return doc;
    },
  ],
  [
    'element-in-root',
    () => {
      const doc = base();
      node(doc, 'root').children?.push('n9');
      doc.nodes.n9 = { id: 'n9', type: 'chip', v: 1, props: registry.require('chip').defaults() };
      return doc;
    },
  ],
  [
    'side-in-side',
    () => {
      const doc = base();
      node(doc, 'front').children?.push('n9');
      doc.nodes.n9 = {
        id: 'n9',
        type: 'side',
        v: 1,
        props: registry.require('side').defaults(),
        children: [],
      };
      return doc;
    },
  ],
  [
    'one-side',
    () => {
      const doc = base();
      node(doc, 'root').children = ['front'];
      Reflect.deleteProperty(doc.nodes, 'back');
      Reflect.deleteProperty(doc.nodes, 'n2');
      return doc;
    },
  ],
  [
    'two-fronts',
    () => {
      const doc = base();
      node(doc, 'back').props.face = 'front';
      return doc;
    },
  ],
  [
    'unknown-element',
    () => {
      const doc = base();
      node(doc, 'front').children?.push('n9');
      doc.nodes.n9 = { id: 'n9', type: 'hologram', v: 1, props: {} };
      return doc;
    },
  ],
  [
    'missing-child',
    () => {
      const doc = base();
      node(doc, 'front').children?.push('n9');
      return doc;
    },
  ],
  [
    'orphan',
    () => {
      const doc = base();
      doc.nodes.n9 = { ...structuredClone(node(doc, 'n1')), id: 'n9' };
      return doc;
    },
  ],
  [
    'props-wrong-type',
    () => {
      const doc = base();
      node(doc, 'n1').props.size = 'big';
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
    'frame-negative-width',
    () => {
      const doc = base();
      node(doc, 'n2').props.frame = { x: 5, y: 5, w: -1, h: 20, r: 0 };
      return doc;
    },
  ],
  [
    'unplaced',
    () => {
      // Saved before the editor gave it a size: never printed, worth saying.
      const doc = base();
      node(doc, 'n2').props.frame = { x: 0, y: 0, w: 0, h: 0, r: 0 };
      node(doc, 'n1').props.text = '{{member.alias}}';
      return doc;
    },
  ],
  [
    'format-malformed',
    () => {
      const doc = base();
      const root = node(doc, 'root');
      root.props = { ...root.props, width: 5, sides: 3 };
      return doc;
    },
  ],
  [
    'print-malformed',
    () => {
      const doc = base();
      const root = node(doc, 'root');
      root.props = { ...root.props, print: { ...(root.props.print as object), dpi: 150 } };
      return doc;
    },
  ],
  [
    'not-a-card',
    () => {
      const doc = base();
      return { ...doc, schema: 'form/document' } as unknown as CardDocument;
    },
  ],
  [
    'translation-too-long',
    () => {
      const doc = base();
      doc.i18n = {
        enabled: true,
        base: 'sq',
        translations: { en: { nodes: { n1: { text: 'x'.repeat(501) } } } },
      };
      return doc;
    },
  ],
  [
    'every-warning',
    () => {
      // Each warning once, and one error so the case is refused.
      const doc = buildCard(registry, {
        meta: { name: ' ' },
        format: 'bank',
        stable: true,
        front: side('#ffffff', [
          el('field', [1, 1, 40, 5], { text: '{{member.name}}', size: 9 }),
          el('text', [10, 20, 40, 4], { text: 'Tiny {{member.age}}', size: 4.5 }),
          el('qr', [50, 20, 12, 12]),
          el('barcode', [10, 30, 40, 8], { data: 'Kodi ë {{member.number}}' }),
          el('barcode', [10, 40, 40, 8], { data: '  ' }),
          el('image', [60, 35, 10, 10]),
          el('label', [20, 49, 30, 3.4, 30], { text: 'Rotated', size: 6 }),
        ]),
        back: side('#ffffff', []),
      });
      return doc;
    },
  ],
];

function invalid(name: string): CardDocument {
  const found = INVALID.find(([which]) => which === name);
  if (!found) throw new Error(`No invalid fixture "${name}"`);
  return found[1]();
}

// ── a host's own member fields ───────────────────────────────────────────────

const GYM_FIELDS: CardField[] = [
  { path: 'member.name', label: { en: 'Name' }, kind: 'text' },
  { path: 'member.plan', label: { en: 'Plan' }, kind: 'text' },
  { path: 'member.avatar', label: { en: 'Picture' }, kind: 'photo' },
];

function gymCard(): CardDocument {
  return buildCard(registry, {
    meta: { name: 'Gym pass' },
    stable: true,
    card: { sides: 1 },
    front: side('#0f172a', [
      el('field', [5, 8, 50, 6], { text: '{{member.name}}', size: 10 }),
      el('field', [5, 16, 50, 6], { text: 'Plan: {{member.plan}}', size: 8 }),
      el('photo', [62, 8, 18, 22], { bind: 'member.avatar' }),
      el('qr', [5, 25, 18, 18], { data: '{{member.number}}' }),
    ]),
  });
}

const FIELD_CASES = [
  { name: 'the default fields: the gym card names two unknown', card: 'gym', fields: null },
  { name: 'the gym fields: only member.number is unknown', card: 'gym', fields: GYM_FIELDS },
  {
    name: 'the gym fields: the kitchen sink is mostly unknown',
    card: 'kitchen-sink',
    fields: GYM_FIELDS,
  },
  { name: 'no fields at all: every variable is unknown', card: 'gym', fields: [] },
];

describe('the server contract', () => {
  it('commits the JSON Schema of the standard document', () => {
    expectFile('schema/card.schema.json', stable(toCardJSONSchema(registry)));
  });

  it('commits the codes a draft may still carry', () => {
    const unfinished = checkCard(invalid('unknown-variable'), registry);
    expect(checkCard(invalid('unplaced'), registry).some(isDraftBlocking)).toBe(false);
    expect(unfinished.some(isDraftBlocking)).toBe(false);
    expect(unfinished.some(isPrintBlocking)).toBe(true);
    for (const name of ['unsafe-qr-link', 'unsafe-qr-hidden-scheme', 'unsafe-qr-data-url']) {
      expect(checkCard(invalid(name), registry).some(isDraftBlocking), name).toBe(true);
    }
    expectFixture('draft.json', stable({ tolerates: CARD_DRAFT_TOLERATES }));
  });

  const oneSided = buildCard(registry, {
    meta: { name: 'One side' },
    card: { sides: 1 },
    stable: true,
    front: side('#e06a1b', [el('logo', [10, 20, 40, 8], { size: 14 })]),
    // The back is kept, unprinted: an empty one is not reported.
    back: side('#ffffff', []),
  });
  const wallet = buildCard(registry, {
    meta: { name: 'Wallet' },
    format: 'wallet',
    stable: true,
    // Shown on a phone, never cut: there is no safe area to keep to.
    front: side('#111827', [el('logo', [1, 1, 30, 6], { size: 12 })]),
    back: side('#111827', [
      el('qr', [0.5, 0.5, 30, 30], { data: 'https://marrimauto.com/k/MA02481173' }),
    ]),
  });

  const gym = gymCard();
  const valid: Record<string, CardDocument> = {
    'kitchen-sink': kitchenSink(),
    empty: createCardDocument({ meta: { name: 'Empty' } }),
    'one-sided': oneSided,
    'wallet-edge-to-edge': wallet,
    gym,
    ...Object.fromEntries(
      CARD_TEMPLATES.map((template) => [
        template.id,
        buildTemplateCard(registry, template, { stable: true }),
      ]),
    ),
  };

  it('commits valid fixtures the checker accepts', () => {
    for (const [name, doc] of Object.entries(valid)) {
      if (name === 'gym') continue; // checked against its own fields below
      const issues = checkCard(doc, registry);
      if (name === 'empty') {
        // A new card: nothing on it yet. A draft, not yet something to print.
        expect(issues.map((issue) => issue.code).sort(), name).toEqual([
          'side.empty',
          'side.empty',
        ]);
        expect(issues.some(isDraftBlocking), name).toBe(false);
      } else {
        expect(issues, name).toEqual([]);
      }
      expectFixture(`valid/${name}.json`, stable(doc));
    }
    expect(checkCard(gym, registry, { fields: GYM_FIELDS }).map((issue) => issue.code)).toEqual([
      'variable.unknown',
    ]);
    expectFixture('valid/gym.json', stable(gym));
  });

  it('commits invalid fixtures, each refused with the codes the manifest names', () => {
    const manifest: Record<string, { errors: string[]; warnings: string[] }> = {};
    for (const [name, build] of INVALID) {
      const doc = build();
      const issues = checkCard(doc, registry);
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
    expect(manifest['every-warning.json']?.warnings).toEqual([
      'barcode.unencodable',
      'card.chipMissing',
      'card.outsideSafe',
      'card.qrTooSmall',
      'card.textTooSmall',
      'code.empty',
      'image.missing',
      'meta.nameMissing',
      'side.empty',
    ]);
    expect(manifest['unplaced.json']?.warnings).toEqual(['frame.unplaced']);
    expectFixture('invalid/manifest.json', stable(manifest));
  });

  it('commits cases checked against a host’s own fields', () => {
    const cases = FIELD_CASES.map(({ name, card, fields }) => {
      const doc = valid[card];
      if (!doc) throw new Error(`${name}: no valid fixture "${card}"`);
      const issues = checkCard(doc, registry, fields ? { fields } : {});
      return {
        name,
        card,
        fields,
        issues: issues.map((issue) => ({
          code: issue.code,
          severity: issue.severity,
          nodeId: issue.nodeId ?? null,
          path: issue.path ?? null,
          params: issue.params ?? {},
        })),
      };
    });
    expectFixture('fields.json', stable({ cases }));
  });

  it('commits cards filled in for a member, and the fields each design uses', () => {
    const cases = [
      ['kitchen-sink', 1],
      ['gold-membership', 0],
      ['member-badge', 2],
    ].map(([card, member]) => {
      const doc = valid[card as string];
      const record = EXAMPLE_MEMBERS[member as number];
      if (!doc || !record) throw new Error(`no fixture "${String(card)}"`);
      return { card, record, fields: fieldsUsed(doc), filled: fillCard(doc, record) };
    });
    // A record without a value leaves the variable as written.
    const partial = { 'member.name': 'Ana' };
    cases.push({
      card: 'gym',
      record: partial,
      fields: fieldsUsed(gym),
      filled: fillCard(gym, partial),
    });
    expectFixture('filled.json', stable({ cases }));
  });
});
