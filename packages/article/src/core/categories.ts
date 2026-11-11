/**
 * The groups the article's elements are listed under in the insert panel, in
 * order. `plugin` is where a host's own elements go.
 */
export const ARTICLE_CATEGORIES = [
  'layout',
  'text',
  'media',
  'article',
  'engagement',
  'plugin',
] as const;

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];
