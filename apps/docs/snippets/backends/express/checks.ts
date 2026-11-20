import {
  checkArticle,
  createArticleRegistry,
  isDraftBlocking as articleDraftBlocks,
  isPublishBlocking as articlePublishBlocks,
  parseArticle,
  type ArticleDocument,
} from '@builderset/article';
import {
  checkEmail,
  createEmailRegistry,
  isDraftBlocking as emailDraftBlocks,
  isPublishBlocking as emailPublishBlocks,
  parseEmail,
  type EmailDocument,
  type EmailType,
} from '@builderset/email';
import { error, type Issue } from '@builderset/engine';
import {
  checkForm,
  createFormRegistry,
  isDraftBlocking as formDraftBlocks,
  isPublishBlocking as formPublishBlocks,
  parseForm,
  type FormDocument,
} from '@builderset/form';

/**
 * Every document is checked here before it is stored, with the editor's own
 * rules: a draft may be unfinished but never unsafe, and publishing refuses
 * every error. A refusal carries the issue codes, so the editor shows each
 * problem on its block.
 */

export type Level = 'draft' | 'publish';
export type Checked<D> = { ok: true; document: D } | { ok: false; issues: Issue[] };

/** The languages the project writes in: a document in another is refused. */
const LOCALES = ['en', 'sq'];

/** Your email types, by key: the variables a template for each may use. */
export const EMAIL_TYPES: Record<string, EmailType> = {};

// One registry per kit and process: the elements a document may hold. Pass
// your own elements here too, or documents that use them are refused.
const emailRegistry = createEmailRegistry();
const articleRegistry = createArticleRegistry();
const formRegistry = createFormRegistry();

function verdict<D>(
  document: D | null,
  issues: Issue[],
  blocks: (issue: Issue) => boolean,
): Checked<D> {
  const blocking = issues.filter(blocks);
  if (document && blocking.length === 0) return { ok: true, document };
  // Not the kit's shape at all, and nothing more precise to say.
  return { ok: false, issues: blocking.length ? blocking : [error('document.malformed')] };
}

export function checkEmailDocument(
  raw: unknown,
  level: Level,
  typeKey: string | null,
): Checked<EmailDocument> {
  // parseEmail only says yes or no; checkEmail says why, with the codes.
  const document = parseEmail(raw, emailRegistry);
  const type = typeKey ? (EMAIL_TYPES[typeKey] ?? null) : null;
  const issues = checkEmail(raw as EmailDocument, emailRegistry, type, { locales: LOCALES });
  return verdict(document, issues, level === 'draft' ? emailDraftBlocks : emailPublishBlocks);
}

export function checkArticleDocument(raw: unknown, level: Level): Checked<ArticleDocument> {
  // parseArticle also brings an older document up to the current version.
  const parsed = parseArticle(raw, articleRegistry);
  if (!parsed.doc) return { ok: false, issues: parsed.issues };
  const issues = checkArticle(parsed.doc, articleRegistry, { locales: LOCALES });
  return verdict(parsed.doc, issues, level === 'draft' ? articleDraftBlocks : articlePublishBlocks);
}

export function checkFormDocument(raw: unknown, level: Level): Checked<FormDocument> {
  const document = parseForm(raw, formRegistry);
  const issues = checkForm(raw as FormDocument, formRegistry, { locales: LOCALES });
  return verdict(document, issues, level === 'draft' ? formDraftBlocks : formPublishBlocks);
}
