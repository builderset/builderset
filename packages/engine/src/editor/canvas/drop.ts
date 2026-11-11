import {
  contains,
  indexInParent,
  parentOf,
  wrapChain,
  type ElementRegistry,
  type Fragment,
  type NodeId,
  type NodeTree,
} from '@motors/builder-core';

/**
 * Where a drag would land, worked out from the node under the pointer.
 *
 * The top and bottom quarters of a block mean "before" and "after" it; the
 * middle half of a container that accepts the dragged type means "inside, at
 * the end". Anything the placement rules refuse is simply not a target, so the
 * indicator never promises a drop that would fail.
 */

export type DragPayload =
  | { kind: 'type'; type: string }
  | { kind: 'nodes'; ids: NodeId[] }
  /** A ready-made piece of layout (an email structure), built on drop. */
  | { kind: 'fragment'; rootType: string; build: () => Fragment };

export interface DropTarget {
  parentId: NodeId;
  index: number;
  /** What the indicator draws against. */
  anchorId: NodeId;
  placement: 'before' | 'after' | 'inside';
}

export const DRAG_TYPE_MIME = 'application/x-builder-type';
export const DRAG_NODES_MIME = 'application/x-builder-nodes';

function typesOf(doc: NodeTree, payload: DragPayload): string[] {
  if (payload.kind === 'type') return [payload.type];
  if (payload.kind === 'fragment') return [payload.rootType];
  return payload.ids.map((id) => doc.nodes[id]?.type).filter((type): type is string => !!type);
}

function accepts(
  doc: NodeTree,
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
  // A NEW block may land where it needs containers built around it (a text
  // block between an email's sections gets its own section, row and column);
  // blocks being MOVED keep their place in the tree, so they may not.
  if (payload.kind === 'type') return wrapChain(registry, parent.type, payload.type) !== null;
  return typesOf(doc, payload).every((type) => registry.canContain(parent.type, type));
}

export function dropTargetAt(
  doc: NodeTree,
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
  doc: NodeTree,
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
  // A structure travels as `structure:<id>`; its builder is in `activeDrag`.
  if (type && !type.startsWith('structure:')) return { kind: 'type', type };
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
  // The blocks being moved fade where they are, so the writer sees what is
  // travelling and where the gap it leaves will be.
  for (const element of document.querySelectorAll('[data-dragging]')) {
    element.removeAttribute('data-dragging');
  }
  if (payload?.kind === 'nodes') {
    for (const id of payload.ids) {
      for (const element of document.querySelectorAll(
        `[data-node="${CSS.escape(id)}"], [data-layer="${CSS.escape(id)}"]`,
      )) {
        element.setAttribute('data-dragging', '');
      }
    }
  }
}

/**
 * The picture that follows the pointer: a small labelled chip instead of the
 * browser's ghost of the whole block, which for a gallery is half the screen.
 */
export function setDragChip(data: DataTransfer, label: string): void {
  const chip = document.createElement('div');
  chip.textContent = label;
  chip.style.cssText = [
    'position:fixed',
    'top:-100px',
    'left:-100px',
    'padding:6px 12px',
    'border-radius:999px',
    'font:600 12px/1.2 var(--font-sans, system-ui)',
    'color:var(--primary-foreground, #fff)',
    'background:var(--primary, #111)',
    'box-shadow:0 8px 24px rgb(0 0 0 / 0.18)',
    'white-space:nowrap',
    'pointer-events:none',
  ].join(';');
  document.body.appendChild(chip);
  data.setDragImage(chip, 14, 14);
  // The browser snapshots the chip synchronously; it can go right after.
  setTimeout(() => {
    chip.remove();
  }, 0);
}

export function activeDrag(): DragPayload | null {
  return active;
}
