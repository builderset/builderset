// The three builders' checks and columns, for the documents function.
import {
  checkArticle,
  createArticleRegistry,
  isDraftBlocking as articleDraftBlocks,
  isPublishBlocking as articlePublishBlocks,
  parseArticle,
  type ArticleDocument,
} from 'npm:@builderset/article@0.4.0';
import {
  checkEmail,
  createEmailRegistry,
  isDraftBlocking as emailDraftBlocks,
  isPublishBlocking as emailPublishBlocks,
  parseEmail,
  type EmailDocument,
  type EmailType,
} from 'npm:@builderset/email@0.4.0';
import { error, type EngineDocument, type Issue } from 'npm:@builderset/engine@0.4.0';
import {
  checkForm,
  createFormRegistry,
  isDraftBlocking as formDraftBlocks,
  isPublishBlocking as formPublishBlocks,
  parseForm,
  type FormDocument,
} from 'npm:@builderset/form@0.4.0';

export type Level = 'draft' | 'publish';
export type Checked = { ok: true; document: EngineDocument } | { ok: false; issues: Issue[] };
type Row = Record<string, unknown>;

/** The languages the project writes in: a document in another is refused. */
const LOCALES = ['en', 'sq'];

/** Your email types, by key: the variables a template for each may use. */
const EMAIL_TYPES: Record<string, EmailType> = {};

// One registry per kit: the elements a document may hold. Add your own
// elements here too, or documents that use them are refused.
const emailRegistry = createEmailRegistry();
const articleRegistry = createArticleRegistry();
const formRegistry = createFormRegistry();

/** A draft may be unfinished but never unsafe; publishing refuses every error. */
function verdict(
  document: EngineDocument | null,
  issues: Issue[],
  blocks: (issue: Issue) => boolean,
): Checked {
  const blocking = issues.filter(blocks);
  if (document && blocking.length === 0) return { ok: true, document };
  return { ok: false, issues: blocking.length ? blocking : [error('document.malformed')] };
}

/** What differs between emails, articles and forms. */
export interface Kind {
  table: 'email_template' | 'article' | 'form';
  noun: string;
  check(raw: unknown, level: Level, row: Row): Checked;
  /** Copies of the live document's meta, for lists and search. */
  copies(document: EngineDocument): Row;
  /** The columns a new row takes from the request; null when it lacks them. */
  create(body: Row, document: EngineDocument, userId: string): Row | null;
  unpublished: string;
  schedules?: boolean;
}

export const KINDS: Record<string, Kind> = {
  emails: {
    table: 'email_template',
    noun: 'email template',
    check(raw, level, row) {
      const typeKey = typeof row.type_key === 'string' ? row.type_key : '';
      const type = Object.hasOwn(EMAIL_TYPES, typeKey) ? EMAIL_TYPES[typeKey] : null;
      // parseEmail only says yes or no; checkEmail says why, with the codes.
      const issues = checkEmail(raw as EmailDocument, emailRegistry, type, { locales: LOCALES });
      const blocks = level === 'draft' ? emailDraftBlocks : emailPublishBlocks;
      return verdict(parseEmail(raw, emailRegistry), issues, blocks);
    },
    copies: (document) => ({ name: (document as EmailDocument).meta.name }),
    create: (body, _document, userId) => ({
      type_key:
        typeof body.type_key === 'string' && Object.hasOwn(EMAIL_TYPES, body.type_key)
          ? body.type_key
          : null,
      created_by: userId,
    }),
    unpublished: 'draft',
  },

  articles: {
    table: 'article',
    noun: 'article',
    check(raw, level) {
      // parseArticle also brings an older document up to the current version.
      const parsed = parseArticle(raw, articleRegistry);
      if (!parsed.doc) return { ok: false, issues: parsed.issues };
      const issues = checkArticle(parsed.doc, articleRegistry, { locales: LOCALES });
      const blocks = level === 'draft' ? articleDraftBlocks : articlePublishBlocks;
      return verdict(parsed.doc, issues, blocks);
    },
    copies(document) {
      const { meta } = document as ArticleDocument;
      return {
        title: meta.title,
        excerpt: meta.excerpt ?? '',
        cover_key: meta.cover?.media.key ?? null,
        cover_alt: meta.cover?.alt ?? null,
      };
    },
    // The address is the article's, chosen when it is made.
    create: (body, _document, userId) =>
      typeof body.slug === 'string' &&
      /^[a-z0-9-]{1,200}$/.test(body.slug) &&
      typeof body.locale === 'string' &&
      /^[a-z]{2}(-[A-Z]{2})?$/.test(body.locale)
        ? { slug: body.slug, locale: body.locale, author_id: userId }
        : null,
    unpublished: 'draft',
    schedules: true,
  },

  forms: {
    table: 'form',
    noun: 'form',
    check(raw, level) {
      const issues = checkForm(raw as FormDocument, formRegistry, { locales: LOCALES });
      const blocks = level === 'draft' ? formDraftBlocks : formPublishBlocks;
      const checked = verdict(parseForm(raw, formRegistry), issues, blocks);
      // A live form needs its address; a draft may not have one yet.
      if (checked.ok && level === 'publish' && !(checked.document as FormDocument).meta.slug)
        return { ok: false, issues: [error('meta.slugMissing', { path: 'meta.slug' })] };
      return checked;
    },
    copies(document) {
      const { meta } = document as FormDocument;
      return { name: meta.name, slug: meta.slug };
    },
    // The slug is unique and required, and a new form often has none yet.
    create: (_body, document, userId) => ({
      slug: (document as FormDocument).meta.slug || `draft-${crypto.randomUUID()}`,
      created_by: userId,
    }),
    // A closed form keeps its link and shows its closed message.
    unpublished: 'closed',
  },
};
