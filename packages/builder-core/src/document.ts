import { z } from 'zod';

import { ROOT_ID, type NodeId } from './ids';
import { mediaRefSchema } from './media';
import { nodeStyleSchema, type NodeStyle } from './style';
import { isAnchor, isSafeUrl } from './url';

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

export const DOCUMENT_SCHEMA = 'builder/document' as const;
/** Bump on every breaking change to the document shape, with a migration. */
export const DOCUMENT_VERSION = 1;

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

export const seoSchema = z
  .object({
    title: z.string().max(70),
    description: z.string().max(170),
    image: mediaRefSchema.nullable(),
    canonical: z.string().refine(isSafeUrl, { message: 'url.unsafe' }).nullable(),
    noindex: z.boolean(),
    focusKeyword: z.string().max(60),
  })
  .partial();

export type SeoMeta = z.infer<typeof seoSchema>;

export const documentMetaSchema = z.object({
  title: z.string().max(200),
  excerpt: z.string().max(600).optional(),
  cover: z
    .object({ media: mediaRefSchema, alt: z.string().max(300) })
    .nullable()
    .optional(),
  seo: seoSchema.optional(),
  /** Minutes to read, when the writer overrides the computed estimate. */
  readingMinutes: z.number().int().min(1).max(240).nullable().optional(),
});

export type DocumentMeta = z.infer<typeof documentMetaSchema>;

/**
 * What every tree the builders edit has in common: a root and its nodes. The
 * operations, the history, the tree helpers and the structural checks need no
 * more than this, which is what lets another kind of document (an email) share
 * them without pretending to be an article.
 */
export interface NodeTree {
  root: NodeId;
  nodes: Record<NodeId, BuilderNode>;
}

export interface BuilderDocument extends NodeTree {
  schema: typeof DOCUMENT_SCHEMA;
  version: number;
  root: NodeId;
  nodes: Record<NodeId, BuilderNode>;
  meta: DocumentMeta;
}

/**
 * The SHAPE of a node, without knowing which elements exist. Element props are
 * checked against their own schemas by `documentSchema(registry)`; this is what
 * a parser can say about any node before it has a registry.
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

export const documentShapeSchema = z.object({
  schema: z.literal(DOCUMENT_SCHEMA),
  version: z.number().int().min(1),
  root: z.literal(ROOT_ID),
  nodes: z.record(z.string(), nodeShapeSchema),
  meta: documentMetaSchema,
});

/** A fresh, empty document. */
export function createDocument(meta: Partial<DocumentMeta> = {}): BuilderDocument {
  return {
    schema: DOCUMENT_SCHEMA,
    version: DOCUMENT_VERSION,
    root: ROOT_ID,
    nodes: { [ROOT_ID]: { id: ROOT_ID, type: 'root', v: 1, props: {}, children: [] } },
    meta: { title: '', ...meta },
  };
}

/** A detached subtree: what a paste, a template or a duplicate inserts. */
export interface Fragment {
  /** The top-level nodes, in order. */
  roots: NodeId[];
  nodes: Record<NodeId, BuilderNode>;
}
