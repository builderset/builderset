import { elementRules, LIMITS, toDraft2020, type ElementRegistry } from '@motors/engine';

import { articleSchema } from './check';
import { EMBED_PATTERNS } from './embeds';
import { ARTICLE_LIMITS } from './limits';

/**
 * The article as a JSON Schema — the contract other languages read.
 *
 * The API (Python) validates with this file; a contract test there loads it
 * and the shared fixtures and checks the two agree. Structural rules that JSON
 * Schema cannot say (one parent per node, placement, depth) are enforced by
 * `structuralIssues` in the engine and by the server's own checks, and are
 * listed in `x-structural-rules` so a reader of the schema knows they exist.
 */
export function toArticleJSONSchema(registry: ElementRegistry): Record<string, unknown> {
  return {
    ...toDraft2020(articleSchema(registry)),
    $id: 'https://schemas.builder/document.v1.json',
    title: 'Builder document',
    // What JSON Schema cannot say, as data the server reads rather than copies:
    // where each element may sit, the size limits, and the embed allow-list.
    'x-elements': elementRules(registry),
    // One object, in the order the server's copy has always had: the tree's
    // limits and the article's, as they were before the two were split.
    'x-limits': {
      nodes: LIMITS.nodes,
      depth: LIMITS.depth,
      bytes: LIMITS.bytes,
      richTextChars: LIMITS.richTextChars,
      shortText: ARTICLE_LIMITS.shortText,
      longText: ARTICLE_LIMITS.longText,
      listItems: ARTICLE_LIMITS.listItems,
      tableRows: ARTICLE_LIMITS.tableRows,
      tableColumns: ARTICLE_LIMITS.tableColumns,
      galleryImages: ARTICLE_LIMITS.galleryImages,
      historySteps: LIMITS.historySteps,
    },
    'x-embed-patterns': Object.fromEntries(
      Object.entries(EMBED_PATTERNS).map(([provider, patterns]) => [
        provider,
        patterns.map((pattern) => pattern.source),
      ]),
    ),
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
