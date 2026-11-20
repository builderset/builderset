import { describe, expect, it } from 'vitest';

import { buildCard, el, side } from './build';
import { CARD_FIELDS, EXAMPLE_MEMBERS, fieldLabel, fillText, variablesIn } from './data';
import { fieldsUsed, fillCard } from './fill';
import { createCardDocument, type CardDocument } from './document';
import { cardSizeOf, createCardRegistry } from './elements';
import { CARD_FORMATS, formatSpec, ISO_ID1 } from './formats';
import { isUnsafeCodeLink, unencodableChars } from './rules';
import { mmToPt, mmToPx, ptToMm, pxToMm } from './units';
import { checkCard, elementsOf, formatOf, parseCard, printedFaces, sideOf } from './validate';

const registry = createCardRegistry();
const codes = (doc: CardDocument) => checkCard(doc, registry).map((issue) => issue.code);

/** One element on the front of an otherwise empty-backed, one-sided card. */
function one(
  type: string,
  frame: [number, number, number, number, number?],
  props: Record<string, unknown> = {},
) {
  return buildCard(registry, {
    meta: { name: 'Test' },
    card: { sides: 1 },
    stable: true,
    front: side('#ffffff', [el(type, frame, props)]),
  });
}

describe('units', () => {
  it('converts points, millimetres and pixels', () => {
    expect(ptToMm(72)).toBeCloseTo(25.4);
    expect(mmToPt(ptToMm(6))).toBeCloseTo(6);
    expect(Math.round(mmToPx(ISO_ID1.width, 300))).toBe(1011);
    expect(pxToMm(96)).toBeCloseTo(25.4);
  });
});

describe('formats', () => {
  it('follow ISO ID-1, a business card is square-cornered, a badge is ID-1 standing up', () => {
    expect(formatSpec('bank')).toMatchObject({
      width: 85.6,
      height: 53.98,
      radius: 3.18,
      print: true,
    });
    expect(formatSpec('business')).toMatchObject({ width: 85, height: 55, radius: 0 });
    expect(formatSpec('badge')).toMatchObject({ width: 53.98, height: 85.6 });
    expect(formatSpec('wallet').print).toBe(false);
    expect(CARD_FORMATS.map((format) => format.id)).toHaveLength(7);
  });

  it('sizes a new chip at its ISO spot and a stripe as wide as the card', () => {
    expect(cardSizeOf('chip')).toEqual({ x: 10.25, y: 19.23, w: 11, h: 9 });
    expect(cardSizeOf('stripe', 90)).toMatchObject({ x: 0, y: 5.54, w: 90 });
    expect(cardSizeOf('a-host-element')).toEqual({ w: 20, h: 20 });
  });
});

describe('member data', () => {
  it('finds and fills variables, leaving unknown ones as written', () => {
    expect(variablesIn('{{member.name}} · {{ member.tier }} · {{nope')).toEqual([
      'member.name',
      'member.tier',
    ]);
    const record = { 'member.name': 'Arben Hoxha' };
    expect(fillText('Hi {{ member.name }}, {{member.tier}}', record)).toBe(
      'Hi Arben Hoxha, {{member.tier}}',
    );
    expect(fillText('{{member.name}}', null)).toBe('{{member.name}}');
    // A key named like an Object member is an ordinary, absent key.
    expect(fillText('{{constructor}}', record)).toBe('{{constructor}}');
  });

  it('labels a field in a language, English as the fallback', () => {
    const name = CARD_FIELDS[0];
    if (!name) throw new Error('no fields');
    expect(fieldLabel(name, 'sq-AL')).toBe('Emri');
    expect(fieldLabel(name, 'fr')).toBe('Name');
  });
});

describe('a member’s card', () => {
  const doc = buildCard(registry, {
    meta: { name: 'Issued' },
    stable: true,
    front: side('#111827', [
      el('field', [5, 5, 40, 5], { text: '{{member.name}} · {{member.tier}}' }),
      el('photo', [60, 5, 14, 17]),
      el('text', [5, 20, 40, 5], { text: '{{member.since}}' }, { hidden: true }),
    ]),
    back: side('#ffffff', [
      el('qr', [5, 5, 20, 20]),
      el('barcode', [30, 5, 40, 8], { data: '{{member.number}}' }),
    ]),
  });

  it('lists the fields a design uses on its printed sides', () => {
    expect(fieldsUsed(doc)).toEqual([
      'member.name',
      'member.tier',
      'member.photo',
      'member.qr',
      'member.number',
    ]);
  });

  it('writes one member’s data into a copy, as the renderer would draw it', () => {
    const member = EXAMPLE_MEMBERS[0] ?? {};
    const filled = fillCard(doc, member);
    expect(filled.nodes.n1?.props.text).toBe('Arben Hoxha · Gold');
    expect(filled.nodes.n4?.props.data).toBe('MA02481173');
    expect(filled.nodes.n5?.props.data).toBe('MA 0248 1173');
    expect(filled.nodes.n2?.props.bind).toBe('member.photo');
    expect(doc.nodes.n1?.props.text).toBe('{{member.name}} · {{member.tier}}');
    expect(fieldsUsed(filled)).toEqual(['member.photo']);
    expect(checkCard(filled, registry)).toEqual([]);
  });
});

