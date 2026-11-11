import { describe, expect, it } from 'vitest';

import { pickLocale, resolveMessages } from '../editor/messages';
import { de } from './de';
import { en } from './en';
import { sq } from './sq';

/** Every string anywhere in `value` that is empty, by its path. */
export function emptyWords(value: unknown, path = ''): string[] {
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

describe('the editor’s words', () => {
  it.each([
    ['en', en],
    ['sq', sq],
    ['de', de],
  ])('%s has a word for every key', (_, words) => {
    expect(emptyWords(words)).toEqual([]);
    expect(Object.keys(words).sort()).toEqual(Object.keys(en).sort());
  });

  it('falls back to English for a language it was not given', () => {
    expect(resolveMessages(en, 'fr', {}, {})).toEqual(en);
    expect(resolveMessages(en, 'fr', { sq }).undo).toBe('Undo');
  });

  it('reads a regional code as its language', () => {
    expect(resolveMessages(en, 'sq-AL', { sq }).undo).toBe(sq.undo);
    expect(pickLocale('de-AT', { de })).toBe(de);
  });

  it('lays single words over the chosen language, and keeps the rest', () => {
    const words = resolveMessages(
      en,
      'de',
      { de },
      { undo: 'Zurücknehmen', issueText: { x: 'X' } },
    );
    expect(words.undo).toBe('Zurücknehmen');
    expect(words.redo).toBe(de.redo);
    expect(words.issueText.x).toBe('X');
    expect(Object.keys(words.issueText).length).toBeGreaterThan(1);
  });
});
