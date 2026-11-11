import { markSchema } from '@motors/builder-core';
import { z } from 'zod';

import { FONT_KEYS } from './fonts';
import { FORMATS, VARIABLE_PATH } from './variables';

/**
 * Email rich text: the article builder's runs and marks, plus one more mark —
 * a variable. A variable run's text is only its label in the editor; at send
 * time the renderer replaces it with the value (escaped), keeping any other
 * marks, so "Hi **{{ recipient.name }}**" renders the name in bold.
 */

export const variableMarkSchema = z.object({
  type: z.literal('variable'),
  path: z.string().regex(VARIABLE_PATH),
  format: z.enum(FORMATS).optional(),
  /** Used when the value is missing — "there" in "Hi there". */
  fallback: z.string().max(120).optional(),
});
export type VariableMark = z.infer<typeof variableMarkSchema>;

/** A font for part of a text — "this word in Playfair Display", as in Word. */
export const fontMarkSchema = z.object({
  type: z.literal('font'),
  family: z.enum(FONT_KEYS),
});
export type FontMark = z.infer<typeof fontMarkSchema>;

export const emailMarkSchema = z.union([markSchema, variableMarkSchema, fontMarkSchema]);
export type EmailMark = z.infer<typeof emailMarkSchema>;

export const emailRunSchema = z.object({
  text: z.string().max(20_000),
  marks: z.array(emailMarkSchema).max(10).optional(),
});
export type EmailRun = z.infer<typeof emailRunSchema>;

export const emailRichTextSchema = z.array(emailRunSchema).max(600);
export type EmailRichText = EmailRun[];

export const richText = () => emailRichTextSchema;

export function et(text: string): EmailRichText {
  return text ? [{ text }] : [];
}

/** A variable as a run, for defaults and templates. */
export function v(path: string, fallback?: string): EmailRun {
  return {
    text: `{{${path}}}`,
    marks: [{ type: 'variable', path, ...(fallback ? { fallback } : {}) }],
  };
}

export function variableOf(run: EmailRun): VariableMark | undefined {
  return run.marks?.find((mark): mark is VariableMark => mark.type === 'variable');
}

export function plainOf(value: EmailRichText | undefined | null): string {
  return (value ?? []).map((run) => run.text).join('');
}

export function linksIn(value: EmailRichText | undefined | null): string[] {
  const links: string[] = [];
  for (const run of value ?? []) {
    for (const mark of run.marks ?? []) if (mark.type === 'link') links.push(mark.href);
  }
  return links;
}
