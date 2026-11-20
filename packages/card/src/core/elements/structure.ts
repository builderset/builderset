import { defineElement, mediaRefSchema } from '@builderset/engine';
import { z } from 'zod';

import { cardFormatSchema, formatProps, hexColor } from '../document';

/**
 * A card's skeleton: the root holds the format and exactly two sides, the
 * front and the back, and a side holds the elements placed on it.
 */

export const cardRootElement = defineElement({
  type: 'root',
  version: 1,
  category: 'structure',
  icon: 'credit-card',
  internal: true,
  schema: cardFormatSchema,
  defaults: () => formatProps('membership'),
  container: { only: ['side'], min: 2, max: 2 },
});

export const sideElement = defineElement({
  type: 'side',
  version: 1,
  category: 'structure',
  icon: 'rectangle-horizontal',
  internal: true,
  schema: z.object({
    face: z.enum(['front', 'back']),
    background: hexColor(),
    /** A picture filling the side, under every element: 300 dpi or more to print well. */
    image: mediaRefSchema.nullable(),
  }),
  defaults: () => ({ face: 'front' as const, background: '#ffffff', image: null }),
  parents: ['root'],
  container: {},
});

export const structureElements = [cardRootElement, sideElement];
