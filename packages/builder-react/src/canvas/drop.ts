import {
  contains,
  indexInParent,
  parentOf,
  type BuilderDocument,
  type ElementRegistry,
  type NodeId,
} from '@motors/builder-core';

/**
 * Where a drag would land, worked out from the node under the pointer.
 *
 * The top and bottom quarters of a block mean "before" and "after" it; the
 * middle half of a container that accepts the dragged type means "inside, at
 * the end". Anything the placement rules refuse is simply not a target, so the
 * indicator never promises a drop that would fail.
 */

export type DragPayload = { kind: 'type'; type: string } | { kind: 'nodes'; ids: NodeId[] };

export interface DropTarget {
  parentId: NodeId;
  index: number;
  /** What the indicator draws against. */
  anchorId: NodeId;
  placement: 'before' | 'after' | 'inside';
}

export const DRAG_TYPE_MIME = 'application/x-builder-type';
export const DRAG_NODES_MIME = 'application/x-builder-nodes';

function typesOf(doc: BuilderDocument, payload: DragPayload): string[] {
  return payload.kind === 'type'
    ? [payload.type]
    : payload.ids.map((id) => doc.nodes[id]?.type).filter((type): type is string => !!type);
}

function accepts(
  doc: BuilderDocument,
  registry: ElementRegistry,
  parentId: NodeId,
  payload: DragPayload,
): boolean {
  const parent = doc.nodes[parentId];
  if (!parent) return false;
  if (payload.kind === 'nodes') {
    // Not into itself or anything inside itself.
    if (payload.ids.some((id) => id === parentId || contains(doc, id, parentId))) return false;
  }
  return typesOf(doc, payload).every((type) => registry.canContain(parent.type, type));
}

export function dropTargetAt(
  doc: BuilderDocument,
  registry: ElementRegistry,
  nodeId: NodeId,
  rect: DOMRect,
  pointerY: number,
  payload: DragPayload,
): DropTarget | null {
  const node = doc.nodes[nodeId];
  if (!node) return null;
  const ratio = (pointerY - rect.top) / Math.max(1, rect.height);

  if (node.children && ratio > 0.25 && ratio < 0.75 && accepts(doc, registry, node.id, payload)) {
    return {
      parentId: node.id,
      index: node.children.length,
      anchorId: node.id,
      placement: 'inside',
    };
  }

  // Walk up until a parent accepts it: dropping near a paragraph inside a
  // column that refuses the type tries the column's own parent next.
  let current = node;
  let parent = parentOf(doc, current.id);
  while (parent) {
    if (accepts(doc, registry, parent.id, payload)) {
      const index = indexInParent(doc, current.id) + (ratio >= 0.5 ? 1 : 0);
      return {
        parentId: parent.id,
        index,
        anchorId: current.id,
        placement: ratio >= 0.5 ? 'after' : 'before',
      };
    }
    current = parent;
    parent = parentOf(doc, current.id);
  }
  return null;
}

/** A drop onto the empty page, or below the last block. */
export function dropAtEnd(
  doc: BuilderDocument,
  registry: ElementRegistry,
  payload: DragPayload,
): DropTarget | null {
  const root = doc.nodes[doc.root];
  if (!root || !accepts(doc, registry, root.id, payload)) return null;
  const last = root.children?.[root.children.length - 1];
  return {
    parentId: root.id,
    index: root.children?.length ?? 0,
    anchorId: last ?? root.id,
    placement: last ? 'after' : 'inside',
  };
}

export function readPayload(data: DataTransfer | null): DragPayload | null {
  if (!data) return null;
  const type = data.getData(DRAG_TYPE_MIME);
  if (type) return { kind: 'type', type };
  const nodes = data.getData(DRAG_NODES_MIME);
  if (nodes) {
    try {
      const ids = JSON.parse(nodes) as unknown;
      if (Array.isArray(ids) && ids.every((id) => typeof id === 'string')) {
        return { kind: 'nodes', ids };
      }
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * During `dragover` the browser hides the data (only the types are visible),
 * so the payload being dragged is also kept here, set on `dragstart`.
 */
let active: DragPayload | null = null;

export function setActiveDrag(payload: DragPayload | null): void {
  active = payload;
}

export function activeDrag(): DragPayload | null {
  return active;
}
