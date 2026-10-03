import { describe, expect, it } from 'vitest';

import { createDocument, type BuilderDocument } from './document';
import { createStandardRegistry } from './elements';
import { documentLocales, hasWords, isTranslating, localize, type Translation } from './i18n';
import { checkDocument } from './validate';

/** An Albanian article with an English translation of its heading and title. */
function article(): { doc: BuilderDocument; en: Translation; root: string[] } {
  const doc = createDocument({ title: 'Si ta shisni makinën', excerpt: 'Pesë hapa' });
  const root = ['h1', 'p1'];
  doc.nodes.root = { id: 'root', type: 'root', v: 1, props: {}, children: root };
  doc.nodes.h1 = {
    id: 'h1',
    type: 'heading',
    v: 1,
    props: { level: 2, text: [{ text: 'Hapi i parë' }] },
  };
  doc.nodes.p1 = {
    id: 'p1',
    type: 'paragraph',
    v: 1,
    props: { text: [{ text: 'Plotësoni formularin.' }] },
  };
  const en: Translation = {
    meta: { title: 'How to sell your car', 'seo.title': 'Sell your car' },
    nodes: {
      h1: { text: [{ text: 'Step one' }] },
      // Empty: falls back to the Albanian.
      p1: { text: [{ text: '  ' }] },
    },
  };
  doc.i18n = { enabled: true, base: 'sq', translations: { en } };
  return { doc, en, root };
}

describe('localize', () => {
  it('lays the translation over the base and keeps the rest', () => {
    const { doc } = article();
    const en = localize(doc, 'en');
    expect(en.nodes.h1?.props.text).toEqual([{ text: 'Step one' }]);
    expect(en.nodes.h1?.props.level).toBe(2);
    expect(en.nodes.p1).toBe(doc.nodes.p1);
    expect(en.meta.title).toBe('How to sell your car');
    expect(en.meta.excerpt).toBe('Pesë hapa');
    expect(en.meta.seo?.title).toBe('Sell your car');
    // The base is untouched.
    expect(doc.nodes.h1?.props.text).toEqual([{ text: 'Hapi i parë' }]);
  });

  it('returns the same document when there is nothing to lay over it', () => {
    const { doc } = article();
    expect(localize(doc, 'sq')).toBe(doc);
    expect(localize(doc, 'de')).toBe(doc);
    expect(localize(doc, 'xx')).toBe(doc);
    const off = { ...doc, i18n: { enabled: false, base: 'sq' as const, translations: {} } };
    expect(localize(off, 'en')).toBe(off);
  });

  it('only replaces a leaf that exists, with the same kind of value', () => {
    const { doc, en } = article();
    en.nodes = {
      h1: { 'text.9.text': 'x', level: 'three', text: 'not rich text' },
      gone: { text: [{ text: 'orphan' }] },
    };
    const english = localize(doc, 'en');
    expect(english.nodes.h1?.props).toEqual(doc.nodes.h1?.props);
    expect(english.nodes.gone).toBeUndefined();
  });

  it('reaches into lists by index', () => {
    const { doc, en, root } = article();
    doc.nodes.l1 = {
      id: 'l1',
      type: 'list',
      v: 1,
      props: { style: 'bullet', items: [{ text: [{ text: 'Një' }] }, { text: [{ text: 'Dy' }] }] },
    };
    root.push('l1');
    en.nodes = { l1: { 'items.1.text': [{ text: 'Two' }] } };
    expect(localize(doc, 'en').nodes.l1?.props.items).toEqual([
      { text: [{ text: 'Një' }] },
      { text: [{ text: 'Two' }] },
    ]);
  });

  it('knows which languages a document is written in', () => {
    const { doc } = article();
    expect(documentLocales(doc)).toEqual(['sq', 'en', 'de']);
    expect(documentLocales({ ...doc, i18n: undefined })).toEqual([]);
    expect(isTranslating(doc, 'en')).toBe(true);
    expect(isTranslating(doc, 'sq')).toBe(false);
    expect(hasWords([{ text: ' ' }])).toBe(false);
    expect(hasWords('Po')).toBe(true);
  });

  it('checks each language as a document of its own', () => {
    const registry = createStandardRegistry();
    const { doc, en } = article();
    en.nodes = { h1: { text: [{ text: 'x'.repeat(20_000) }] } };
    const issues = checkDocument(doc, registry).filter((issue) => issue.path?.startsWith('en.'));
    expect(issues.length).toBeGreaterThan(0);
  });
});
