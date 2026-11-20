import type { TemplateCategory } from '@builderset/engine/editor';

import type { SettingsPatch, StepSpec } from '../core';

/**
 * The groups the Templates tab lists form templates under, in this order. A
 * category's folder (`./contact`, `./bookings`, …) holds its templates.
 */
export const FORM_TEMPLATE_CATEGORIES = [
  {
    id: 'contact',
    name: { en: 'Contact & leads', sq: 'Kontakt e kërkesa', de: 'Kontakt & Anfragen' },
  },
  {
    id: 'bookings',
    name: { en: 'Bookings & events', sq: 'Rezervime e ngjarje', de: 'Buchungen & Events' },
  },
  {
    id: 'feedback',
    name: { en: 'Surveys & feedback', sq: 'Anketa e mendime', de: 'Umfragen & Feedback' },
  },
  { id: 'signup', name: { en: 'Sign-ups', sq: 'Regjistrime', de: 'Anmeldungen' } },
  { id: 'applications', name: { en: 'Applications', sq: 'Aplikime', de: 'Bewerbungen' } },
  {
    id: 'orders',
    name: { en: 'Orders & requests', sq: 'Porosi e kërkesa', de: 'Bestellungen & Anträge' },
  },
] as const satisfies readonly TemplateCategory[];

export type FormTemplateCategory = (typeof FORM_TEMPLATE_CATEGORIES)[number]['id'];

/**
 * A form template: the outline `buildForm` takes (steps of fields), the title
 * and intro it starts with and the settings it wants. Words are in English;
 * the person building it rewords and translates them in the editor.
 *
 * Fields the template cannot do without carry a `lock` — why it needs them
 * ("Bookings need a time"). They stay required and cannot be removed, only
 * reworded and moved.
 */
export interface FormTemplate {
  id: string;
  category: FormTemplateCategory;
  name: { en: string; sq: string; de: string };
  description: { en: string; sq: string; de: string };
  title: string;
  intro: string;
  /** Only what differs from the default settings, group by group. */
  settings?: SettingsPatch | undefined;
  steps: readonly StepSpec[];
}

/** Identity, typed: a template file reads `export default defineTemplate({ … })`. */
export function defineTemplate(template: FormTemplate): FormTemplate {
  return template;
}
