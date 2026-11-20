import type { BuildCardOptions, CardFormat, CardPatch, SideSpec } from '../core';

/**
 * The groups the Templates tab lists card designs under, in this order. A
 * category's folder (`./membership`, `./id`, …) holds its designs.
 */
export const CARD_TEMPLATE_CATEGORIES = [
  { id: 'membership', name: { en: 'Membership', sq: 'Anëtarësi', de: 'Mitgliedschaft' } },
  { id: 'id', name: { en: 'ID & staff', sq: 'ID e stafi', de: 'Ausweis & Personal' } },
  { id: 'bank', name: { en: 'Bank & gift', sq: 'Bankë e dhurata', de: 'Bank & Geschenk' } },
  { id: 'business', name: { en: 'Business cards', sq: 'Kartëvizita', de: 'Visitenkarten' } },
  { id: 'event', name: { en: 'Event badges', sq: 'Bexhe eventesh', de: 'Event-Badges' } },
  { id: 'wallet', name: { en: 'Wallet', sq: 'Portofol digjital', de: 'Wallet' } },
] as const;

export type CardTemplateCategory = (typeof CARD_TEMPLATE_CATEGORIES)[number]['id'];

/**
 * A card design: a format, its front and back as the outline `buildCard`
 * takes, and what else of the format it changes (one side, a bleed). The
 * words on it are the design's own — Albanian, as the cards are printed for
 * marrimauto — and are reworded in the editor.
 */
export interface CardTemplate {
  id: string;
  category: CardTemplateCategory;
  name: { en: string; sq: string; de: string };
  description: { en: string; sq: string; de: string };
  format: CardFormat;
  card?: CardPatch | undefined;
  front: SideSpec;
  back: SideSpec;
}

/** Identity, typed: a template file reads `export default defineCardTemplate({ … })`. */
export function defineCardTemplate(template: CardTemplate): CardTemplate {
  return template;
}

/** The outline a template builds from. */
export function templateOptions(template: CardTemplate): BuildCardOptions {
  return {
    format: template.format,
    card: template.card,
    front: template.front,
    back: template.back,
  };
}
