// What differs between emails, articles and forms: which kit checks the
// document, which table keeps it, and what a new one needs from the request.
import {
  checkArticle,
  createArticleRegistry,
  isDraftBlocking as articleDraftBlocks,
  isPublishBlocking as articlePublishBlocks,
  parseArticle,
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
import {
  error,
  type ElementRegistry,
  type EngineDocument,
  type Issue,
} from 'npm:@builderset/engine@0.4.0';
import {
  checkForm,
  createFormRegistry,
  isDraftBlocking as formDraftBlocks,
  isPublishBlocking as formPublishBlocks,
  parseForm,
  type FormDocument,
} from 'npm:@builderset/form@0.4.0';

import { HttpError, notFound, type Json } from '../_shared/http.ts';

/** A draft may be unfinished but never unsafe; publishing refuses every error. */
export const Level = { draft: 'draft', publish: 'publish' } as const;
export type Level = (typeof Level)[keyof typeof Level];

type Checked = { ok: true; document: EngineDocument } | { ok: false; issues: Issue[] };

/** The languages the project writes in: a document in another is refused. */
const LOCALES = ['en', 'sq'];

/** Your email types, by key: the variables a template for each may use. */
const EMAIL_TYPES: Record<string, EmailType> = {};

const SLUG = /^[a-z0-9-]{1,200}$/;
const LOCALE = /^[a-z]{2}(-[A-Z]{2})?$/;

export interface Kind {
  table: 'email_template' | 'article' | 'form';
  /** Its name in a message: "There is no such email template." */
  noun: string;
  /** Its saved sections' `kit`. */
  kit: 'email' | 'article' | 'form';
  /** The elements a document may hold. Add your own here too, or documents that use them are refused. */
  registry: ElementRegistry;
  /** The column a list shows as the name, and searches. */
  nameColumn: 'name' | 'title';
  statuses: readonly string[];
  /** Whether publishing may wait for a `scheduled_at`. */
  schedules: boolean;
  check(raw: unknown, level: Level, typeKey: string | null): Checked;
  /** What create_document takes from the request, besides the document. */
  newColumns(body: Json): Json;
}

/** The checked document, or the issues that block it at this level. */
function verdict(
  document: EngineDocument | null,
  issues: Issue[],
  blocks: (issue: Issue) => boolean,
): Checked {
  const blocking = issues.filter(blocks);
  if (document && blocking.length === 0) return { ok: true, document };
  return { ok: false, issues: blocking.length ? blocking : [error('document.malformed')] };
}

const emailRegistry = createEmailRegistry();
const articleRegistry = createArticleRegistry();
const formRegistry = createFormRegistry();

const emails: Kind = {
  table: 'email_template',
  noun: 'email template',
  kit: 'email',
  registry: emailRegistry,
  nameColumn: 'name',
  statuses: ['draft', 'published'],
  schedules: false,
  check(raw, level, typeKey) {
    const type =
      typeKey !== null && Object.hasOwn(EMAIL_TYPES, typeKey) ? EMAIL_TYPES[typeKey] : null;
    // parseEmail only says yes or no; checkEmail says why, with the codes.
    const issues = checkEmail(raw as EmailDocument, emailRegistry, type, { locales: LOCALES });
    const blocks = level === Level.draft ? emailDraftBlocks : emailPublishBlocks;
    return verdict(parseEmail(raw, emailRegistry), issues, blocks);
  },
  // An unknown type is no type: the template is checked without variables.
  newColumns: (body) => ({
    p_type_key:
      typeof body.type_key === 'string' && Object.hasOwn(EMAIL_TYPES, body.type_key)
        ? body.type_key
        : null,
  }),
};

const articles: Kind = {
  table: 'article',
  noun: 'article',
  kit: 'article',
  registry: articleRegistry,
  nameColumn: 'title',
  statuses: ['draft', 'scheduled', 'published', 'archived'],
  schedules: true,
  check(raw, level) {
    // parseArticle also brings an older document up to the current version.
    const parsed = parseArticle(raw, articleRegistry);
    if (!parsed.doc) return { ok: false, issues: parsed.issues };
    const issues = checkArticle(parsed.doc, articleRegistry, { locales: LOCALES });
    const blocks = level === Level.draft ? articleDraftBlocks : articlePublishBlocks;
    return verdict(parsed.doc, issues, blocks);
  },
  // The address is the article's, chosen when it is made.
  newColumns({ slug, locale }) {
    if (typeof slug !== 'string' || !SLUG.test(slug))
      throw new HttpError(400, 'A new article needs a slug: a-z, 0-9 and -.');
    if (typeof locale !== 'string' || !LOCALE.test(locale))
      throw new HttpError(400, 'A new article needs a locale: en, sq, pt-BR.');
    return { p_slug: slug, p_locale: locale };
  },
};

const forms: Kind = {
  table: 'form',
  noun: 'form',
  kit: 'form',
  registry: formRegistry,
  nameColumn: 'name',
  statuses: ['draft', 'published', 'closed'],
  schedules: false,
  check(raw, level) {
    const issues = checkForm(raw as FormDocument, formRegistry, { locales: LOCALES });
    const blocks = level === Level.draft ? formDraftBlocks : formPublishBlocks;
    const checked = verdict(parseForm(raw, formRegistry), issues, blocks);
    // A live form needs its address; a draft may not have one yet.
    if (checked.ok && level === Level.publish && !(checked.document as FormDocument).meta.slug)
      return { ok: false, issues: [error('meta.slugMissing', { path: 'meta.slug' })] };
    return checked;
  },
  // The slug waits for publishing: until then the table gives it `draft-<uuid>`.
  newColumns: () => ({}),
};

/** The builders, by the path segment that names them: /documents/{kind}/… */
const KINDS: Record<string, Kind> = { emails, articles, forms };

export function kindOf(segment: string): Kind {
  const kind = Object.hasOwn(KINDS, segment) ? KINDS[segment] : undefined;
  if (!kind) throw notFound();
  return kind;
}

/** The document, checked at this level: a 422 with the editor's issue codes when it is refused. */
export function checkedDocument(
  kind: Kind,
  raw: unknown,
  level: Level,
  typeKey: string | null = null,
): EngineDocument {
  const result = kind.check(raw, level, typeKey);
  if (!result.ok) throw new HttpError(422, 'The document was refused.', { issues: result.issues });
  return result.document;
}
