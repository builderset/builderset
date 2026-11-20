import { ElementRegistry, type ElementDefinition } from '@builderset/engine';

import { CHIP_ZONE, ISO_ID1, STRIPE_ZONE } from '../formats';
import { partElements } from './parts';
import { shapeElements } from './shapes';
import { structureElements } from './structure';
import { textElements } from './text';

export * from './common';
export * from './parts';
export * from './shapes';
export * from './structure';
export * from './text';

/** The library's categories, in order. `structure` (the root and sides) is never offered. */
export const CARD_CATEGORIES = ['text', 'parts', 'shapes', 'structure'] as const;

/** Every element of a card. */
export const standardCardElements = [
  ...structureElements,
  ...textElements,
  ...partElements,
  ...shapeElements,
] as unknown as readonly ElementDefinition<never>[];

/** A registry of the standard elements and, optionally, a host's own. */
export function createCardRegistry(
  plugins: readonly ElementDefinition<never>[] = [],
): ElementRegistry {
  return new ElementRegistry([...standardCardElements, ...plugins]);
}

/** Words: what the checks hold to 6 pt and keep inside the safe area. */
export const TEXT_TYPES = ['heading', 'text', 'label', 'field', 'logo'] as const;
/** What must stay inside the safe area: words, codes, the photo, the signature strip. */
export const SAFE_TYPES = [...TEXT_TYPES, 'qr', 'barcode', 'photo', 'sign'] as const;

/**
 * A new element's size, millimetres — and, for the parts the standards put in
 * one place, where it goes: a bank card's chip at its ISO 7816 spot, the
 * magnetic stripe across the back at its ISO 7811 height.
 */
export const CARD_SIZES: Readonly<
  Record<string, { w: number; h: number; x?: number; y?: number }>
> = {
  heading: { w: 46, h: 7 },
  text: { w: 40, h: 8 },
  label: { w: 25, h: 3.5 },
  field: { w: 36, h: 5 },
  logo: { w: 25, h: 5 },
  photo: { w: 14, h: 17.5 },
  qr: { w: 17, h: 17 },
  barcode: { w: 33, h: 7.5 },
  chip: { x: CHIP_ZONE.x, y: CHIP_ZONE.y, w: CHIP_ZONE.width, h: CHIP_ZONE.height },
  nfc: { w: 4.5, h: 4.5 },
  stripe: { x: 0, y: STRIPE_ZONE.y, w: ISO_ID1.width, h: STRIPE_ZONE.height },
  sign: { w: 42, h: 7 },
  rect: { w: 23, h: 15 },
  ellipse: { w: 16, h: 16 },
  line: { w: 30, h: 0.3 },
  image: { w: 28, h: 19 },
  icon: { w: 5, h: 5 },
};

/**
 * A new element's frame on a card of this width: its size, and the stripe as
 * wide as the card. A host's own element without a size gets a 20 mm square.
 */
export function cardSizeOf(
  type: string,
  cardWidth: number = ISO_ID1.width,
): { w: number; h: number; x?: number; y?: number } {
  const size = CARD_SIZES[type] ?? { w: 20, h: 20 };
  return type === 'stripe' ? { ...size, w: cardWidth } : size;
}
