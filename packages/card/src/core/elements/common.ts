import { freeFrameSchema, UNPLACED_FRAME, type FreeFrame } from '@builderset/engine';
import { z } from 'zod';

import { CARD_FONT_KEYS, optionalColor } from '../document';

/**
 * What every placed element shares — its frame — and what every piece of
 * words shares: the type it is set in.
 *
 * The frame is the engine's free-canvas frame, in millimetres from the card's
 * top-left corner (the cut line, not the bleed), with a clockwise rotation in
 * degrees about its centre. An element may reach into the bleed or past it: a
 * band of colour that runs off the edge is how a card is printed without a
 * white rim. A new element's frame has no size until the editor places it
 * (`cardSizeOf` says how big).
 */

/** Placed elements sit on a side. */
export const ELEMENT_PARENTS = ['side'] as const;

// #region frame
export const frameSchema = freeFrameSchema;
export type CardFrame = FreeFrame;
// #endregion frame

/** A new element's frame: unplaced, so the editor sizes and centres it. */
export const unplaced = (): CardFrame => ({ ...UNPLACED_FRAME });

// #region text
/** The props of every piece of words on a card. Sizes in points, lengths in millimetres. */
export const textShape = {
  frame: frameSchema,
  /** The words; `{{member.name}}` is filled from each member. */
  text: z.string().max(500),
  font: z.enum(CARD_FONT_KEYS),
  /** Points: 6 pt is the smallest that reads once printed. */
  size: z.number().min(2).max(120),
  weight: z.number().int().min(100).max(900).multipleOf(100),
  /** Empty: the ink that reads on the side's background. */
  color: optionalColor(),
  align: z.enum(['left', 'center', 'right']),
  valign: z.enum(['top', 'middle', 'bottom']),
  lineHeight: z.number().min(0.6).max(3),
  /** In em: 0.1 is a tenth of the type's size. */
  letterSpacing: z.number().min(-0.2).max(1),
  upper: z.boolean(),
  /** A colour behind the words — a pill around a tier. Empty: none. */
  background: optionalColor(),
  /** The highlight's corners, millimetres. */
  backgroundRadius: z.number().min(0).max(30),
};
// #endregion text

export interface TextDefaults {
  text: string;
  size: number;
  weight?: number;
  font?: (typeof CARD_FONT_KEYS)[number];
  color?: string;
  letterSpacing?: number;
  upper?: boolean;
  lineHeight?: number;
}

export function textDefaults(given: TextDefaults) {
  return {
    frame: unplaced(),
    text: given.text,
    font: given.font ?? 'poppins',
    size: given.size,
    weight: given.weight ?? 400,
    color: given.color ?? '',
    align: 'left' as const,
    valign: 'top' as const,
    lineHeight: given.lineHeight ?? 1.25,
    letterSpacing: given.letterSpacing ?? 0,
    upper: given.upper ?? false,
    background: '',
    backgroundRadius: 0,
  };
}
