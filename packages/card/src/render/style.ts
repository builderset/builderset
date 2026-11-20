import type { CSSProperties } from 'react';

import { CARD_FONTS, type CardFont, type CardFormatProps } from '../core';

/**
 * A card's measurements as the variables `card.css` reads. Everything on a
 * card is sized in millimetres times `--bsc-mm`, the pixels one millimetre
 * takes: change that one value and the whole card scales — a thumbnail, the
 * editor at any zoom, a screen at actual size (`96 / 25.4`), a print sheet
 * (`1mm`).
 */

/** Pixels per millimetre at actual size on a screen: CSS's 96 per inch. */
export const ACTUAL_SIZE = 96 / 25.4;

/** The variables on a card's outermost element. `scale` is pixels per millimetre, or a CSS length. */
export function cardStyle(
  format: Pick<CardFormatProps, 'width' | 'height' | 'radius'>,
  scale: number | string = ACTUAL_SIZE,
): CSSProperties {
  return {
    '--bsc-mm': typeof scale === 'number' ? `${String(scale)}px` : scale,
    '--bsc-w': String(format.width),
    '--bsc-h': String(format.height),
    '--bsc-radius': String(format.radius),
  } as CSSProperties;
}

/** An element's frame as the variables `.bsc-el` is placed with. */
export function frameStyle(frame: { x: number; y: number; w: number; h: number; r: number }) {
  return {
    '--x': String(frame.x),
    '--y': String(frame.y),
    '--w': String(frame.w),
    '--h': String(frame.h),
    '--r': `${String(frame.r)}deg`,
  } as CSSProperties;
}

/** How light a colour is, 0–1 (relative luminance, roughly). */
function lightness(hex: string): number {
  const value = /^#([0-9a-f]{6})$/i.exec(hex)?.[1];
  if (!value) return 1;
  const [r, g, b] = [0, 2, 4].map((at) => parseInt(value.slice(at, at + 2), 16) / 255);
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

/** The ink that reads on a background: near-black on light, white on dark. */
export function inkOn(background: string): string {
  return lightness(background) > 0.5 ? '#111827' : '#ffffff';
}

export function fontStack(font: CardFont): string {
  return CARD_FONTS[font].stack;
}

/**
 * The web fonts a card's type uses, from Google Fonts — for a page that does
 * not load them itself. Georgia and the system stack need nothing.
 */
export const CARD_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&family=Sora:wght@400;500;600;700;800&display=swap';
