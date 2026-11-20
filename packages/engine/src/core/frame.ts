import { z } from 'zod';

import type { BuilderNode } from './document';

/**
 * Where an element of a free canvas sits — a card's logo, a popup's button —
 * as data. It lives in the core, not the editor, so a kit's document schema,
 * its checks and its server-side renderer can read it without React.
 *
 * Everything is in the kit's own units (a card: millimetres; a popup: CSS
 * pixels), relative to the artboard's top-left corner (the trim, not the
 * bleed). `r` is a clockwise rotation in degrees about the frame's centre,
 * kept in [0, 360).
 */
// #region frame
export interface FreeFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
}

/** A box without rotation: a selection's bounds, an element's footprint. */
export interface FreeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
// #endregion frame

/** Generous on purpose: an element may sit in the bleed, or be dragged half off the board. */
const coordinate = z.number().min(-100_000).max(100_000);

/**
 * `props.frame` in an element's schema. A frame of no size has not been
 * placed yet (`UNPLACED_FRAME`): the editor gives it one when it is added.
 */
export const freeFrameSchema = z.object({
  x: coordinate,
  y: coordinate,
  w: z.number().min(0).max(100_000),
  h: z.number().min(0).max(100_000),
  r: z.number().min(0).lt(360),
});

/**
 * An element's default frame: no size, so the editor places it (centred on
 * the artboard at the kit's `sizeOf` size) when it is inserted.
 */
export const UNPLACED_FRAME: FreeFrame = Object.freeze({ x: 0, y: 0, w: 0, h: 0, r: 0 });

function finite(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** An element's frame: `node.props.frame`, with anything missing read as 0. */
export function frameOf(node: Pick<BuilderNode, 'props'> | undefined): FreeFrame {
  const raw = node?.props.frame;
  const frame = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    x: finite(frame.x),
    y: finite(frame.y),
    w: Math.max(0, finite(frame.w)),
    h: Math.max(0, finite(frame.h)),
    r: normalizeAngle(finite(frame.r)),
  };
}

/** Whether a frame has a size — an unplaced one is `UNPLACED_FRAME`. */
export function isPlaced(frame: FreeFrame): boolean {
  return frame.w > 0 && frame.h > 0;
}

/** Degrees in [0, 360). */
export function normalizeAngle(degrees: number): number {
  const turned = degrees % 360;
  const positive = turned < 0 ? turned + 360 : turned;
  // `-0` and float dust just under a full turn both read as 0.
  return positive >= 359.9999 || Object.is(positive, -0) ? 0 : positive;
}

/**
 * The box a frame covers on the board once rotated: what a check ("text
 * outside the safe area"), a marquee or an alignment means by "its edges".
 */
export function frameBounds(frame: FreeFrame): FreeRect {
  if (!frame.r) return { x: frame.x, y: frame.y, w: frame.w, h: frame.h };
  const radians = (frame.r * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const w = frame.w * cos + frame.h * sin;
  const h = frame.w * sin + frame.h * cos;
  const cx = frame.x + frame.w / 2;
  const cy = frame.y + frame.h / 2;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}
