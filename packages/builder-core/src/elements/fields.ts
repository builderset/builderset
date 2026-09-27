import { z } from 'zod';

import { warning, type Issue } from '../issues';
import { LIMITS } from '../limits';
import { mediaRefSchema, type MediaRef } from '../media';
import { linksOf, richTextSchema, richTextToPlain, type RichText } from '../rich-text';
import { isSafeUrl } from '../url';

/**
 * The field vocabulary the standard elements are written in. Kept in one
 * place so "a short label" means the same length limit in every element, and
 * the server's mirror has one list to follow.
 */

export const shortText = () => z.string().max(LIMITS.shortText);
export const longText = () => z.string().max(LIMITS.longText);
export const richText = () => richTextSchema;
export const media = () => mediaRefSchema.nullable();
export const safeUrl = () => z.string().refine(isSafeUrl, { message: 'url.unsafe' });

/** A link a reader follows. */
export const linkSchema = z.object({
  href: safeUrl(),
  newTab: z.boolean().optional(),
});
export type Link = z.infer<typeof linkSchema>;

/** The icon names a writer may put on a button — a small, curated set. */
export const BUTTON_ICONS = [
  'arrow-right',
  'arrow-up-right',
  'download',
  'mail',
  'phone',
  'calendar',
  'car',
  'external-link',
  'play',
  'check',
] as const;

export const buttonSchema = z.object({
  /** Empty is allowed while editing; the checker flags it — see `buttonIssues`. */
  label: z.string().max(60),
  href: safeUrl(),
  variant: z.enum(['primary', 'secondary', 'outline', 'ghost']),
  icon: z.enum(BUTTON_ICONS).nullable(),
  newTab: z.boolean(),
});
export type ButtonSpec = z.infer<typeof buttonSchema>;

/** A button a reader cannot read is a button nobody presses. */
export function buttonIssues(buttons: readonly ButtonSpec[], nodeId: string): Issue[] {
  return buttons.flatMap((button, index) =>
    button.label.trim()
      ? []
      : [warning('button.labelMissing', { nodeId, path: `buttons.${String(index)}.label` })],
  );
}

export const listOf = <T extends z.ZodType>(item: T, max: number = LIMITS.listItems) =>
  z.array(item).max(max);

/** Plain text of several rich-text values, one per line. */
export function joinPlain(values: readonly (RichText | string | undefined | null)[]): string {
  return values
    .map((value) => (typeof value === 'string' ? value : richTextToPlain(value)))
    .filter((text) => text.trim() !== '')
    .join('\n');
}

/** Every link inside several rich-text values. */
export function joinLinks(values: readonly (RichText | undefined | null)[]): string[] {
  return values.flatMap((value) => linksOf(value));
}

export function present(value: MediaRef | null | undefined): MediaRef[] {
  return value ? [value] : [];
}
