import { resolveMessages } from '@motors/engine/editor';
import { describe, expect, it } from 'vitest';

import { de } from './de';
import { en } from './en';
import { sq } from './sq';

/** Every string anywhere in `value` that is empty, by its path. */
function emptyWords(value: unknown, path = ''): string[] {
  if (typeof value === 'string') return value.trim() ? [] : [path];
  if (Array.isArray(value))
    return value.flatMap((item, i) => emptyWords(item, `${path}[${String(i)}]`));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) =>
      emptyWords(item, path ? `${path}.${key}` : key),
    );
  }
  return [];
}

describe('the article kit’s words', () => {
  it.each([
    ['en', en],
    ['sq', sq],
    ['de', de],
  ])('%s has a word for every key', (_, words) => {
    expect(emptyWords(words)).toEqual([]);
    expect(Object.keys(words.elements).sort()).toEqual(Object.keys(en.elements).sort());
  });

  it('falls back to English, and reads a regional code as its language', () => {
    expect(resolveMessages(en, 'fr', { sq, de })).toEqual(en);
    expect(resolveMessages(en, 'sq-AL', { sq, de }).engine.undo).toBe(sq.engine.undo);
  });
});
