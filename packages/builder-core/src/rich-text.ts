import { z } from 'zod';

import { LIMITS } from './limits';
import { isSafeUrl } from './url';

/**
 * Inline text with formatting, as DATA — never as HTML.
 *
 * A run is a string and the marks that apply to all of it. "Buy **used**" is
 * two runs: `{ text: 'Buy ' }` and `{ text: 'used', marks: [{ type: 'bold' }] }`.
 * The renderer turns marks into `<strong>`, `<a>` and friends through JSX, so
 * no string a writer types is ever parsed as markup, and a link's `href` has
 * been through `isSafeUrl` before it is stored.
 *
 * Runs are kept NORMALIZED (see `normalizeRichText`): adjacent runs with equal
 * marks are merged, empty runs dropped, marks sorted. That is what makes two
 * documents that look the same compare the same, and what keeps undo from
 * recording a change nobody can see.
 */

export const markSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('bold') }),
  z.object({ type: z.literal('italic') }),
  z.object({ type: z.literal('underline') }),
  z.object({ type: z.literal('strike') }),
  z.object({ type: z.literal('code') }),
  z.object({ type: z.literal('highlight') }),
  z.object({ type: z.literal('sub') }),
  z.object({ type: z.literal('sup') }),
  z.object({
    type: z.literal('link'),
    href: z.string().refine(isSafeUrl, { message: 'url.unsafe' }),
    newTab: z.boolean().optional(),
  }),
  // A reference to a footnote node, drawn as a superscript number.
  z.object({ type: z.literal('footnote'), ref: z.string().min(1).max(40) }),
]);

export type Mark = z.infer<typeof markSchema>;
export type MarkType = Mark['type'];

export const textRunSchema = z.object({
  text: z.string().max(LIMITS.richTextChars),
  marks: z.array(markSchema).max(10).optional(),
});

export type TextRun = z.infer<typeof textRunSchema>;

export const richTextSchema = z
  .array(textRunSchema)
  .max(500)
  .refine((runs) => runs.reduce((sum, run) => sum + run.text.length, 0) <= LIMITS.richTextChars, {
    message: 'text.tooLong',
  });

export type RichText = TextRun[];

/** A rich-text value from plain text. */
export function rt(text: string, marks?: Mark[]): RichText {
  if (!text) return [];
  return [marks?.length ? { text, marks } : { text }];
}

/** The characters, without formatting. */
export function richTextToPlain(value: RichText | undefined | null): string {
  return (value ?? []).map((run) => run.text).join('');
}

export function isRichTextEmpty(value: RichText | undefined | null): boolean {
  return richTextToPlain(value).trim() === '';
}

const MARK_ORDER: MarkType[] = [
  'link',
  'footnote',
  'bold',
  'italic',
  'underline',
  'strike',
  'code',
  'highlight',
  'sub',
  'sup',
];

function markKey(mark: Mark): string {
  if (mark.type === 'link') return `link:${mark.href}:${mark.newTab ? '1' : '0'}`;
  if (mark.type === 'footnote') return `footnote:${mark.ref}`;
  return mark.type;
}

function sortMarks(marks: Mark[] | undefined): Mark[] {
  if (!marks?.length) return [];
  // One mark of each type: a run cannot be two links at once, and a second
  // `bold` is the same bold.
  const byType = new Map<MarkType, Mark>();
  for (const mark of marks) byType.set(mark.type, mark);
  return [...byType.values()].sort(
    (a, b) => MARK_ORDER.indexOf(a.type) - MARK_ORDER.indexOf(b.type),
  );
}

function sameMarks(a: Mark[], b: Mark[]): boolean {
  return (
    a.length === b.length &&
    a.every((mark, index) => {
      const other = b[index];
      return other !== undefined && markKey(mark) === markKey(other);
    })
  );
}

/** Merge equal neighbours, drop empties, order marks. Idempotent. */
export function normalizeRichText(value: RichText): RichText {
  const out: RichText = [];
  for (const run of value) {
    if (!run.text) continue;
    const marks = sortMarks(run.marks);
    const previous = out[out.length - 1];
    if (previous && sameMarks(previous.marks ?? [], marks)) {
      previous.text += run.text;
      continue;
    }
    out.push(marks.length ? { text: run.text, marks } : { text: run.text });
  }
  return out;
}

/** Whether every character in `value` carries a mark of `type`. */
export function hasMarkEverywhere(value: RichText, type: MarkType): boolean {
  const runs = value.filter((run) => run.text);
  return runs.length > 0 && runs.every((run) => run.marks?.some((mark) => mark.type === type));
}

/** Every link `href` in the value — for the issues checker and the server. */
export function linksOf(value: RichText | undefined | null): string[] {
  const hrefs: string[] = [];
  for (const run of value ?? []) {
    for (const mark of run.marks ?? []) {
      if (mark.type === 'link') hrefs.push(mark.href);
    }
  }
  return hrefs;
}

/** Footnote ids referenced from the value. */
export function footnoteRefsOf(value: RichText | undefined | null): string[] {
  const refs: string[] = [];
  for (const run of value ?? []) {
    for (const mark of run.marks ?? []) {
      if (mark.type === 'footnote') refs.push(mark.ref);
    }
  }
  return refs;
}