describe('the document', () => {
  it('starts with a front and a back, both empty, both printed', () => {
    const doc = createCardDocument({ meta: { name: 'New' }, format: 'badge' });
    expect(formatOf(doc)).toMatchObject({ format: 'badge', width: 53.98, height: 85.6, sides: 2 });
    expect(sideOf(doc, 'back')?.id).toBe('back');
    expect(printedFaces(doc)).toEqual(['front', 'back']);
    expect(parseCard(doc, registry)).toBe(doc);
    expect(parseCard({ ...doc, root: 'card' }, registry)).toBeNull();
  });

  it('builds from an outline and refuses props an element would not take', () => {
    const doc = one('qr', [5, 5, 20, 20]);
    expect(elementsOf(doc, 'front').map((node) => node.type)).toEqual(['qr']);
    expect(() => one('qr', [5, 5, 20, 20], { level: 'X' })).toThrow(/Invalid props for "qr"/);
  });
});

describe('checkCard', () => {
  it('keeps words and codes inside the safe area, rotation included', () => {
    expect(codes(one('field', [3, 3, 40, 5], { size: 8 }))).toEqual([]);
    expect(codes(one('field', [2.9, 3, 40, 5], { size: 8 }))).toEqual(['card.outsideSafe']);
    // Upright it fits; turned a quarter it reaches past the bottom.
    expect(codes(one('label', [20, 40, 30, 3], { size: 6 }))).toEqual([]);
    expect(codes(one('label', [20, 40, 30, 3, 90], { size: 6 }))).toEqual(['card.outsideSafe']);
    // Shapes may bleed; a safe margin of 0 checks nothing.
    expect(codes(one('rect', [-3, -3, 100, 70]))).toEqual([]);
    const noMargin = one('field', [0, 0, 40, 5], { size: 8 });
    const root = noMargin.nodes.root;
    if (root) root.props = { ...root.props, print: { ...(root.props.print as object), safe: 0 } };
    expect(codes(noMargin)).toEqual([]);
  });

  it('holds type to 6 pt and QR codes to 15 mm', () => {
    expect(codes(one('text', [10, 10, 30, 5], { size: 5.9 }))).toEqual(['card.textTooSmall']);
    expect(codes(one('text', [10, 10, 30, 5], { size: 6 }))).toEqual([]);
    const small = checkCard(one('qr', [10, 10, 14.9, 20]), registry);
    expect(small).toEqual([
      {
        severity: 'warning',
        code: 'card.qrTooSmall',
        nodeId: 'n1',
        path: 'frame',
        params: { face: 'front', size: 14.9 },
      },
    ]);
  });

  it('skips hidden elements and the back of a one-sided card', () => {
    const doc = buildCard(registry, {
      meta: { name: 'Test' },
      card: { sides: 1 },
      stable: true,
      front: side('#ffffff', [
        el('logo', [10, 10, 30, 6]),
        el('text', [0, 0, 5, 5], { size: 3 }, { hidden: true }),
      ]),
      back: side('#ffffff', [el('text', [0, 0, 5, 5], { text: '{{nope}}', size: 3 })]),
    });
    expect(codes(doc)).toEqual([]);
    const root = doc.nodes.root;
    if (root) root.props = { ...root.props, sides: 2 };
    expect(codes(doc).sort()).toEqual([
      'card.outsideSafe',
      'card.textTooSmall',
      'variable.unknown',
    ]);
  });

  it('wants a chip on the front of a bank card', () => {
    const bank = buildCard(registry, {
      meta: { name: 'Bank' },
      format: 'bank',
      card: { sides: 1 },
      stable: true,
      front: side('#111827', [el('logo', [10, 10, 30, 6])]),
    });
    expect(codes(bank)).toEqual(['card.chipMissing']);
  });

  it('checks variables against the host’s fields, and photos against photo fields', () => {
    expect(codes(one('field', [10, 10, 40, 5], { text: '{{member.plan}}' }))).toEqual([
      'variable.unknown',
    ]);
    expect(codes(one('photo', [10, 10, 14, 17], { bind: 'member.name' }))).toEqual([
      'variable.unknown',
    ]);
    const own = checkCard(one('field', [10, 10, 40, 5], { text: '{{member.plan}}' }), registry, {
      fields: [{ path: 'member.plan', label: { en: 'Plan' }, kind: 'text' }],
    });
    expect(own).toEqual([]);
  });
});

describe('what a QR code may carry', () => {
  it.each([
    ['MA02481173', false],
    ['https://marrimauto.com/k/{{member.qr}}', false],
    ['tel:+355694002026', false],
    ['WIFI:T:WPA;S:Servisi;P:sekret;;', false],
    ['BEGIN:VCARD\nFN:Arben Hoxha\nEND:VCARD', false],
    ['javascript:alert(1)', true],
    [' JavaScript:alert(1)', true],
    ['java\tscript:alert(1)', true],
    ['data:text/html,<b>', true],
    ['https://marrimauto .com', true],
  ])('%j → unsafe %s', (data, unsafe) => {
    expect(isUnsafeCodeLink(data)).toBe(unsafe);
  });

  it('names the characters a barcode cannot carry', () => {
    expect(unencodableChars('Kodi ë é ë')).toEqual(['ë', 'é']);
    expect(unencodableChars('MA 0248')).toEqual([]);
  });
});
