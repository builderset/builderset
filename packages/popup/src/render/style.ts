import type { CSSProperties } from 'react';

import { POPUP_TYPES, positionOf, type PopupFormat } from '../core';

/**
 * A popup's look as the variables `popup.css` reads, the classes that place
 * it, and how far it shrinks to fit. One place, so the editor's stage, its
 * preview and a host's page cannot draw the same popup two ways.
 */

export const SHADOWS = {
  none: 'none',
  soft: '0 10px 30px rgba(15, 17, 22, 0.18)',
  strong: '0 30px 80px rgba(15, 17, 22, 0.38), 0 2px 6px rgba(15, 17, 22, 0.12)',
} as const;

/** Room left around a popup that does not fill the screen, each side, in CSS pixels. */
export const EDGE = 16;

/** The room a popup is drawn in: the window, or the element a preview puts it in. */
export interface PopupViewport {
  width: number;
  height: number;
}

/**
 * How much the popup is scaled down to fit: never up. A popup that fills the
 * width (a bar) or the screen keeps its design box whole inside it; any other
 * keeps a margin of `EDGE` each side.
 */
export function popupScale(format: PopupFormat, viewport: PopupViewport): number {
  const fill = POPUP_TYPES[format.type].fill;
  const room =
    fill === 'none' && format.type !== 'inline' ? viewport.width - EDGE * 2 : viewport.width;
  let scale = Math.min(1, room / format.width);
  if (fill === 'both') scale = Math.min(scale, viewport.height / format.height);
  return Math.max(0.1, scale);
}

/** The variables on the popup's outermost element. */
export function popupStyle(format: PopupFormat, scale = 1): CSSProperties {
  const fill = POPUP_TYPES[format.type].fill;
  return {
    '--bsp-w': `${String(format.width)}px`,
    '--bsp-h': `${String(format.height)}px`,
    '--bsp-scale': String(scale),
    '--bsp-bg': format.background,
    '--bsp-radius': `${String(fill === 'none' ? format.radius : 0)}px`,
    '--bsp-shadow': SHADOWS[format.shadow],
    '--bsp-dim': `rgba(15, 17, 22, ${String(format.overlay / 100)})`,
    '--bsp-blur': format.blur ? '3px' : '0px',
    '--bsp-duration': `${String(format.motion.duration)}ms`,
  } as CSSProperties;
}

/** The popup's classes: `bsp`, its type, where it sits, how it comes in. */
export function popupClassName(format: PopupFormat): string {
  return [
    'bsp',
    `bsp-t-${format.type}`,
    `bsp-p-${positionOf(format.type, format.position)}`,
    `bsp-fill-${POPUP_TYPES[format.type].fill}`,
    format.motion.enter === 'none' ? '' : `bsp-in-${format.motion.enter}`,
    format.motion.exit === 'none' ? '' : `bsp-out-${format.motion.exit}`,
  ]
    .filter(Boolean)
    .join(' ');
}

/** Dark words on a light background, light on a dark one. */
export function inkOn(background: string): string {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(background);
  if (!match) return '#111827';
  const [r, g, b] = [match[1], match[2], match[3]].map((part) => {
    const channel = parseInt(part ?? '0', 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
  return luminance > 0.4 ? '#111827' : '#ffffff';
}
