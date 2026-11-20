import { describe, expect, it } from 'vitest';

import { frameBounds, frameOf, normalizeAngle, type FreeFrame } from '../../core';
import { formatUnit, resizeFrame, rotateFrom, roundFrame, snapAxis, unionBounds } from './geometry';
import type { FreeHandle } from './types';

const box: FreeFrame = { x: 10, y: 20, w: 40, h: 20, r: 0 };

/** Rounded, so float dust from the rotation maths does not fail an equality. */
const round = (frame: FreeFrame) => roundFrame(frame, 4);

describe('snapping', () => {
  it('finds the nearest line within the threshold', () => {
    expect(snapAxis([10, 30, 50], [0, 52, 100], 3)).toEqual({ delta: 2, line: 52 });
    // 30 is 3.5 from 33.5: just out of reach.
    expect(snapAxis([10, 30, 50], [0, 33.5, 100], 3)).toBeNull();
  });

  it('prefers the closer of two lines', () => {
    expect(snapAxis([10], [12, 9], 3)).toEqual({ delta: -1, line: 9 });
  });

  it('ignores lines further than the threshold', () => {
    expect(snapAxis([10], [20], 3)).toBeNull();
  });
});

describe('resizing an unrotated frame', () => {
  const cases: [FreeHandle, number, number, FreeFrame][] = [
    ['e', 5, 99, { x: 10, y: 20, w: 45, h: 20, r: 0 }],
    ['w', 5, 99, { x: 15, y: 20, w: 35, h: 20, r: 0 }],
    ['s', 99, 5, { x: 10, y: 20, w: 40, h: 25, r: 0 }],
    ['n', 99, 5, { x: 10, y: 25, w: 40, h: 15, r: 0 }],
    ['se', 5, 5, { x: 10, y: 20, w: 45, h: 25, r: 0 }],
    ['nw', 5, 5, { x: 15, y: 25, w: 35, h: 15, r: 0 }],
    ['ne', 5, 5, { x: 10, y: 25, w: 45, h: 15, r: 0 }],
    ['sw', 5, 5, { x: 15, y: 20, w: 35, h: 25, r: 0 }],
  ];

  it.each(cases)('the %s handle moves its own edges only', (handle, dx, dy, expected) => {
    expect(round(resizeFrame(box, handle, dx, dy))).toEqual(expected);
  });

  it('never goes below the minimum, and keeps the opposite edge', () => {
    const frame = resizeFrame(box, 'w', 100, 0, { min: 2 });
    expect(frame.w).toBe(2);
    expect(frame.x + frame.w).toBe(50);
  });

  it('keeps the proportions on a corner, the larger pull winning', () => {
    const frame = round(resizeFrame(box, 'se', 40, 2, { keepRatio: true }));
    expect(frame).toEqual({ x: 10, y: 20, w: 80, h: 40, r: 0 });
  });

  it('keeps the proportions on an edge, growing about the middle', () => {
    const frame = round(resizeFrame(box, 'e', 40, 0, { keepRatio: true }));
    expect(frame.w).toBe(80);
    expect(frame.h).toBe(40);
    // The other axis grows evenly: the middle stays.
    expect(frame.y + frame.h / 2).toBe(30);
    expect(frame.x).toBe(10);
  });

  it('snaps the moving edge', () => {
    const frame = resizeFrame(box, 'e', 4, 0, {
      snap: ({ x }) => ({ dx: x === null ? 0 : 60 - x, dy: 0 }),
    });
    expect(frame.x + frame.w).toBe(60);
  });
});

describe('resizing a rotated frame', () => {
  it('keeps the opposite corner where it is on the board', () => {
    const turned: FreeFrame = { ...box, r: 90 };
    // The board position of the frame's own top-left corner (the anchor of `se`).
    const corner = (frame: FreeFrame) => {
      const radians = (frame.r * Math.PI) / 180;
      const cx = frame.x + frame.w / 2;
      const cy = frame.y + frame.h / 2;
      const lx = -frame.w / 2;
      const ly = -frame.h / 2;
      return {
        x: Math.round((cx + lx * Math.cos(radians) - ly * Math.sin(radians)) * 1000) / 1000,
        y: Math.round((cy + lx * Math.sin(radians) + ly * Math.cos(radians)) * 1000) / 1000,
      };
    };
    // Turned 90°, the frame's own x axis points down the board.
    const frame = resizeFrame(turned, 'se', 0, 10);
    expect(Math.round(frame.w * 1000) / 1000).toBe(50);
    expect(Math.round(frame.h * 1000) / 1000).toBe(20);
    expect(corner(frame)).toEqual(corner(turned));
  });
});

describe('rotating', () => {
  const square: FreeFrame = { x: 0, y: 0, w: 10, h: 10, r: 0 };

  it('reads the angle from the centre, the handle being above', () => {
    expect(rotateFrom(square, 5, -10)).toBe(0);
    expect(rotateFrom(square, 20, 5)).toBe(90);
  });

  it('settles on a multiple of 45 within 4 degrees, unless free', () => {
    const near = {
      x: 5 + Math.cos((-43 * Math.PI) / 180) * 10,
      y: 5 + Math.sin((-43 * Math.PI) / 180) * 10,
    };
    expect(rotateFrom(square, near.x, near.y)).toBe(45);
    expect(rotateFrom(square, near.x, near.y, { free: true })).toBe(47);
  });

  it('steps by 15 degrees with Shift', () => {
    const at = {
      x: 5 + Math.cos((-70 * Math.PI) / 180) * 10,
      y: 5 + Math.sin((-70 * Math.PI) / 180) * 10,
    };
    expect(rotateFrom(square, at.x, at.y, { step: true })).toBe(15);
  });

  it('keeps angles in [0, 360)', () => {
    expect(normalizeAngle(-90)).toBe(270);
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(725)).toBe(5);
  });
});

describe('frames and bounds', () => {
  it('reads a missing or broken frame as zeros', () => {
    expect(frameOf({ props: {} })).toEqual({ x: 0, y: 0, w: 0, h: 0, r: 0 });
    expect(frameOf({ props: { frame: { x: 'a', y: 2, w: -1, h: 3, r: -90 } } })).toEqual({
      x: 0,
      y: 2,
      w: 0,
      h: 3,
      r: 270,
    });
  });

  it('turns a rotated frame into the box it covers', () => {
    const bounds = frameBounds({ x: 0, y: 0, w: 40, h: 20, r: 90 });
    expect(round({ ...bounds, r: 0 })).toEqual({ x: 10, y: -10, w: 20, h: 40, r: 0 });
  });

  it('puts a box around several frames', () => {
    expect(unionBounds([box, { x: 0, y: 0, w: 5, h: 5, r: 0 }])).toEqual({
      x: 0,
      y: 0,
      w: 50,
      h: 40,
    });
    expect(unionBounds([])).toBeNull();
  });

  it('writes a number in the unit', () => {
    expect(formatUnit(12.5, { decimals: 2, label: 'mm' })).toBe('12.5 mm');
    expect(formatUnit(53.981, { decimals: 2, label: 'mm' })).toBe('53.98 mm');
    expect(formatUnit(-0.001, { decimals: 0, label: 'px' })).toBe('0 px');
  });
});
