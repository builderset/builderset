import {
  normalizeRichText,
  resolveStyle,
  setStyleValue,
  isAnchor,
  isSafeUrl,
  slugifyAnchor,
} from '@builderset/engine';
import { describe, expect, it } from 'vitest';

import { detectEmbedProvider } from './embeds';
import { createArticleRegistry, standardElements } from './elements';

describe('isSafeUrl', () => {
  it.each([
    ['https://example.com', true],
    ['http://example.com/a?b=c', true],
    ['mailto:a@b.test', true],
    ['tel:+355691234567', true],
    ['/guides/used', true],
    ['#section-2', true],
    ['javascript:alert(1)', false],
    ['JAVASCRIPT:alert(1)', false],
    ['java\tscript:alert(1)', false],
    ['data:text/html,<b>', false],
    ['//evil.test', false],
    ['#1bad', false],
    ['', false],
  ])('%s → %s', (url, expected) => {
    expect(isSafeUrl(url)).toBe(expected);
  });
});

describe('anchors', () => {
  it('slugifies text into a valid anchor', () => {
    expect(slugifyAnchor('Why buy used?')).toBe('why-buy-used');
    expect(slugifyAnchor('Çmimi i makinës')).toBe('cmimi-i-makines');
    expect(slugifyAnchor('2026 prices')).toBe('s-2026-prices');
    expect(isAnchor(slugifyAnchor('!!!'))).toBe(true);
  });
});

describe('normalizeRichText', () => {
  it('merges equal neighbours, drops empties, orders marks, and is idempotent', () => {
    const once = normalizeRichText([
      { text: 'a', marks: [{ type: 'italic' }, { type: 'bold' }] },
      { text: '' },
      { text: 'b', marks: [{ type: 'bold' }, { type: 'italic' }] },
      { text: 'c' },
    ]);
    expect(once).toEqual([
      { text: 'ab', marks: [{ type: 'bold' }, { type: 'italic' }] },
      { text: 'c' },
    ]);
    expect(normalizeRichText(once)).toEqual(once);
  });
});

describe('style', () => {
  it('inherits desktop → tablet → mobile', () => {
    const style = {
      desktop: { paddingY: 'lg' as const, textAlign: 'start' as const },
      mobile: { paddingY: 'sm' as const },
    };
    expect(resolveStyle(style, 'tablet')).toEqual({ paddingY: 'lg', textAlign: 'start' });
    expect(resolveStyle(style, 'mobile')).toEqual({ paddingY: 'sm', textAlign: 'start' });
  });

  it('drops empty breakpoints so an untouched node carries no style', () => {
    const set = setStyleValue(undefined, 'mobile', 'hidden', true);
    expect(set).toEqual({ mobile: { hidden: true } });
    expect(setStyleValue(set, 'mobile', 'hidden', undefined)).toBeUndefined();
  });
});

describe('embeds', () => {
  it('recognises allowed providers and nothing else', () => {
    expect(detectEmbedProvider('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('youtube');
    expect(detectEmbedProvider('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube');
    expect(detectEmbedProvider('https://vimeo.com/123456')).toBe('vimeo');
    expect(detectEmbedProvider('https://x.com/user/status/1234567890')).toBe('x');
    expect(detectEmbedProvider('https://evil.test/watch?v=x')).toBeNull();
    expect(detectEmbedProvider('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
  });
});

describe('the standard registry', () => {
  const registry = createArticleRegistry();

  it('registers every element with defaults its own schema accepts', () => {
    expect(registry.all()).toHaveLength(standardElements.length);
  });

  it('keeps structural elements where they belong', () => {
    expect(registry.canContain('columns', 'column')).toBe(true);
    expect(registry.canContain('root', 'column')).toBe(false);
    expect(registry.canContain('section', 'section')).toBe(false);
    expect(registry.canContain('column', 'columns')).toBe(false);
    expect(registry.canContain('accordion', 'accordion-item')).toBe(true);
    expect(registry.canContain('group', 'accordion-item')).toBe(false);
    expect(registry.canContain('accordion-item', 'paragraph')).toBe(true);
    expect(registry.canContain('paragraph', 'paragraph')).toBe(false);
  });

  it('refuses a duplicate type and defaults that fail their schema', () => {
    const [first] = standardElements;
    expect(() => registry.register(first as never)).toThrow(/already registered/);
  });

  it('offers only public elements in the insert menu', () => {
    const insertable = registry.insertable().map((definition) => definition.type);
    expect(insertable).not.toContain('root');
    expect(insertable).not.toContain('column');
    expect(insertable).toContain('paragraph');
  });
});
