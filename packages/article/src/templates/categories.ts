import type { TemplateCategory, TemplateSpec } from '@builderset/engine/editor';

/**
 * The groups the templates panel lists article templates under, in this
 * order. A category's folder (`./guides`, `./news`, …) holds its templates.
 */
export const ARTICLE_TEMPLATE_CATEGORIES = [
  { id: 'essentials', name: { en: 'Essentials', sq: 'Bazat', de: 'Grundlagen' } },
  { id: 'guides', name: { en: 'Guides', sq: 'Udhëzues', de: 'Ratgeber' } },
  { id: 'lists', name: { en: 'Lists', sq: 'Lista', de: 'Listen' } },
  { id: 'reviews', name: { en: 'Reviews', sq: 'Recensione', de: 'Tests' } },
  { id: 'news', name: { en: 'News', sq: 'Lajme', de: 'Neuigkeiten' } },
] as const satisfies readonly TemplateCategory[];

export type ArticleTemplateCategory = (typeof ARTICLE_TEMPLATE_CATEGORIES)[number]['id'];

/** An article template: a `TemplateSpec` whose category is one of the article's. */
export interface ArticleTemplate extends TemplateSpec {
  category: ArticleTemplateCategory;
  name: { en: string; sq: string; de: string };
  description: { en: string; sq: string; de: string };
}

/** Identity, typed: a template file reads `export default defineTemplate({ … })`. */
export function defineTemplate(template: ArticleTemplate): ArticleTemplate {
  return template;
}
