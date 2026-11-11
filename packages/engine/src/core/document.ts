import { z } from 'zod';

import type { DocumentI18n } from './i18n';
import type { NodeId } from './ids';
import { nodeStyleSchema, type NodeStyle } from './style';
import { isAnchor } from './url';

/**
 * The document: a NORMALIZED tree.
 *
 * Nodes live in one flat record keyed by id, and a container lists its
 * children's ids in order. Moving a node is then two array edits rather than a
 * deep copy of the subtree it sits in; finding one is a lookup, not a search;
 * and an undo patch names exactly the arrays that changed. The editor's store
 * subscribes each node to its own entry, so typing in one paragraph does not
 * re-render the other nine hundred.
 */

export interface BuilderNode {
  id: NodeId;
  /** The element's registry key. */
  type: string;
  /** The element's version the props were written for — see `migrate`. */
  v: number;
  props: Record<string, unknown>;
  style?: NodeStyle | undefined;
  /** Present on containers only, in display order. */
  children?: NodeId[] | undefined;
  /** Left out of the output entirely; dimmed in the editor. */
  hidden?: boolean | undefined;
  /** Cannot be moved, deleted or edited until unlocked. */
  locked?: boolean | undefined;
  /** The label in the layers panel, when the writer has named it. */
  name?: string | undefined;
  /** An `id` for `#anchor` links to this node. */
  anchor?: string | undefined;
}

/**
 * What every tree the builders edit has in common: a root and its nodes. The
 * operations, the history, the tree helpers and the structural checks need no
 * more than this, which is what lets every kind of document share them.
 */
export interface NodeTree {
  root: NodeId;
  nodes: Record<NodeId, BuilderNode>;
}

/**
 * What every document the workspace edits has in common. A kit extends it
 * with its own `meta` and whatever else it stores (an email's `settings`).
 */
export interface EngineDocument<Meta extends object = object> extends NodeTree {
  /** The kit's format name, as stored: `builder/document`, `email/document`. */
  schema: string;
  version: number;
  meta: Meta;
  /** The words in other languages, when the writer switched multi-language on. */
  i18n?: DocumentI18n | undefined;
}

/**
 * The SHAPE of a node, without knowing which elements exist. Element props are
 * checked against their own schemas by each kit's document schema; this is
 * what a parser can say about any node before it has a registry.
 */
export const nodeShapeSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9]{0,39}$/),
  type: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/),
  v: z.number().int().min(1).max(1000),
  props: z.record(z.string(), z.unknown()),
  style: nodeStyleSchema.optional(),
  children: z.array(z.string()).max(1000).optional(),
  hidden: z.boolean().optional(),
  locked: z.boolean().optional(),
  name: z.string().max(80).optional(),
  anchor: z.string().refine(isAnchor, { message: 'anchor.invalid' }).optional(),
});

/** A detached subtree: what a paste, a template or a duplicate inserts. */
export interface Fragment {
  /** The top-level nodes, in order. */
  roots: NodeId[];
  nodes: Record<NodeId, BuilderNode>;
}
