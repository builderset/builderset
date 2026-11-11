import { TRANSLATABLE_META, valueAt } from '../core';

import { classify, type JsonSchema } from './inspector/schema';

/**
 * Editing a multi-language document in a language other than its base.
 *
 * The inspector and the canvas show the document as it reads in that language
 * and hand back whole new props, as they always do. This splits such an edit
 * in two: the WORDS that changed go to that language's translation, and
 * everything else — a colour, a link, a switch — goes to the shared base, so
 * it changes for every language at once. Adding or removing a list item is
 * structure, which is the base language's to change; it is refused here.
 */

export interface SplitEdit {
  /** Translation paths and their new words. */
  words: [string, unknown][];
  /** Base paths and their new values. */
  shared: [string, unknown][];
  /** A list grew or shrank: only the base language may do that. */
  structural: boolean;
}

/** Keys whose text is not prose: addresses, colours, names of things in code. */
const NOT_WORDS =
  /(^|[^a-z])(href|url|src|link|anchor|provider|network|list|font|icon|code|email|phone|slug|path|var|op)$|color$|^background$|^backdrop$/i;

const equal = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);

const isRichText = (value: unknown) =>
  Array.isArray(value) &&
  value.every((run) => run !== null && typeof run === 'object' && 'text' in (run as object));

export function isWordKey(key: string, path: string): boolean {
  // A display condition's value is data, not a sentence.
  return !path.startsWith('display.') && !NOT_WORDS.test(key);
}

/**
 * Split `next` (the props as the inspector or canvas would now have them)
 * against `shown` (the props as they read in this language) and `base` (the
 * props as stored). A change back to exactly the base value, away from what
 * was shown, comes from a caller that built its props from the base — it is
 * not the writer's, and is ignored rather than written over a translation.
 */
export function splitEdit(
  schema: JsonSchema | null,
  shown: Record<string, unknown>,
  base: Record<string, unknown>,
  next: Record<string, unknown>,
): SplitEdit {
  const result: SplitEdit = { words: [], shared: [], structural: false };

  const visit = (
    fieldSchema: JsonSchema | undefined,
    key: string,
    path: string,
    value: unknown,
  ) => {
    const before = valueAt(shown, path);
    if (equal(before, value)) return;
    const stored = valueAt(base, path);
    const kind = fieldSchema
      ? classify(fieldSchema, key)
      : isRichText(value)
        ? { kind: 'richText' as const }
        : typeof value === 'string'
          ? { kind: 'string' as const, multiline: false }
          : { kind: 'unknown' as const };

    switch (kind.kind) {
      case 'richText':
        if (equal(value, stored)) return;
        result.words.push([path, value]);
        return;
      case 'string':
        if (!isWordKey(key, path)) result.shared.push([path, value]);
        else if (!equal(value, stored)) result.words.push([path, value]);
        return;
      case 'nullable':
        if (value === null || before === null || before === undefined) {
          result.shared.push([path, value]);
          return;
        }
        visit(kind.inner, key, path, value);
        return;
      case 'object':
        if (!value || typeof value !== 'object' || !before || typeof before !== 'object') {
          result.shared.push([path, value]);
          return;
        }
        for (const [child, childValue] of Object.entries(value as Record<string, unknown>)) {
          visit(kind.properties[child], child, `${path}.${child}`, childValue);
        }
        return;
      case 'array': {
        if (!Array.isArray(value) || !Array.isArray(before) || value.length !== before.length) {
          result.structural = true;
          return;
        }
        value.forEach((item, index) => {
          visit(kind.item, key, `${path}.${String(index)}`, item);
        });
        return;
      }
      default:
        result.shared.push([path, value]);
    }
  };

  for (const [key, value] of Object.entries(next)) {
    visit(schema?.properties?.[key], key, key, value);
  }
  return result;
}

/**
 * The same for the document's own fields: the title, the excerpt, the SEO
 * lines, the cover's alt text, an email's subject and preheader are words;
 * the slug, the cover picture, the reading time are shared.
 */
export function splitMeta(
  shown: Record<string, unknown>,
  base: Record<string, unknown>,
  next: Record<string, unknown>,
): { words: [string, unknown][]; shared: Record<string, unknown> } {
  const words: [string, unknown][] = [];
  const shared: Record<string, unknown> = {};
  const isWords = (path: string) => (TRANSLATABLE_META as readonly string[]).includes(path);

  for (const [key, value] of Object.entries(next)) {
    if (isWords(key)) {
      if (!equal(value, shown[key])) words.push([key, value]);
      continue;
    }
    if ((key === 'seo' || key === 'cover') && value && typeof value === 'object') {
      const rest = { ...(value as Record<string, unknown>) };
      const before = (shown[key] ?? {}) as Record<string, unknown>;
      const stored = (base[key] ?? {}) as Record<string, unknown>;
      for (const sub of Object.keys(rest)) {
        if (!isWords(`${key}.${sub}`)) continue;
        if (!equal(rest[sub], before[sub])) words.push([`${key}.${sub}`, rest[sub]]);
        // The base keeps its own words.
        if (sub in stored) rest[sub] = stored[sub];
        else Reflect.deleteProperty(rest, sub);
      }
      shared[key] = rest;
      continue;
    }
    shared[key] = value;
  }
  return { words, shared };
}
