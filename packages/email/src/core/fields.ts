import { isSafeUrl, mediaRefSchema } from '@motors/builder-core';
import { z } from 'zod';

import { EMAIL_FONTS, FONT_KEYS, type FontKey } from './fonts';
import { isTemplateString, TEMPLATE_TOKEN } from './variables';

/**
 * The field vocabulary the email blocks are written in.
 *
 * Email is not bound to the admin's theme — a newsletter is in the sender's
 * brand colours — so colours are free hex values, or a reference to the
 * brand kit (`brand.primary`) that follows the brand when it changes.
 */

export const BRAND_COLORS = [
  'primary',
  'secondary',
  'accent',
  'text',
  'muted',
  'background',
  'surface',
  'border',
] as const;
export type BrandColor = (typeof BRAND_COLORS)[number];

const HEX = /^#[0-9a-fA-F]{6}$/;
const BRAND = new RegExp(`^brand\\.(${BRAND_COLORS.join('|')})$`);

export const color = () =>
  z.string().refine((value) => HEX.test(value) || BRAND.test(value), { message: 'color.invalid' });

export const optionalColor = () => color().nullable();

export const px = (min: number, max: number) => z.number().int().min(min).max(max);

export const paddingSchema = z.object({
  top: px(0, 160),
  right: px(0, 160),
  bottom: px(0, 160),
  left: px(0, 160),
});
export type Padding = z.infer<typeof paddingSchema>;

export const pad = (top: number, right = top, bottom = top, left = right): Padding => ({
  top,
  right,
  bottom,
  left,
});

export const alignSchema = z.enum(['left', 'center', 'right']);

/** A short text that may carry `{{ variables }}`. */
export const templateText = (max = 300) => z.string().max(max);

/**
 * A link: a safe URL, a `{{ variable }}` that the type declares as a URL, or
 * a mix (`https://site/offer?ref={{ recipient.id }}`). Checked for safety
 * again after substitution, when the real values are known.
 */
export const templateUrl = () =>
  z
    .string()
    .max(2000)
    .refine((value) => value === '' || isSafeTemplateUrl(value), { message: 'url.unsafe' });

export function isSafeTemplateUrl(value: string): boolean {
  if (!isTemplateString(value)) return isSafeUrl(value);
  // A URL that STARTS with a variable is whatever the variable is — checked
  // at render time. Otherwise the fixed prefix must already be safe.
  const trimmed = value.trim();
  if (trimmed.startsWith('{{')) return true;
  const prefix = trimmed.split(TEMPLATE_TOKEN)[0] ?? '';
  return isSafeUrl(prefix || trimmed);
}

export const media = () => mediaRefSchema.nullable();

/** Every block's visibility: per device, and on a condition over the data. */
export const conditionSchema = z.object({
  var: z.string().max(120),
  op: z.enum(['exists', 'missing', 'eq', 'neq', 'gt', 'lt', 'contains']),
  value: z.string().max(200).optional(),
});
export type Condition = z.infer<typeof conditionSchema>;

export const displaySchema = z.object({
  hideOn: z.enum(['none', 'mobile', 'desktop']),
  /** Shown only when every condition holds. */
  when: z.array(conditionSchema).max(5),
});
export type Display = z.infer<typeof displaySchema>;

export const defaultDisplay = (): Display => ({ hideOn: 'none', when: [] });

/** Each font's CSS stack by key — see `fonts.ts` for the catalogue. */
export const FONT_STACKS = Object.fromEntries(
  Object.entries(EMAIL_FONTS).map(([key, font]) => [key, font.stack]),
) as Record<FontKey, string>;
export type FontStack = FontKey;
export const fontSchema = z.enum(FONT_KEYS);

/** A block's own font; absent or null follows the email's. */
export const blockFont = () => fontSchema.nullable().optional();
