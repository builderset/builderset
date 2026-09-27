import {
  DOCUMENT_SCHEMA,
  DOCUMENT_VERSION,
  documentShapeSchema,
  type BuilderDocument,
} from './document';
import { error, type Issue } from './issues';
import type { ElementRegistry } from './registry';
import { checkDocument, hasErrors } from './validate';

/**
 * Reading a stored document back, however old it is.
 *
 * Two kinds of change are migrated, in this order:
 *  1. DOCUMENT migrations, keyed by `version`, for changes to the envelope
 *     itself (none yet — version 1 is the first).
 *  2. ELEMENT migrations: each node whose `v` is behind its element's
 *     `version` is walked forward one version at a time through the element's
 *     own `migrate`, so an element can change its props without the rest of
 *     the library knowing.
 * Then the whole thing is checked. A document from the future — a newer
 * version than this code knows — is refused rather than guessed at.
 */

type DocumentMigration = (raw: Record<string, unknown>) => Record<string, unknown>;

/** `DOCUMENT_MIGRATIONS[n]` turns a version-n document into version n+1. */
const DOCUMENT_MIGRATIONS: Record<number, DocumentMigration> = {};

export interface ParseResult {
  ok: boolean;
  doc: BuilderDocument | null;
  issues: Issue[];
  /** Whether anything was migrated — worth saving back once it is. */
  migrated: boolean;
}

export function parseDocument(raw: unknown, registry: ElementRegistry): ParseResult {
  let value = (typeof raw === 'string' ? safeJson(raw) : raw) as Record<string, unknown> | null;
  if (!value || typeof value !== 'object') {
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

  const shape = documentShapeSchema.safeParse(value);
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

  const doc: BuilderDocument = structuredClone(shape.data);
  for (const node of Object.values(doc.nodes)) {
    const definition = registry.get(node.type);
    if (!definition || node.v >= definition.version) continue;
    let props: unknown = node.props;
    for (let from = node.v; from < definition.version; from += 1) {
      if (!definition.migrate) {
        return {
          ok: false,
          doc: null,
          issues: [
            error('element.cannotMigrate', { nodeId: node.id, params: { type: node.type, from } }),
          ],
          migrated,
        };
      }
      props = definition.migrate(from, props);
    }
    node.props = props as Record<string, unknown>;
    node.v = definition.version;
    migrated = true;
  }

  const issues = checkDocument(doc, registry);
  return { ok: !hasErrors(issues), doc, issues, migrated };
}

/** The document as stored: plain JSON, stable key order for the envelope. */
export function serializeDocument(doc: BuilderDocument): string {
  const { schema, version, root, meta, nodes } = doc;
  return JSON.stringify({ schema, version, root, meta, nodes });
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
