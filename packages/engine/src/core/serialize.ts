import type { NodeTree } from './document';
import { error, type Issue } from './issues';
import type { ElementRegistry } from './registry';

/**
 * Reading a stored document back, however old it is — the parts every kit
 * shares. A kit's own parser (`parseArticle`, `parseEmail`) checks its
 * envelope, runs its document migrations, then calls `migrateElements` and its
 * own checks.
 *
 * ELEMENT migrations: each node whose `v` is behind its element's `version` is
 * walked forward one version at a time through the element's own `migrate`, so
 * an element can change its props without the rest of the library knowing.
 */

export interface ParseResult<D> {
  ok: boolean;
  doc: D | null;
  issues: Issue[];
  /** Whether anything was migrated — worth saving back once it is. */
  migrated: boolean;
}

/** A stored value as an object: JSON text is parsed; anything else that is not an object is null. */
export function readStored(raw: unknown): Record<string, unknown> | null {
  const value = (typeof raw === 'string' ? safeJson(raw) : raw) as Record<string, unknown> | null;
  if (!value || typeof value !== 'object') return null;
  return value;
}

/**
 * Bring every node up to its element's version, in place. Refuses — and
 * leaves the rest unmigrated — when an element is behind and has no `migrate`.
 */
export function migrateElements(
  doc: NodeTree,
  registry: ElementRegistry,
): { ok: true; migrated: boolean } | { ok: false; issues: Issue[]; migrated: boolean } {
  let migrated = false;
  for (const node of Object.values(doc.nodes)) {
    const definition = registry.get(node.type);
    if (!definition || node.v >= definition.version) continue;
    let props: unknown = node.props;
    for (let from = node.v; from < definition.version; from += 1) {
      if (!definition.migrate) {
        return {
          ok: false,
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
  return { ok: true, migrated };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
