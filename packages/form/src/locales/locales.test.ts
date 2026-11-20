import { resolveMessages } from '@builderset/engine/editor';
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

/** The path of every word in `value`: a string, a function or a list, each a leaf. */
function wordKeys(value: unknown, path = ''): string[] {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([key, item]) =>
      wordKeys(item, path ? `${path}.${key}` : key),
    );
  }
  return [path];
}

/** Every function anywhere in `value`, by its path. */
function wordFunctions(value: unknown, path = ''): [string, (...args: unknown[]) => unknown][] {
  if (typeof value === 'function') return [[path, value as (...args: unknown[]) => unknown]];
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([key, item]) =>
      wordFunctions(item, path ? `${path}.${key}` : key),
    );
  }
  return [];
}

describe('the form kit’s words', () => {
  it.each([
    ['en', en],
    ['sq', sq],
    ['de', de],
  ])('%s has a word for every key', (_, words) => {
    expect(emptyWords(words)).toEqual([]);
    expect(wordKeys(words).sort()).toEqual(wordKeys(en).sort());
    expect(Object.keys(words.elements).sort()).toEqual(Object.keys(en.elements).sort());
  });

  it.each([
    ['en', en],
    ['sq', sq],
    ['de', de],
  ])('%s: every function returns words', (_, words) => {
    // The engine's words are the engine's to test; these are the form kit's own.
    const own = Object.entries(words).filter(([key]) => key !== 'engine');
    for (const [path, word] of wordFunctions(Object.fromEntries(own))) {
      for (const args of [
        [1, 1, 1],
        [2, 5, 10],
      ]) {
        const said = word(...args);
        expect(typeof said, path).toBe('string');
        expect(String(said).trim(), path).not.toBe('');
      }
    }
  });

  it('falls back to English, and reads a regional code as its language', () => {
    expect(resolveMessages(en, 'fr', { sq, de })).toEqual(en);
    expect(resolveMessages(en, 'sq-AL', { sq, de }).engine.undo).toBe(sq.engine.undo);
    expect(resolveMessages(en, 'de-AT', { sq, de }).form.general).toBe(de.form.general);
  });
});
