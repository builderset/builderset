import { i18nSchema, nodeShapeSchema, type EngineDocument } from '@builderset/engine';
import { z } from 'zod';

/**
 * A form, as data.
 *
 * The engine's node tree — a root holding steps, each step holding fields —
 * with the form's own meta (its name, title, intro and address) and settings
 * (buttons, what happens after it is sent, spam rules, its look). It is never
 * HTML: the renderer draws it, and the same document validates the answers on
 * the server.
 */

export const FORM_SCHEMA = 'form/document' as const;
export const FORM_VERSION = 1;
export const FORM_ROOT = 'root';

const hex = () => z.string().regex(/^#[0-9a-fA-F]{6}$/);
const words = (max: number) => z.string().max(max);

/** The fonts a form may use: system stacks, and Google fonts the host page loads. */
export const FORM_FONTS = {
  system: {
    label: 'System',
    stack: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  },
  inter: { label: 'Inter', stack: '"Inter", ui-sans-serif, system-ui, sans-serif' },
  poppins: { label: 'Poppins', stack: '"Poppins", ui-sans-serif, system-ui, sans-serif' },
  sora: { label: 'Sora', stack: '"Sora", ui-sans-serif, system-ui, sans-serif' },
  georgia: { label: 'Georgia', stack: 'Georgia, "Times New Roman", serif' },
} as const;
export type FormFont = keyof typeof FORM_FONTS;
const FONT_KEYS = Object.keys(FORM_FONTS) as [FormFont, ...FormFont[]];

// #region shape
export const formSettingsSchema = z.object({
  /** How a form of several steps shows where the visitor is. */
  progress: z.enum(['bar', 'numbers', 'none']),
  /** The buttons' words. */
  buttons: z.object({ submit: words(60), next: words(60), back: words(60) }),
  /** What marks a field: required ones with an asterisk, optional ones in words, or both. */
  marker: z.enum(['asterisk', 'optional', 'both']),
  /** Visitors may leave and come back to a half-filled form. */
  saveProgress: z.boolean(),
  /** Fields with a `prefill` key fill themselves from the link: `?plate=AA123BC`. */
  prefill: z.boolean(),

  /** After the form is sent: a message, another page, or the message and then the page. */
  after: z.object({
    mode: z.enum(['message', 'redirect', 'both']),
    title: words(160),
    message: words(1000),
    redirectUrl: words(500),
  }),
  /** An email to the visitor right after they send it. `to` is the key of an email field. */
  autoReply: z.object({
    enabled: z.boolean(),
    to: words(40),
    fromName: words(80),
    replyTo: words(200),
    subject: words(200),
    body: words(5000),
  }),
  /** Who on the team hears about every response. */
  notify: z.object({
    enabled: z.boolean(),
    recipients: z.array(z.string().max(200)).max(20),
  }),
  /** Every response POSTed as JSON to this address. Empty: none. */
  webhook: words(500),

  spam: z.object({
    captcha: z.enum(['off', 'invisible', 'checkbox']),
    /** A field people never see and bots fill in. */
    honeypot: z.boolean(),
    blockDisposable: z.boolean(),
    rateLimit: z.boolean(),
  }),
  limits: z.object({
    /** One response per email, phone or device; `none` takes any number. */
    oncePer: z.enum(['none', 'email', 'phone', 'device']),
    /** The form closes itself after this many responses. */
    maxResponses: z.number().int().min(1).nullable(),
    /** ISO dates; the form takes responses between them. */
    opensAt: z.string().max(40).nullable(),
    closesAt: z.string().max(40).nullable(),
    closedMessage: words(500),
  }),
  privacy: z.object({
    /** Months responses are kept; 0 is forever. */
    keepMonths: z.union([z.literal(0), z.literal(3), z.literal(6), z.literal(12), z.literal(24)]),
    storeIp: z.boolean(),
  }),

  style: z.object({
    look: z.enum(['light', 'dark', 'warm']),
    width: z.number().int().min(360).max(960),
    labels: z.enum(['top', 'left', 'inside']),
    size: z.enum(['s', 'm', 'l']),
    radius: z.enum(['none', 's', 'm', 'l']),
    accent: hex(),
    font: z.enum(FONT_KEYS),
    fullWidthButtons: z.boolean(),
  }),
});
export type FormSettings = z.infer<typeof formSettingsSchema>;

export const formMetaSchema = z.object({
  /** The form's working name in the admin. */
  name: words(120),
  /** The title over the first step. */
  title: words(200),
  /** A line under the title. */
  intro: words(1000),
  /** Where it lives: `example.com/f/<slug>`. */
  slug: z
    .string()
    .regex(/^[a-z0-9-]*$/)
    .max(80),
});
export type FormMeta = z.infer<typeof formMetaSchema>;

/** The engine's node tree with a form's meta and settings. `i18n` holds the words in other languages. */
export interface FormDocument extends EngineDocument<FormMeta> {
  schema: typeof FORM_SCHEMA;
  settings: FormSettings;
}
// #endregion shape

export const defaultSettings = (): FormSettings => ({
  progress: 'bar',
  buttons: { submit: 'Send', next: 'Continue', back: 'Back' },
  marker: 'asterisk',
  saveProgress: true,
  prefill: true,
  after: {
    mode: 'message',
    title: 'Thank you! We got it.',
    message: 'We will get back to you soon.',
    redirectUrl: '',
  },
  autoReply: {
    enabled: false,
    to: 'email',
    fromName: '',
    replyTo: '',
    subject: 'We got your message, {{name}}',
    body: 'Hello {{name}},\n\nThank you for writing to us. We will get back to you soon.',
  },
  notify: { enabled: false, recipients: [] },
  webhook: '',
  spam: { captcha: 'invisible', honeypot: true, blockDisposable: false, rateLimit: true },
  limits: {
    oncePer: 'none',
    maxResponses: null,
    opensAt: null,
    closesAt: null,
    closedMessage: 'This form no longer takes responses.',
  },
  privacy: { keepMonths: 12, storeIp: false },
  style: {
    look: 'light',
    width: 640,
    labels: 'top',
    size: 'm',
    radius: 'm',
    accent: '#2f5cf0',
    font: 'system',
    fullWidthButtons: false,
  },
});

/** A form with one empty step. */
export function createFormDocument(meta: Partial<FormMeta> = {}): FormDocument {
  return {
    schema: FORM_SCHEMA,
    version: FORM_VERSION,
    root: FORM_ROOT,
    nodes: {
      [FORM_ROOT]: { id: FORM_ROOT, type: 'root', v: 1, props: {}, children: ['step1'] },
      step1: { id: 'step1', type: 'step', v: 1, props: { title: 'Step 1' }, children: [] },
    },
    meta: { name: '', title: '', intro: '', slug: '', ...meta },
    settings: defaultSettings(),
  };
}

export const formShapeSchema = z.object({
  schema: z.literal(FORM_SCHEMA),
  version: z.number().int().min(1),
  root: z.literal(FORM_ROOT),
  nodes: z.record(z.string(), nodeShapeSchema),
  meta: formMetaSchema,
  settings: formSettingsSchema,
  i18n: i18nSchema.optional(),
});
