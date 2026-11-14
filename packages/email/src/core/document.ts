import { i18nSchema, nodeShapeSchema, type EngineDocument } from '@builderset/engine';
import { z } from 'zod';

import { color, fontSchema, px } from './fields';

/**
 * An email template, as data.
 *
 * The same normalized node tree as the article builder (so the operations,
 * the history and the tree checks are shared), with email's own meta — the
 * subject line and the preheader — and settings: width, colours, fonts, dark
 * mode. It is never HTML; HTML is what the renderer makes of it.
 */

export const EMAIL_SCHEMA = 'email/document' as const;
export const EMAIL_VERSION = 1;
export const EMAIL_ROOT = 'root';

export const emailSettingsSchema = z.object({
  /** The content column, in px. 600 is what every client handles well. */
  width: px(480, 800),
  /** Around the email. */
  backdrop: color(),
  /** Behind the content column. */
  background: color(),
  font: fontSchema,
  fontSize: px(12, 22),
  lineHeight: z.number().min(1.1).max(2.2),
  textColor: color(),
  headingColor: color(),
  linkColor: color(),
  /**
   * `auto` lets each client darken the email its own way; `custom` sends the
   * dark palette below to the clients that honour one (Apple Mail, Outlook.com,
   * the Gmail app via its attribute selectors).
   */
  darkMode: z.enum(['auto', 'custom']),
  dark: z.object({
    backdrop: color(),
    background: color(),
    text: color(),
    heading: color(),
    link: color(),
  }),
  /** Tracking parameters appended to every external link. */
  utm: z.object({
    enabled: z.boolean(),
    source: z.string().max(60),
    medium: z.string().max(60),
    campaign: z.string().max(80),
  }),
});
export type EmailSettings = z.infer<typeof emailSettingsSchema>;

export const emailMetaSchema = z.object({
  /** The template's working name in the admin. */
  name: z.string().max(120),
  /** Plain text with `{{ variables }}`. */
  subject: z.string().max(200),
  /** The grey line after the subject in the inbox. */
  preheader: z.string().max(250),
});
export type EmailMeta = z.infer<typeof emailMetaSchema>;

/** The engine's node tree with an email's meta and settings. `i18n` holds the subject, preheader and words in other languages. */
export interface EmailDocument extends EngineDocument<EmailMeta> {
  schema: typeof EMAIL_SCHEMA;
  settings: EmailSettings;
}

export const defaultSettings = (): EmailSettings => ({
  width: 600,
  backdrop: '#f4f4f5',
  background: '#ffffff',
  font: 'system',
  fontSize: 16,
  lineHeight: 1.6,
  textColor: 'brand.text',
  headingColor: 'brand.text',
  linkColor: 'brand.primary',
  darkMode: 'auto',
  dark: {
    backdrop: '#0b0b0c',
    background: '#18181b',
    text: '#e4e4e7',
    heading: '#fafafa',
    link: '#93c5fd',
  },
  utm: { enabled: false, source: 'email', medium: 'email', campaign: '' },
});

export function createEmailDocument(meta: Partial<EmailMeta> = {}): EmailDocument {
  return {
    schema: EMAIL_SCHEMA,
    version: EMAIL_VERSION,
    root: EMAIL_ROOT,
    nodes: { [EMAIL_ROOT]: { id: EMAIL_ROOT, type: 'root', v: 1, props: {}, children: [] } },
    meta: { name: '', subject: '', preheader: '', ...meta },
    settings: defaultSettings(),
  };
}

export const emailShapeSchema = z.object({
  schema: z.literal(EMAIL_SCHEMA),
  version: z.number().int().min(1),
  root: z.literal(EMAIL_ROOT),
  nodes: z.record(z.string(), nodeShapeSchema),
  meta: emailMetaSchema,
  settings: emailSettingsSchema,
  i18n: i18nSchema.optional(),
});
