import {
  frameBounds,
  frameOf,
  isPlaced,
  parentOf,
  type EngineDocument,
  type FreeFrame,
  type NodeId,
  type NodeTree,
} from '../../core';

import { roundFrame, unionBounds } from './geometry';
import type { FreeAlign, FreeBoard, FreeSizeOf } from './types';

/**
 * Changes to frames over a draft — the document inside `updateDocument`, or
 * the kit's `onNodesAdded` — so each is one undo step with whatever else that
 * step does. Locked elements are never moved.
 */

/** Decimals a frame is kept to when the caller does not say: enough for millimetres. */
const DEFAULT_DECIMALS = 2;

/** Write `frame` to an element's `props.frame`, rounded. Locked elements are left alone. */
export function writeFrame(
  draft: NodeTree,
  id: NodeId,
  frame: FreeFrame,
  decimals = DEFAULT_DECIMALS,
): void {
  const node = draft.nodes[id];
  if (!node || node.locked) return;
  node.props.frame = roundFrame(frame, decimals);
}

/** The unlocked ones among `ids` that exist. */
function movable(draft: NodeTree, ids: readonly NodeId[]): NodeId[] {
  return ids.filter((id) => {
    const node = draft.nodes[id];
    return !!node && !node.locked;
  });
}

/** Move elements by (`dx`, `dy`) units. */
export function moveFramesBy(
  draft: NodeTree,
  ids: readonly NodeId[],
  dx: number,
  dy: number,
  decimals = DEFAULT_DECIMALS,
): void {
  for (const id of movable(draft, ids)) {
    const frame = frameOf(draft.nodes[id]);
    writeFrame(draft, id, { ...frame, x: frame.x + dx, y: frame.y + dy }, decimals);
  }
}

/**
 * Line elements up. One element lines up with the board; several with the
 * box around them. Edges are the elements' edges as drawn — a rotated one's
 * turned box — so what looks aligned is aligned.
 */
export function alignNodes(
  draft: NodeTree,
  ids: readonly NodeId[],
  align: FreeAlign,
  board: Pick<FreeBoard, 'width' | 'height'>,
  decimals = DEFAULT_DECIMALS,
): void {
  const moving = movable(draft, ids);
  if (moving.length === 0) return;
  const frames = moving.map((id) => frameOf(draft.nodes[id]));
  const reference =
    moving.length > 1 ? unionBounds(frames) : { x: 0, y: 0, w: board.width, h: board.height };
  if (!reference) return;
  moving.forEach((id, index) => {
    const frame = frames[index];
    if (!frame) return;
    const box = frameBounds(frame);
    let dx = 0;
    let dy = 0;
    if (align === 'left') dx = reference.x - box.x;
    else if (align === 'hcenter') dx = reference.x + (reference.w - box.w) / 2 - box.x;
    else if (align === 'right') dx = reference.x + reference.w - box.w - box.x;
    else if (align === 'top') dy = reference.y - box.y;
    else if (align === 'vcenter') dy = reference.y + (reference.h - box.h) / 2 - box.y;
    else dy = reference.y + reference.h - box.h - box.y;
    writeFrame(draft, id, { ...frame, x: frame.x + dx, y: frame.y + dy }, decimals);
  });
}

/**
 * Equal gaps between three or more elements, along `axis`: the first and the
 * last stay, the ones between move.
 */
export function distributeNodes(
  draft: NodeTree,
  ids: readonly NodeId[],
  axis: 'x' | 'y',
  decimals = DEFAULT_DECIMALS,
): void {
  const moving = movable(draft, ids);
  if (moving.length < 3) return;
  const items = moving
    .map((id) => {
      const frame = frameOf(draft.nodes[id]);
      return { id, frame, box: frameBounds(frame) };
    })
    .sort((a, b) => a.box[axis] - b.box[axis]);
  const size = axis === 'x' ? 'w' : 'h';
  const first = items[0];
  const last = items[items.length - 1];
  if (!first || !last) return;
  const span = last.box[axis] + last.box[size] - first.box[axis];
  const used = items.reduce((sum, item) => sum + item.box[size], 0);
  const gap = (span - used) / (items.length - 1);
  let at = first.box[axis];
  for (const item of items) {
    const delta = at - item.box[axis];
    at += item.box[size] + gap;
    if (item === first || item === last) continue;
    const moved =
      axis === 'x'
        ? { ...item.frame, x: item.frame.x + delta }
        : { ...item.frame, y: item.frame.y + delta };
    writeFrame(draft, item.id, moved, decimals);
  }
}

/**
 * Give new elements a place, for the profile's `onNodesAdded`. Only children
 * of `board.id` are touched:
 *
 * - an unplaced one (no size) gets `sizeOf`'s size, at its fixed `x`/`y` or
 *   centred on the board;
 * - one that lands exactly on a sibling — a duplicate, a paste, a second click
 *   on the same library tile — steps down and right until it is free, so the
 *   copy is seen and can be grabbed.
 */
export function placeNewNodes(
  draft: EngineDocument,
  ids: readonly NodeId[],
  board: FreeBoard,
  sizeOf: FreeSizeOf,
  options: { step?: number | undefined; decimals?: number | undefined } = {},
): void {
  const step = options.step ?? Math.max(board.width, board.height) / 40;
  const decimals = options.decimals ?? DEFAULT_DECIMALS;
  const parent = draft.nodes[board.id];
  if (!parent?.children) return;
  for (const id of ids) {
    const node = draft.nodes[id];
    if (!node || node.locked || parentOf(draft, id)?.id !== board.id) continue;
    let frame = frameOf(node);
    let fixed = false;
    if (!isPlaced(frame)) {
      const size = sizeOf(node.type, node.props);
      fixed = size.x !== undefined || size.y !== undefined;
      frame = {
        x: size.x ?? (board.width - size.w) / 2,
        y: size.y ?? (board.height - size.h) / 2,
        w: size.w,
        h: size.h,
        r: frame.r,
      };
    }
    if (!fixed) {
      const taken = (candidate: FreeFrame) =>
        parent.children?.some((other) => {
          if (other === id) return false;
          const sibling = frameOf(draft.nodes[other]);
          return (
            isPlaced(sibling) &&
            Math.abs(sibling.x - candidate.x) < step / 4 &&
            Math.abs(sibling.y - candidate.y) < step / 4
          );
        }) ?? false;
      // Bounded: a board stacked full of copies stops looking after a while.
      for (let tries = 0; tries < 40 && taken(frame); tries += 1) {
        frame = { ...frame, x: frame.x + step, y: frame.y + step };
      }
    }
    node.props.frame = roundFrame(frame, decimals);
  }
}
