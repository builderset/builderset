import type { TemplateCategory } from '@builderset/engine/editor';

import type { ElementSpec, FormatPatch } from '../core';

/**
 * The groups the Templates tab lists popup templates under, in this order. A
 * category's folder (`./leads`, `./offers`, …) holds its templates.
 */
export const POPUP_TEMPLATE_CATEGORIES = [
  { id: 'leads', name: { en: 'Lead capture', sq: 'Kërkesa nga klientët', de: 'Leads gewinnen' } },
  { id: 'offers', name: { en: 'Offers & sales', sq: 'Oferta e ulje', de: 'Angebote & Aktionen' } },
  {
    id: 'announcements',
    name: { en: 'Announcements', sq: 'Njoftime', de: 'Ankündigungen' },
  },
  { id: 'newsletter', name: { en: 'Newsletter', sq: 'Buletini', de: 'Newsletter' } },
  {
    id: 'consent',
    name: { en: 'Cookies & consent', sq: 'Cookies e pëlqimi', de: 'Cookies & Einwilligung' },
  },
  { id: 'feedback', name: { en: 'Feedback', sq: 'Mendime', de: 'Feedback' } },
  { id: 'app', name: { en: 'App download', sq: 'Shkarko aplikacionin', de: 'App-Download' } },
] as const satisfies readonly TemplateCategory[];

export type PopupTemplateCategory = (typeof POPUP_TEMPLATE_CATEGORIES)[number]['id'];

/**
 * A popup template: its format (type, size, look, display rules, motion) and
 * its elements, as `buildPopup` takes them. Its words are in Albanian, for
 * marrimauto.com; the person building it rewords and translates them in the
 * editor.
 */
export interface PopupTemplate {
  id: string;
  category: PopupTemplateCategory;
  name: { en: string; sq: string; de: string };
  description: { en: string; sq: string; de: string };
  /** Only what differs from the type's default format; `type` is required. */
  format: FormatPatch & { type: NonNullable<FormatPatch['type']> };
  elements: readonly ElementSpec[];
}

/** Identity, typed: a template file reads `export default defineTemplate({ … })`. */
export function defineTemplate(template: PopupTemplate): PopupTemplate {
  return template;
}
