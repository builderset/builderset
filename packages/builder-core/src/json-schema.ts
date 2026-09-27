import { z } from 'zod';

import type { ElementRegistry } from './registry';
import { documentSchema } from './validate';

/**
 * The document as a JSON Schema — the contract other languages read.
 *
 * The API (Python) validates with its own Pydantic mirror of these types; a
 * contract test there loads this file and the shared fixtures and checks the
 * two agree. Structural rules that JSON Schema cannot say (one parent per node,
 * placement, depth) are enforced by `structuralIssues` here and by the
 * server's own checks, and are listed in `x-structural-rules` so a reader of
 * the schema knows they exist.
 */
export function toJSONSchema(registry: ElementRegistry): Record<string, unknown> {
  const schema = z.toJSONSchema(documentSchema(registry), {
    unrepresentable: 'any',
    // Rich text, media and the style model repeat in dozens of elements; as
    // `$defs` they are written once instead of being inlined each time.
    reused: 'ref',
    target: 'draft-2020-12',
  }) as Record<string, unknown>;
  return {
    ...schema,
    $id: 'https://schemas.builder/document.v1.json',
    title: 'Builder document',
    'x-structural-rules': [
      'nodes.root exists and has type "root"',
      'every id in a children array names a node in nodes',
      'every node except root is referenced by exactly one children array',
      'a child type is allowed in its parent type (element placement rules)',
      'nesting depth below root is at most LIMITS.depth',
      'anchors are unique',
      'serialized size is at most LIMITS.bytes',
    ],
  };
}
