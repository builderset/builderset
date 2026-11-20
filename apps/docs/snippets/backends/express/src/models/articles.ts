import type { ArticleDocument } from '@builderset/article';
import { error, type Issue } from '@builderset/engine';

import { checkArticleDocument } from '../checks';
import { refused, textOf } from '../http';
import { AUDIT_PEOPLE, type Audited } from './base';
import type { DocumentColumns, DocumentModel, Revision } from './document';

export const ARTICLE_STATUSES = ['draft', 'scheduled', 'published', 'archived'] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

/** A row of article: one page of your blog or help centre, in one language. */
export interface Article extends Audited, DocumentColumns<ArticleDocument, ArticleStatus> {
  /** The address, unique with `locale` among live articles. */
  slug: string;
  locale: string;
  /** A job of yours publishes a scheduled article then. */
  scheduled_at: Date | null;
  // Copies of document.meta, for lists, search and cards.
  title: string;
  excerpt: string;
  cover_key: string | null;
  cover_alt: string | null;
  /** The byline: not always who created the row. */
  author_id: number | null;
}

export interface ArticleRevision extends Revision<ArticleDocument> {
  article_id: number;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LOCALE = /^[a-z]{2}(?:-[A-Z]{2})?$/;

export const articles: DocumentModel<ArticleDocument, Article> = {
  table: 'article',
  revisions: { table: 'article_revision', parent: 'article_id' },
  kit: 'article',
  noun: 'article',
  statuses: ARTICLE_STATUSES,
  people: [...AUDIT_PEOPLE, 'published_by_id', 'author_id'],
  listColumns: ['title', 'slug', 'locale', 'scheduled_at'],

  check: (raw, level) => checkArticleDocument(raw, level),

  copies: ({ meta }) => ({
    title: meta.title.slice(0, 300),
    excerpt: (meta.excerpt ?? '').slice(0, 600),
    cover_key: meta.cover?.media.key ?? null,
    cover_alt: meta.cover?.alt ?? null,
  }),

  // The address is the article's, not the document's: chosen when it is made.
  newRow(body, actor) {
    const slug = textOf(body.slug, 200);
    const locale = textOf(body.locale, 10);
    const slugOk = slug !== null && SLUG.test(slug);
    const localeOk = locale !== null && LOCALE.test(locale);
    if (slugOk && localeOk) return { slug, locale, author_id: actor.id };
    const issues: Issue[] = [];
    if (!slugOk) issues.push(error('slug.invalid', { path: 'slug' }));
    if (!localeOk) issues.push(error('locale.invalid', { path: 'locale' }));
    throw refused(issues);
  },

  // A future scheduled_at waits for your job; publishing now keeps the first
  // published_at, which the site's list sorts by.
  publish: (row, _document, scheduledAt) =>
    scheduledAt
      ? { status: 'scheduled', action: 'scheduled', columns: { scheduled_at: scheduledAt } }
      : {
          status: 'published',
          action: 'published',
          columns: { scheduled_at: null, published_at: row.published_at ?? new Date() },
        },

  unpublish: () => ({ status: 'draft', action: 'unpublished', columns: { scheduled_at: null } }),
};
