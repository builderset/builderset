import { frameBounds, normalizeAngle, type FreeFrame, type FreeRect } from '../../core';

import type { FreeHandle, FreeUnit } from './types';

/**
 * The free canvas's arithmetic, apart from React so it is tested on its own:
 * snapping, resizing (also of a rotated frame), rotating, bounds and the
 * numbers as the kit's unit writes them. All in units.
 */

/** `value` kept to `decimals` places — what the document stores. */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** Math.max(0, decimals);
  const rounded = Math.round(value * factor) / factor;
  // `-0` would print as "-0".
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** A number as the unit writes it: "12.5 mm", "480 px". Trailing zeros dropped. */
export function formatNumber(value: number, unit: Pick<FreeUnit, 'decimals'>): string {
  return String(roundTo(value, unit.decimals));
}

export function formatUnit(value: number, unit: Pick<FreeUnit, 'decimals' | 'label'>): string {
  const number = formatNumber(value, unit);
  return unit.label ? `${number} ${unit.label}` : number;
}

/** A frame with every number kept to `decimals` places, and the angle in [0, 360). */
export function roundFrame(frame: FreeFrame, decimals: number): FreeFrame {
  return {
    x: roundTo(frame.x, decimals),
    y: roundTo(frame.y, decimals),
    w: roundTo(frame.w, decimals),
    h: roundTo(frame.h, decimals),
    r: normalizeAngle(roundTo(frame.r, 1)),
  };
}

/** The box around several frames, each as rotated. */
export function unionBounds(frames: readonly FreeFrame[]): FreeRect | null {
  if (frames.length === 0) return null;
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const frame of frames) {
    const box = frameBounds(frame);
    left = Math.min(left, box.x);
    top = Math.min(top, box.y);
    right = Math.max(right, box.x + box.w);
    bottom = Math.max(bottom, box.y + box.h);
  }
  return { x: left, y: top, w: right - left, h: bottom - top };
}

export interface SnapHit {
  /** How far to move to sit on the line. */
  delta: number;
  /** The line snapped to. */
  line: number;
}

/**
 * The nearest line any of `values` lies within `threshold` of, or null.
 * `values` are the moving box's edges and centre on one axis.
 */
export function snapAxis(
  values: readonly number[],
  lines: readonly number[],
  threshold: number,
): SnapHit | null {
  let best: SnapHit | null = null;
  for (const value of values) {
    for (const line of lines) {
      const delta = line - value;
      if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) {
        best = { delta, line };
      }
    }
  }
  return best;
}

/** The three lines a box offers on each axis: its start, centre and end. */
export function linesOf(box: FreeRect): { xs: number[]; ys: number[] } {
  return {
    xs: [box.x, box.x + box.w / 2, box.x + box.w],
    ys: [box.y, box.y + box.h / 2, box.y + box.h],
  };
}

/** Which way a handle pulls on each axis: -1 the start edge, 1 the end edge, 0 neither. */
export function handleAxes(handle: FreeHandle): { hx: -1 | 0 | 1; hy: -1 | 0 | 1 } {
  return {
    hx: handle.includes('w') ? -1 : handle.includes('e') ? 1 : 0,
    hy: handle.startsWith('n') ? -1 : handle.startsWith('s') ? 1 : 0,
  };
}

function rotate(x: number, y: number, degrees: number): { x: number; y: number } {
  if (!degrees) return { x, y };
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

export interface ResizeOptions {
  /** Keep the start frame's proportions (Shift on a corner, or the element's own rule). */
  keepRatio?: boolean | undefined;
  /** The smallest width and height left, units. */
  min?: number | undefined;
  /**
   * Called with the moving edges in board space (only for a frame that is
   * not rotated), to snap them; returns how far to move each.
   */
  snap?:
    ((edges: { x: number | null; y: number | null }) => { dx: number; dy: number }) | undefined;
}

/**
 * The frame after dragging `handle` by (`dx`, `dy`) board units from where it
 * started. The opposite corner or edge stays where it was on the board, also
 * when the frame is rotated: the pointer's movement is read in the frame's own
 * axes, and the centre is put back so the anchor has not moved.
 */
export function resizeFrame(
  start: FreeFrame,
  handle: FreeHandle,
  dx: number,
  dy: number,
  options: ResizeOptions = {},
): FreeFrame {
  const { hx, hy } = handleAxes(handle);
  const min = options.min ?? 1;
  // The pointer's movement in the frame's own axes.
  const local = rotate(dx, dy, -start.r);
  let w = start.w + hx * local.x;
  let h = start.h + hy * local.y;

  // Snapping edges only makes sense when the frame's edges are the board's axes.
  if (options.snap && !start.r) {
    const edgeX = hx === 0 ? null : hx > 0 ? start.x + w : start.x + start.w - w;
    const edgeY = hy === 0 ? null : hy > 0 ? start.y + h : start.y + start.h - h;
    const hit = options.snap({ x: edgeX, y: edgeY });
    w += hx * hit.dx;
    h += hy * hit.dy;
  }

  if (options.keepRatio && start.w > 0 && start.h > 0) {
    const ratio = start.w / start.h;
    if (hx !== 0 && hy !== 0) {
      // A corner: the larger pull wins.
      if (Math.abs(w / start.w) > Math.abs(h / start.h)) h = w / ratio;
      else w = h * ratio;
    } else if (hx !== 0) h = w / ratio;
    else w = h * ratio;
  }

  w = Math.max(min, w);
  h = Math.max(min, h);
  if (options.keepRatio && start.w > 0 && start.h > 0) {
    // The minimum may have broken the ratio: grow the other side back.
    const ratio = start.w / start.h;
    if (w / h > ratio) h = w / ratio;
    else w = h * ratio;
  }

  // The anchor — the point opposite the handle — in the frame's own axes,
  // from its centre, before and after; on the board it must not move.
  // An edge handle resizes about the middle of the other axis, as the
  // concept and every design tool do: that axis is anchored at its centre
  // only when the ratio forces it to change.
  const ax = -hx;
  const ay = -hy;
  const before = rotate((ax * start.w) / 2, (ay * start.h) / 2, start.r);
  const after = rotate((ax * w) / 2, (ay * h) / 2, start.r);
  const cx = start.x + start.w / 2 + before.x - after.x;
  const cy = start.y + start.h / 2 + before.y - after.y;
  return { x: cx - w / 2, y: cy - h / 2, w, h, r: start.r };
}

/**
 * The angle a frame turns to when its rotate handle (above the top edge) is
 * dragged to (`px`, `py`). Shift: steps of 15°. Otherwise it settles on 0, 45,
 * 90… within 4°, unless `free` (Alt).
 */
export function rotateFrom(
  frame: FreeFrame,
  px: number,
  py: number,
  options: { step?: boolean; free?: boolean } = {},
): number {
  const cx = frame.x + frame.w / 2;
  const cy = frame.y + frame.h / 2;
  let angle = (Math.atan2(py - cy, px - cx) * 180) / Math.PI + 90;
  angle = normalizeAngle(angle);
  if (options.step) angle = Math.round(angle / 15) * 15;
  else if (!options.free) {
    const near = Math.round(angle / 45) * 45;
    if (Math.abs(angle - near) <= 4) angle = near;
  }
  return normalizeAngle(Math.round(angle));
}

/** Whether two rectangles overlap (a marquee and an element). */
export function intersects(a: FreeRect, b: FreeRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
