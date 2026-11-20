import type { TemplateCategory } from '@builderset/engine/editor';

import type { EmailSettings, SectionSpec } from '../core';

/**
 * The groups the Modules tab lists email templates under, in this order. A
 * category's folder (`./newsletter`, `./verification`, …) holds its templates.
 */
export const EMAIL_TEMPLATE_CATEGORIES = [
  { id: 'newsletter', name: { en: 'Newsletters', sq: 'Buletine', de: 'Newsletter' } },
  {
    id: 'verification',
    name: { en: 'Codes & verification', sq: 'Kode e verifikim', de: 'Codes & Bestätigung' },
  },
  { id: 'welcome', name: { en: 'Welcome', sq: 'Mirëseardhje', de: 'Willkommen' } },
  { id: 'account', name: { en: 'Account & security', sq: 'Llogaria', de: 'Konto & Sicherheit' } },
  { id: 'orders', name: { en: 'Orders & receipts', sq: 'Porosi e fatura', de: 'Bestellungen' } },
  { id: 'promotions', name: { en: 'Promotions', sq: 'Oferta', de: 'Aktionen' } },
  { id: 'events', name: { en: 'Events & reminders', sq: 'Ngjarje e kujtesa', de: 'Termine' } },
] as const satisfies readonly TemplateCategory[];

export type EmailTemplateCategory = (typeof EMAIL_TEMPLATE_CATEGORIES)[number]['id'];

/**
 * An email template: the outline `buildEmail` takes (sections › rows ›
 * columns › blocks), the inbox lines it starts with and the look it wants.
 * Words are in English; the writer translates them in the editor.
 */
export interface EmailTemplate {
  id: string;
  category: EmailTemplateCategory;
  name: { en: string; sq: string; de: string };
  description: { en: string; sq: string; de: string };
  /** The subject it starts with; may hold `{{ variables }}`. */
  subject: string;
  /** The grey line after the subject. */
  preheader: string;
  /** The look: only what differs from `defaultSettings()`. */
  settings?: Partial<EmailSettings> | undefined;
  /**
   * The variables it uses beyond the system ones (`recipient.name`,
   * `links.unsubscribe`, …): what an email type needs to declare for it.
   */
  variables?: readonly string[] | undefined;
  sections: readonly SectionSpec[];
}

/** Identity, typed: a template file reads `export default defineTemplate({ … })`. */
export function defineTemplate(template: EmailTemplate): EmailTemplate {
  return template;
}
