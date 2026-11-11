import {
  error,
  hasErrors,
  migrateElements,
  readStored,
  type ElementRegistry,
  type ParseResult,
} from '@motors/engine';

import { checkArticle } from './check';
import {
  DOCUMENT_SCHEMA,
  DOCUMENT_VERSION,
  articleShapeSchema,
  type ArticleDocument,
} from './document';

/**
 * Reading a stored article back, however old it is.
 *
 * Two kinds of change are migrated, in this order:
 *  1. DOCUMENT migrations, keyed by `version`, for changes to the envelope
 *     itself (none yet — version 1 is the first).
 *  2. ELEMENT migrations, through the engine's `migrateElements`.
 * Then the whole thing is checked. A document from the future — a newer
 * version than this code knows — is refused rather than guessed at.
 */

type DocumentMigration = (raw: Record<string, unknown>) => Record<string, unknown>;

/** `DOCUMENT_MIGRATIONS[n]` turns a version-n document into version n+1. */
const DOCUMENT_MIGRATIONS: Record<number, DocumentMigration> = {};

export function parseArticle(
  raw: unknown,
  registry: ElementRegistry,
): ParseResult<ArticleDocument> {
  let value = readStored(raw);
  if (!value) {
    return { ok: false, doc: null, issues: [error('document.notJson')], migrated: false };
  }

  if (value.schema !== DOCUMENT_SCHEMA) {
    return {
      ok: false,
      doc: null,
      issues: [error('document.malformed', { path: 'schema' })],
      migrated: false,
    };
  }

  let migrated = false;
  let version = typeof value.version === 'number' ? value.version : 0;
  if (version > DOCUMENT_VERSION) {
    return {
      ok: false,
      doc: null,
      issues: [error('document.fromTheFuture', { params: { version } })],
      migrated,
    };
  }
  while (version < DOCUMENT_VERSION) {
    const step = DOCUMENT_MIGRATIONS[version];
    if (!step) {
      return {
        ok: false,
        doc: null,
        issues: [error('document.cannotMigrate', { params: { version } })],
        migrated,
      };
    }
    value = { ...step(value), version: version + 1 };
    version += 1;
    migrated = true;
  }

  const shape = articleShapeSchema.safeParse(value);
  if (!shape.success) {
    return {
      ok: false,
      doc: null,
      issues: shape.error.issues.map((issue) =>
        error('document.malformed', { path: issue.path.join('.') }),
      ),
      migrated,
    };
  }

  const doc: ArticleDocument = structuredClone(shape.data);
  const elements = migrateElements(doc, registry);
  if (!elements.ok) {
    return {
      ok: false,
      doc: null,
      issues: elements.issues,
      migrated: migrated || elements.migrated,
    };
  }
  migrated ||= elements.migrated;

  const issues = checkArticle(doc, registry);
  return { ok: !hasErrors(issues), doc, issues, migrated };
}

/** The article as stored: plain JSON, stable key order for the envelope. */
export function serializeArticle(doc: ArticleDocument): string {
  const { schema, version, root, meta, nodes } = doc;
  return JSON.stringify({ schema, version, root, meta, nodes });
}
