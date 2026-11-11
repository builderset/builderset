import { normalizeRichText, type Mark, type RichText, type TextRun } from '../../core';
import type { JSONContent } from '@tiptap/core';

/**
 * Our rich text ⇄ TipTap's JSON, at the editing boundary only.
 *
 * TipTap is how a writer types; `RichText` (runs + marks) is what is stored.
 * Nothing TipTap-shaped ever reaches the document, so swapping the editing
 * library later is a change to this file and the inline editor, not a
 * migration of every article.
 *
 * A field is ONE paragraph: line breaks inside it are hard breaks, stored as
 * `\n` in a run. Enter does not add a TipTap paragraph — the editor turns it
 * into a new builder block instead.
 */

interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

/**
 * An email's variable, as a mark on the run that stands for it. Not in the
 * article's mark set — the article schema refuses it — but passed through
 * untouched so an email field keeps its variables when edited.
 */
interface VariableMark {
  type: 'variable';
  path: string;
  format?: string | undefined;
  fallback?: string | undefined;
}

/** A font on part of a text (an email's), by catalogue key. */
interface FontMark {
  type: 'font';
  family: string;
}

type AnyMark = Mark | VariableMark | FontMark;

function toTiptapMark(mark: AnyMark): TiptapMark {
  switch (mark.type) {
    case 'font':
      return { type: 'font', attrs: { family: mark.family } };
    case 'variable':
      return {
        type: 'variable',
        attrs: { path: mark.path, format: mark.format ?? null, fallback: mark.fallback ?? null },
      };
    case 'sub':
      return { type: 'subscript' };
    case 'sup':
      return { type: 'superscript' };
    case 'link':
      return {
        type: 'link',
        attrs: { href: mark.href, target: mark.newTab ? '_blank' : null },
      };
    case 'footnote':
      return { type: 'footnote', attrs: { ref: mark.ref } };
    default:
      return { type: mark.type };
  }
}

function fromTiptapMark(mark: TiptapMark): AnyMark | null {
  switch (mark.type) {
    case 'font': {
      const family = typeof mark.attrs?.family === 'string' ? mark.attrs.family : '';
      return family ? { type: 'font', family } : null;
    }
    case 'variable': {
      const path = typeof mark.attrs?.path === 'string' ? mark.attrs.path : '';
      if (!path) return null;
      const format = typeof mark.attrs?.format === 'string' ? mark.attrs.format : undefined;
      const fallback = typeof mark.attrs?.fallback === 'string' ? mark.attrs.fallback : undefined;
      return {
        type: 'variable',
        path,
        ...(format ? { format } : {}),
        ...(fallback ? { fallback } : {}),
      };
    }
    case 'bold':
    case 'italic':
    case 'underline':
    case 'strike':
    case 'code':
    case 'highlight':
      return { type: mark.type };
    case 'subscript':
      return { type: 'sub' };
    case 'superscript':
      return { type: 'sup' };
    case 'link': {
      const href = typeof mark.attrs?.href === 'string' ? mark.attrs.href : '';
      if (!href) return null;
      return mark.attrs?.target === '_blank'
        ? { type: 'link', href, newTab: true }
        : { type: 'link', href };
    }
    case 'footnote': {
      const ref = typeof mark.attrs?.ref === 'string' ? mark.attrs.ref : '';
      return ref ? { type: 'footnote', ref } : null;
    }
    default:
      return null;
  }
}

export function toTiptap(value: RichText): JSONContent {
  const content: JSONContent[] = [];
  for (const run of value) {
    const marks = ((run.marks ?? []) as AnyMark[]).map(toTiptapMark);
    run.text.split('\n').forEach((part, index) => {
      if (index > 0) content.push({ type: 'hardBreak' });
      if (part) content.push({ type: 'text', text: part, ...(marks.length ? { marks } : {}) });
    });
  }
  return { type: 'doc', content: [{ type: 'paragraph', ...(content.length ? { content } : {}) }] };
}

export function fromTiptap(json: JSONContent): RichText {
  const runs: TextRun[] = [];
  const paragraphs = json.content ?? [];
  paragraphs.forEach((paragraph, index) => {
    if (index > 0) runs.push({ text: '\n' });
    for (const child of paragraph.content ?? []) {
      if (child.type === 'hardBreak') {
        runs.push({ text: '\n' });
      } else if (child.type === 'text' && child.text) {
        const marks = (child.marks ?? [])
          .map((mark) => fromTiptapMark(mark as TiptapMark))
          .filter((mark): mark is AnyMark => mark !== null) as Mark[];
        runs.push(marks.length ? { text: child.text, marks } : { text: child.text });
      }
    }
  });
  return normalizeRichText(runs);
}

/** Split a value at a character offset — for Enter in the middle of a line. */
export function splitRichText(value: RichText, offset: number): [RichText, RichText] {
  const before: TextRun[] = [];
  const after: TextRun[] = [];
  let seen = 0;
  for (const run of value) {
    const end = seen + run.text.length;
    if (end <= offset) before.push(run);
    else if (seen >= offset) after.push(run);
    else {
      const cut = offset - seen;
      before.push({ ...run, text: run.text.slice(0, cut) });
      after.push({ ...run, text: run.text.slice(cut) });
    }
    seen = end;
  }
  return [normalizeRichText(before), normalizeRichText(after)];
}

/** Two values joined — for Backspace at the start of a block. */
export function joinRichText(first: RichText, second: RichText): RichText {
  return normalizeRichText([...first, ...second]);
}

/** A value's plain length, the unit `splitRichText` counts in. */
export function richTextLength(value: RichText): number {
  return value.reduce((sum, run) => sum + run.text.length, 0);
}

/** Set a value at a dot path in props, copying only what the path passes through. */
export function setAtPath(
  props: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const [head, ...rest] = path.split('.');
  if (head === undefined) return props;
  if (rest.length === 0) return { ...props, [head]: value };
  const current = props[head];
  if (Array.isArray(current)) {
    const items: unknown[] = [...(current as unknown[])];
    const index = Number(rest[0]);
    const tail = rest.slice(1).join('.');
    items[index] = tail
      ? setAtPath((items[index] ?? {}) as Record<string, unknown>, tail, value)
      : value;
    return { ...props, [head]: items };
  }
  const child = { ...(current as Record<string, unknown> | undefined) };
  return { ...props, [head]: setAtPath(child, rest.join('.'), value) };
}

/** Read a value at a dot path. */
export function getAtPath(props: unknown, path: string): unknown {
  let current: unknown = props;
  for (const part of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
