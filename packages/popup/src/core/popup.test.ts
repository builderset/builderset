import { describe, expect, it } from 'vitest';

import { buildPopup, el, formatWith } from './build';
import { localDay, normalisePath, pathMatches, pickPopup, shouldShow, whyHidden } from './display';
import { createPopupDocument, formatOf, positionOf, type PopupDocument } from './document';
import { createPopupRegistry } from './elements';
import { validateSubmission } from './submission';
import { canClose, checkPopup, parsePopup, popupTips } from './validate';
import { exampleData, fillVariables, lookup, variablesIn } from './variables';

const registry = createPopupRegistry();
function nodeOf(doc: PopupDocument, id: string) {
  const node = doc.nodes[id];
  if (!node) throw new Error(`no ${id}`);
  return node;
}
const codes = (doc: PopupDocument) => checkPopup(doc, registry).map((issue) => issue.code);

function popup(format: Parameters<typeof formatWith>[0] = {}): PopupDocument {
  return buildPopup(registry, { format, stable: true }, [
    el('heading', [24, 24, 400, 34], { text: 'Sa vlen makina juaj?' }),
    el('input', [24, 80, 272, 44], { name: 'plate', label: 'Targa', kind: 'plate' }),
    el('button', [24, 136, 272, 46], { text: 'Vlerëso', action: 'submit' }),
    el('close', [478, 12, 30, 30]),
  ]);
}

describe('a popup document', () => {
  it('starts as an empty modal of the default size', () => {
    const doc = createPopupDocument({ name: 'New' });
    expect(formatOf(doc)).toMatchObject({ type: 'modal', width: 520, height: 340 });
    expect(codes(doc)).toEqual(['popup.empty']);
    expect(parsePopup(doc, registry)).toBe(doc);
    expect(parsePopup({ ...doc, schema: 'email/document' }, registry)).toBeNull();
  });

  it('gives each type its own size, position and look', () => {
    expect(formatWith({ type: 'drawer' })).toMatchObject({
      width: 380,
      position: 'right',
      radius: 0,
    });
    expect(formatWith({ type: 'bartop' })).toMatchObject({ width: 1100, background: '#111827' });
    expect(formatWith({ type: 'slidein', display: { trigger: 'exit' } }).display).toMatchObject({
      trigger: 'exit',
      frequency: 'days',
    });
  });

  it('keeps a position only where the type allows it', () => {
    expect(positionOf('slidein', 'top-left')).toBe('top-left');
    expect(positionOf('slidein', 'left')).toBe('bottom-right');
    expect(positionOf('drawer', 'top-left')).toBe('right');
    expect(positionOf('modal', 'left')).toBe('center');
  });

  it('refuses an outline that does not fit an element', () => {
    expect(() => buildPopup(registry, {}, [el('input', [0, 0, 100, 40], { kind: 'fax' })])).toThrow(
      /input/,
    );
  });
});

describe('checks', () => {
  it('passes a popup that can close and send', () => {
    expect(codes(popup())).toEqual([]);
  });

  it('counts every way to close it', () => {
    const doc = popup({ motion: { outside: false, esc: false } });
    expect(canClose(doc)).toBe(true);
    nodeOf(doc, 'n4').hidden = true;
    expect(canClose(doc)).toBe(false);
    expect(codes(doc)).toEqual(['popup.noClose']);
    // A "Not now" that closes it is a way out.
    nodeOf(doc, 'n1').props.action = 'close';
    expect(canClose(doc)).toBe(true);
  });

  it('needs no way to close a card inside the page', () => {
    const doc = popup({ type: 'inline', width: 520, motion: { outside: false, esc: false } });
    nodeOf(doc, 'n4').hidden = true;
    expect(codes(doc)).toEqual([]);
  });

  it('warns about a modal on page load and about every visit, never about an inline card', () => {
    expect(codes(popup({ display: { trigger: 'load', frequency: 'every' } }))).toEqual([
      'display.everyVisit',
      'display.interstitial',
    ]);
    expect(
      codes(
        popup({ type: 'inline', width: 520, display: { trigger: 'load', frequency: 'every' } }),
      ),
    ).toEqual([]);
    expect(codes(popup({ type: 'slidein', width: 520, display: { trigger: 'load' } }))).toEqual([]);
  });

  it('reads variables against the project’s own', () => {
    const doc = buildPopup(registry, { stable: true }, [
      el('heading', [0, 0, 300, 30], { text: 'Hi {{member.tier}}, {{visitor.first_name}}' }),
      el('close', [478, 12, 30, 30]),
    ]);
    expect(codes(doc)).toEqual(['variable.unknown']);
    expect(checkPopup(doc, registry, { variables: ['member.tier', 'visitor.first_name'] })).toEqual(
      [],
    );
  });

  it('tells, without counting it, that a wide popup shrinks on phones', () => {
    expect(popupTips(popup())).toEqual([{ code: 'popup.scaledOnPhones', params: { width: 520 } }]);
    expect(popupTips(popup({ display: { mobile: false } }))).toEqual([]);
    expect(popupTips(popup({ type: 'slidein', width: 340 }))).toEqual([]);
  });

  it('refuses languages the project does not write in', () => {
    const doc = popup();
    doc.i18n = { enabled: true, base: 'sq', translations: { fr: {} } };
    expect(checkPopup(doc, registry, { locales: ['sq', 'en'] }).map((issue) => issue.code)).toEqual(
      ['i18n.locale.unknown'],
    );
  });
});

