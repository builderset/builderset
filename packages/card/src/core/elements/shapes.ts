import { defineElement, mediaRefSchema } from '@builderset/engine';
import { z } from 'zod';

import { hexColor, optionalColor } from '../document';
import { ELEMENT_PARENTS, frameSchema, unplaced } from './common';

/** Shapes and pictures: colour, outlines, an uploaded image, an icon. */

const opacity = () => z.number().min(0).max(1);

export const rectElement = defineElement({
  type: 'rect',
  version: 1,
  category: 'shapes',
  icon: 'rectangle-horizontal',
  keywords: ['rectangle', 'box', 'band', 'square'],
  schema: z.object({
    frame: frameSchema,
    fill: optionalColor(),
    stroke: optionalColor(),
    /** Millimetres. */
    strokeWidth: z.number().min(0).max(10),
    radius: z.number().min(0).max(100),
    opacity: opacity(),
  }),
  defaults: () => ({
    frame: unplaced(),
    fill: '#e06a1b',
    stroke: '',
    strokeWidth: 0,
    radius: 1.3,
    opacity: 1,
  }),
  parents: ELEMENT_PARENTS,
});

export const ellipseElement = defineElement({
  type: 'ellipse',
  version: 1,
  category: 'shapes',
  icon: 'circle-dot',
  keywords: ['circle', 'oval', 'ring'],
  schema: z.object({
    frame: frameSchema,
    fill: optionalColor(),
    stroke: optionalColor(),
    strokeWidth: z.number().min(0).max(10),
    opacity: opacity(),
  }),
  defaults: () => ({
    frame: unplaced(),
    fill: '#e06a1b',
    stroke: '',
    strokeWidth: 0,
    opacity: 1,
  }),
  parents: ELEMENT_PARENTS,
});

export const lineElement = defineElement({
  type: 'line',
  version: 1,
  category: 'shapes',
  icon: 'minus',
  keywords: ['rule', 'divider'],
  schema: z.object({ frame: frameSchema, color: hexColor(), opacity: opacity() }),
  defaults: () => ({ frame: unplaced(), color: '#d1d5db', opacity: 1 }),
  parents: ELEMENT_PARENTS,
});

export const imageElement = defineElement({
  type: 'image',
  version: 1,
  category: 'shapes',
  icon: 'image',
  keywords: ['picture', 'photo', 'background'],
  schema: z.object({
    frame: frameSchema,
    media: mediaRefSchema.nullable(),
    fit: z.enum(['cover', 'contain']),
    radius: z.number().min(0).max(100),
    opacity: opacity(),
    /** What the frame shows until a picture is chosen. */
    tone: hexColor(),
  }),
  defaults: () => ({
    frame: unplaced(),
    media: null,
    fit: 'cover' as const,
    radius: 1.3,
    opacity: 1,
    tone: '#2b3442',
  }),
  parents: ELEMENT_PARENTS,
  media: (props) => (props.media ? [props.media] : []),
});

/** The icons a card offers, by their lucide names. */
export const CARD_ICONS = [
  'star',
  'check',
  'car',
  'wrench',
  'shield-check',
  'key-round',
  'phone',
  'mail',
  'globe',
  'map-pin',
  'clock',
  'gift',
  'ticket',
  'heart',
] as const;
export type CardIcon = (typeof CARD_ICONS)[number];

export const iconElement = defineElement({
  type: 'icon',
  version: 1,
  category: 'shapes',
  icon: 'star',
  keywords: ['symbol', 'pictogram'],
  schema: z.object({ frame: frameSchema, name: z.enum(CARD_ICONS), color: hexColor() }),
  defaults: () => ({ frame: unplaced(), name: 'star' as const, color: '#e06a1b' }),
  parents: ELEMENT_PARENTS,
});

export const shapeElements = [rectElement, ellipseElement, lineElement, imageElement, iconElement];
