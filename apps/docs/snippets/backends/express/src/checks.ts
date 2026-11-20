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
import { error, readFragmentJson, type Fragment, type Issue } from '@builderset/engine';
import {
  checkForm,
  createFormRegistry,
  isDraftBlocking as formDraftBlocks,
  isPublishBlocking as formPublishBlocks,
  parseForm,
  type FormDocument,
} from '@builderset/form';

import { refused } from './http';

/**
 * Every document is checked here before it is stored, with the editor's own
 * rules: a draft may be unfinished but never unsafe, and publishing refuses
 * every error.
 */

export type Level = 'draft' | 'publish';
export type Checked<D> = { ok: true; document: D } | { ok: false; issues: Issue[] };

/** The languages the project writes in: a document in another is refused. */
const LOCALES = ['en', 'sq'];

/** Your email types, by key: the variables a template for each may use. */
export const EMAIL_TYPES: Record<string, EmailType> = {};

// One registry per kit and process: the elements a document may hold. Pass
// your own elements here too, or documents that use them are refused.
const registries = {
  email: createEmailRegistry(),
  article: createArticleRegistry(),
  form: createFormRegistry(),
};
export type Kit = keyof typeof registries;

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
  const document = parseEmail(raw, registries.email);
  const type = typeKey ? (EMAIL_TYPES[typeKey] ?? null) : null;
  const issues = checkEmail(raw as EmailDocument, registries.email, type, { locales: LOCALES });
  return verdict(document, issues, level === 'draft' ? emailDraftBlocks : emailPublishBlocks);
}

export function checkArticleDocument(raw: unknown, level: Level): Checked<ArticleDocument> {
  // parseArticle also brings an older document up to the current version.
  const parsed = parseArticle(raw, registries.article);
  if (!parsed.doc) return { ok: false, issues: parsed.issues };
  const issues = checkArticle(parsed.doc, registries.article, { locales: LOCALES });
  return verdict(parsed.doc, issues, level === 'draft' ? articleDraftBlocks : articlePublishBlocks);
}

export function checkFormDocument(raw: unknown, level: Level): Checked<FormDocument> {
  const document = parseForm(raw, registries.form);
  const issues = checkForm(raw as FormDocument, registries.form, { locales: LOCALES });
  const checked = verdict(
    document,
    issues,
    level === 'draft' ? formDraftBlocks : formPublishBlocks,
  );
  // A live form needs its address; a draft may not have one yet.
  if (checked.ok && level === 'publish' && !checked.document.meta.slug)
    return { ok: false, issues: [error('meta.slugMissing', { path: 'meta.slug' })] };
  return checked;
}

/**
 * A saved section: a fragment of the kit's own elements. Read the way a paste
 * is, so an element the kit does not have, or props that fail its schema, never
 * reach the library.
 */
export function checkSection(raw: unknown, kit: Kit): Checked<Fragment> {
  const envelope = JSON.stringify({ schema: 'builder/fragment', version: 1, fragment: raw });
  const fragment = readFragmentJson(envelope, registries[kit]);
  return fragment && fragment.roots.length > 0
    ? { ok: true, document: fragment }
    : { ok: false, issues: [error('fragment.malformed', { path: 'fragment' })] };
}

/** The checked document, or a 422 with the issues. */
export function passed<D>(checked: Checked<D>): D {
  if (!checked.ok) throw refused(checked.issues);
  return checked.document;
}
