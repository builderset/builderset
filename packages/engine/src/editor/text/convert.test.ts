import type { RichText } from '../../core';
import { describe, expect, it } from 'vitest';

import { fromTiptap, getAtPath, setAtPath, splitRichText, toTiptap } from './convert';

describe('rich text ⇄ TipTap', () => {
  const value: RichText = [
    { text: 'Plain ' },
    { text: 'bold', marks: [{ type: 'bold' }] },
    { text: ' and a ' },
    { text: 'link', marks: [{ type: 'link', href: 'https://marrimauto.com', newTab: true }] },
    { text: '\nnext line' },
    { text: 'x', marks: [{ type: 'sup' }] },
  ];

  it('round-trips marks, links and line breaks', () => {
    expect(fromTiptap(toTiptap(value))).toEqual(value);
  });

  it('keeps an empty value empty', () => {
    expect(fromTiptap(toTiptap([]))).toEqual([]);
  });

  it('splits at a character offset across runs', () => {
    const [before, after] = splitRichText(value, 8);
    expect(before.map((run) => run.text).join('')).toBe('Plain bo');
    expect(after[0]).toEqual({ text: 'ld', marks: [{ type: 'bold' }] });
  });
});

describe('prop paths', () => {
  it('sets a nested list item without touching its siblings', () => {
    const props = { items: [{ text: [] }, { text: [{ text: 'b' }] }], style: 'bullet' };
    const next = setAtPath(props, 'items.0.text', [{ text: 'a' }]);
    expect(getAtPath(next, 'items.0.text')).toEqual([{ text: 'a' }]);
    expect(next.items).not.toBe(props.items);
    expect((next.items as unknown[])[1]).toBe(props.items[1]);
    expect(Array.isArray(next.items)).toBe(true);
  });
});
