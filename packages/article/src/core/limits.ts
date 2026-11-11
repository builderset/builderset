/**
 * Ceilings on an article's content, on top of the engine's `LIMITS` on the
 * tree. Enforced by the elements' schemas, so the editor and the server agree.
 */
export const ARTICLE_LIMITS = {
  /** Characters in a short plain-text field — a title, a label, a caption. */
  shortText: 300,
  /** Characters in a long plain-text field — a code block, a description. */
  longText: 20_000,
  /** Items in a list, a FAQ, a timeline, a gallery of steps. */
  listItems: 40,
  tableRows: 60,
  tableColumns: 8,
  galleryImages: 24,
} as const;

export type ArticleLimits = typeof ARTICLE_LIMITS;