describe('display rules', () => {
  const now = Date.UTC(2026, 10, 20, 12);

  it('match paths with * for any part', () => {
    expect(pathMatches('/blog/*', '/blog/a/b')).toBe(true);
    expect(pathMatches('/blog/*', '/blog')).toBe(false);
    // Everything after the first slash, the home page too.
    expect(pathMatches('/*', '/')).toBe(true);
    expect(pathMatches('*', '/anything')).toBe(true);
    expect(pathMatches(' /vleresim/ ', '/vleresim?x=1')).toBe(true);
    expect(normalisePath('blog//')).toBe('/blog');
  });

  it('answer for a whole document', () => {
    const doc = popup({ display: { pages: 'only', rules: ['/makina/*'] } });
    expect(shouldShow(doc, { path: '/makina/golf', device: 'mobile', now })).toBe(true);
    expect(whyHidden(doc, { path: '/blog', device: 'mobile', now })).toBe('pages');
  });

  it('read today in the runtime’s own time zone unless told', () => {
    const doc = popup({ display: { ends: localDay(now) } });
    expect(shouldShow(doc, { path: '/', device: 'desktop', now })).toBe(true);
    expect(shouldShow(doc, { path: '/', device: 'desktop', now, today: '2026-12-01' })).toBe(false);
  });
});

describe('several popups on one page', () => {
  const now = Date.UTC(2026, 10, 20, 12);
  const here = { path: '/makina/golf', device: 'desktop' as const, now };

  it('shows the one with the highest priority the rules let through, the first on a tie', () => {
    const low = popup({ display: { priority: 1 } });
    const high = popup({ display: { priority: 5 } });
    const elsewhere = popup({ display: { priority: 9, pages: 'only', rules: ['/blog/*'] } });
    const tie = popup({ display: { priority: 5 } });
    expect(pickPopup([low, elsewhere, high, tie], here)).toBe(high);
    expect(pickPopup([elsewhere], here)).toBeNull();
    expect(
      pickPopup([low, high], (each) => ({ ...here, device: each === high ? 'mobile' : 'desktop' })),
    ).toBe(high);
  });
});

describe('a submission', () => {
  it('is read from the visible inputs only', () => {
    const doc = popup();
    nodeOf(doc, 'n2').hidden = true;
    expect(validateSubmission(doc, { plate: 'x' })).toEqual({ ok: true, errors: {}, values: {} });
  });
});

describe('variables', () => {
  const data = { visitor: { first_name: 'Ana', age: 30, tags: ['x'] } };

  it('are found and filled; a missing one reads as nothing', () => {
    expect(variablesIn('{{ visitor.first_name }} and {{page.title}}')).toEqual([
      'visitor.first_name',
      'page.title',
    ]);
    expect(fillVariables('Hi {{visitor.first_name}}{{page.title}}!', data)).toBe('Hi Ana!');
    expect(lookup(data, 'visitor.age')).toBe('30');
    expect(lookup(data, 'visitor.tags')).toBe('');
    expect(lookup(data, 'visitor.constructor')).toBe('');
  });

  it('make example data from the fields', () => {
    expect(
      exampleData([{ path: 'offer.ends', example: '30 nëntor' }, { path: 'page.title' }]),
    ).toEqual({ offer: { ends: '30 nëntor' }, page: { title: '' } });
  });
});
