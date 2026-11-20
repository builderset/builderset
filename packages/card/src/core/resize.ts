import { frameOf } from '@builderset/engine';

import type { CardDocument, CardFormatProps } from './document';
import { formatSpec, type CardFormat } from './formats';
import { roundTo } from './units';

/**
 * Changing a card's size: every element on both sides keeps its place in
 * proportion — a logo a fifth of the way across stays there — so a design
 * survives a switch from a membership card to a business card. Type keeps its
 * size: points are points on any card.
 */
export function resizeCard(draft: CardDocument, width: number, height: number): void {
  const root = draft.nodes[draft.root];
  if (!root) return;
  const format = root.props as CardFormatProps;
  const fx = width / format.width;
  const fy = height / format.height;
  root.props = { ...format, width: roundTo(width), height: roundTo(height) };
  if (fx === 1 && fy === 1) return;
  for (const sideId of root.children ?? []) {
    for (const id of draft.nodes[sideId]?.children ?? []) {
      const node = draft.nodes[id];
      if (!node) continue;
      const frame = frameOf(node);
      node.props = {
        ...node.props,
        frame: {
          x: roundTo(frame.x * fx),
          y: roundTo(frame.y * fy),
          w: roundTo(frame.w * fx),
          h: roundTo(frame.h * fy),
          r: frame.r,
        },
      };
    }
  }
}

/** A card turned into another format: its size and corners, its elements kept in proportion. */
export function changeFormat(draft: CardDocument, format: CardFormat): void {
  const root = draft.nodes[draft.root];
  if (!root) return;
  const spec = formatSpec(format);
  const current = root.props as CardFormatProps;
  root.props = { ...current, format, radius: format === 'custom' ? current.radius : spec.radius };
  if (format !== 'custom') resizeCard(draft, spec.width, spec.height);
}
