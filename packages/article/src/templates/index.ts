/**
 * The article's templates, one folder per category and one file per
 * template:
 *
 *   templates/
 *     categories.ts       the categories, in panel order, and defineTemplate
 *     blocks.ts           builders for a template's blocks (heading, lead, faq, …)
 *     essentials/         standard, opinion, interview
 *     guides/             how-to, checklist, explainer
 *     lists/              listicle, top picks
 *     reviews/            review, comparison, buyer's guide
 *     news/               story, announcement, progress update
 *
 * To add a template: write `<category>/<name>.ts` with `defineTemplate`, and
 * list it in that folder's `index.ts`. To add a category: add it to
 * `categories.ts`, make its folder, and list the folder below.
 * `templates.test.ts` builds every template against the elements' schemas.
 */
import type { ArticleTemplate } from './categories';
import { ESSENTIALS } from './essentials';
import { GUIDES } from './guides';
import { LISTS } from './lists';
import { NEWS } from './news';
import { REVIEWS } from './reviews';

export {
  ARTICLE_TEMPLATE_CATEGORIES,
  defineTemplate,
  type ArticleTemplate,
  type ArticleTemplateCategory,
} from './categories';

/** Every article template, category by category. */
export const ARTICLE_TEMPLATES: readonly ArticleTemplate[] = [
  ...ESSENTIALS,
  ...GUIDES,
  ...LISTS,
  ...REVIEWS,
  ...NEWS,
];
