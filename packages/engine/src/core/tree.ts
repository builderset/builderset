import type { BuilderNode, NodeTree } from './document';
import type { NodeId } from './ids';

/**
 * Reading the tree. All of it is derived from `children` arrays — there are
 * no parent pointers to keep in step, so no operation can leave one stale.
 * A document of a thousand nodes answers `parentOf` in well under a
 * millisecond, which is fast enough that nothing caches it.
 */

export function getNode(doc: NodeTree, id: NodeId): BuilderNode | undefined {
  return doc.nodes[id];
}

export function parentOf(doc: NodeTree, id: NodeId): BuilderNode | undefined {
  for (const node of Object.values(doc.nodes)) {
    if (node.children?.includes(id)) return node;
  }
  return undefined;
}

export function indexInParent(doc: NodeTree, id: NodeId): number {
  return parentOf(doc, id)?.children?.indexOf(id) ?? -1;
}

/** From the node's parent up to the root. */
export function ancestors(doc: NodeTree, id: NodeId): BuilderNode[] {
  const out: BuilderNode[] = [];
  let current = parentOf(doc, id);
  while (current) {
    out.push(current);
    current = parentOf(doc, current.id);
  }
  return out;
}

/** Depth below the root: the root's children are at 1. */
export function depthOf(doc: NodeTree, id: NodeId): number {
  return ancestors(doc, id).length;
}

/** Every node under `id`, depth first, `id` itself excluded. */
export function descendants(doc: NodeTree, id: NodeId): BuilderNode[] {
  const out: BuilderNode[] = [];
  const visit = (nodeId: NodeId) => {
    for (const childId of doc.nodes[nodeId]?.children ?? []) {
      const child = doc.nodes[childId];
      if (!child) continue;
      out.push(child);
      visit(childId);
    }
  };
  visit(id);
  return out;
}

/** The deepest level of nesting under `id`, counting `id` as 0. */
export function subtreeHeight(doc: NodeTree, id: NodeId): number {
  const children = doc.nodes[id]?.children ?? [];
  if (children.length === 0) return 0;
  return 1 + Math.max(...children.map((childId) => subtreeHeight(doc, childId)));
}

/** Depth-first, document order, root first. Return `false` to skip a subtree. */
export function walk(
  doc: NodeTree,
  visit: (node: BuilderNode, depth: number) => boolean | undefined,
  from: NodeId = doc.root,
): void {
  const step = (id: NodeId, depth: number) => {
    const node = doc.nodes[id];
    if (!node) return;
    if (visit(node, depth) === false) return;
    for (const childId of node.children ?? []) step(childId, depth + 1);
  };
  step(from, 0);
}

/** Every node in document order. */
export function inOrder(doc: NodeTree): BuilderNode[] {
  const out: BuilderNode[] = [];
  walk(doc, (node) => {
    out.push(node);
    return undefined;
  });
  return out;
}

export function findNodes(doc: NodeTree, predicate: (node: BuilderNode) => boolean): BuilderNode[] {
  return inOrder(doc).filter(predicate);
}

/** Whether `ancestorId` contains `id` at any depth. */
export function contains(doc: NodeTree, ancestorId: NodeId, id: NodeId): boolean {
  return ancestors(doc, id).some((node) => node.id === ancestorId);
}

/**
 * The ids a selection really refers to: duplicates removed, and any node whose
 * ancestor is also selected dropped — moving a section already moves what is
 * in it, and moving its paragraph a second time would tear it out.
 */
export function topLevelIds(doc: NodeTree, ids: readonly NodeId[]): NodeId[] {
  const set = new Set(ids.filter((id) => id !== doc.root && doc.nodes[id]));
  const kept = [...set].filter((id) => !ancestors(doc, id).some((node) => set.has(node.id)));
  const order = inOrder(doc).map((node) => node.id);
  return kept.sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

/** The previous and next node in document order, for keyboard navigation. */
export function siblingInOrder(
  doc: NodeTree,
  id: NodeId,
  direction: 1 | -1,
): BuilderNode | undefined {
  const order = inOrder(doc).filter((node) => node.id !== doc.root);
  const index = order.findIndex((node) => node.id === id);
  return index === -1 ? undefined : order[index + direction];
}
