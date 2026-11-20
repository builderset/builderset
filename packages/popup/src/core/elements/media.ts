import { defineElement, mediaRefSchema, warning, UNPLACED_FRAME } from '@builderset/engine';
import { z } from 'zod';

import { hex, optionalHex } from '../document';
import { ELEMENT_PARENTS, frameSchema, weightSchema } from './common';

/**
 * Shapes and media: a rectangle, a circle, a line, a picture, an icon, the
 * brand's logo and a QR code. They hold no words a visitor reads, except a picture's description
 * and a QR code's address.
 */

const opacity = () => z.number().min(0).max(1);

export const rectElement = defineElement({
  type: 'rect',
  version: 1,
  category: 'media',
  icon: 'square',
  keywords: ['rectangle', 'box', 'shape', 'background'],
  schema: z.object({
    frame: frameSchema,
    /** Empty: no fill. */
    fill: optionalHex(),
    radius: z.number().int().min(0).max(500),
    /** Empty: no outline. */
    stroke: optionalHex(),
    strokeWidth: z.number().min(0).max(20),
    opacity: opacity(),
  }),
  defaults: () => ({
    frame: { ...UNPLACED_FRAME },
    fill: '#e06a1b',
    radius: 8,
    stroke: '',
    strokeWidth: 1,
    opacity: 1,
  }),
  parents: ELEMENT_PARENTS,
});

export const ellipseElement = defineElement({
  type: 'ellipse',
  version: 1,
  category: 'media',
  icon: 'circle',
  keywords: ['circle', 'oval', 'dot', 'shape'],
  schema: z.object({
    frame: frameSchema,
    fill: optionalHex(),
    stroke: optionalHex(),
    strokeWidth: z.number().min(0).max(20),
    opacity: opacity(),
  }),
  defaults: () => ({
    frame: { ...UNPLACED_FRAME },
    fill: '#e06a1b',
    stroke: '',
    strokeWidth: 1,
    opacity: 1,
  }),
  parents: ELEMENT_PARENTS,
});

export const lineElement = defineElement({
  type: 'line',
  version: 1,
  category: 'media',
  icon: 'slash',
  keywords: ['divider', 'rule', 'separator'],
  /** Its thickness is its frame's height. */
  schema: z.object({ frame: frameSchema, color: hex(), opacity: opacity() }),
  defaults: () => ({ frame: { ...UNPLACED_FRAME }, color: '#d1d5db', opacity: 1 }),
  parents: ELEMENT_PARENTS,
});

export const imageElement = defineElement({
  type: 'image',
  version: 1,
  category: 'media',
  icon: 'image',
  keywords: ['picture', 'photo'],
  schema: z.object({
    frame: frameSchema,
    /** The uploaded picture; none: a placeholder in `tone`. */
    media: mediaRefSchema.nullable(),
    /** What the picture shows, for people who cannot see it. Empty: decorative. */
    alt: z.string().max(300),
    fit: z.enum(['cover', 'contain']),
    radius: z.number().int().min(0).max(500),
    opacity: opacity(),
    /** The placeholder's colour while there is no picture. */
    tone: hex(),
  }),
  defaults: () => ({
    frame: { ...UNPLACED_FRAME },
    media: null,
    alt: '',
    fit: 'cover' as const,
    radius: 8,
    opacity: 1,
    tone: '#2b3442',
  }),
  parents: ELEMENT_PARENTS,
  media: (props) => (props.media ? [props.media] : []),
  check: (props, { node }) =>
    props.media && !props.alt.trim()
      ? [warning('image.altMissing', { nodeId: node.id, path: 'alt' })]
      : [],
});

/** The icons a popup offers (lucide names). */
export const POPUP_ICONS = [
  'star',
  'check',
  'clock',
  'car',
  'phone',
  'send',
  'gift',
  'tag',
  'percent',
  'bell',
  'mail',
  'shield-check',
  'sparkles',
  'map-pin',
  'calendar',
  'smartphone',
  'cookie',
  'heart',
  'info',
  'megaphone',
] as const;
export type PopupIcon = (typeof POPUP_ICONS)[number];

export const iconElement = defineElement({
  type: 'icon',
  version: 1,
  category: 'media',
  icon: 'star',
  keywords: ['symbol', 'pictogram'],
  schema: z.object({
    frame: frameSchema,
    name: z.enum(POPUP_ICONS),
    color: hex(),
    strokeWidth: z.number().min(0.5).max(4),
  }),
  defaults: () => ({
    frame: { ...UNPLACED_FRAME },
    name: 'star' as const,
    color: '#e06a1b',
    strokeWidth: 2,
  }),
  parents: ELEMENT_PARENTS,
});

export const logoElement = defineElement({
  type: 'logo',
  version: 1,
  category: 'media',
  icon: 'badge-check',
  keywords: ['brand', 'wordmark'],
  schema: z.object({
    frame: frameSchema,
    /** The wordmark, and the logo file's description when there is one. */
    text: z.string().max(80),
    /** An uploaded logo; none: the wordmark in type. */
    media: mediaRefSchema.nullable(),
    size: z.number().int().min(6).max(200),
    weight: weightSchema,
    color: optionalHex(),
  }),
  defaults: () => ({
    frame: { ...UNPLACED_FRAME },
    text: 'Logo',
    media: null,
    size: 22,
    weight: 800 as const,
    color: '',
  }),
  parents: ELEMENT_PARENTS,
  toPlainText: (props) => props.text,
  media: (props) => (props.media ? [props.media] : []),
});

export const qrElement = defineElement({
  type: 'qr',
  version: 1,
  category: 'media',
  icon: 'qr-code',
  keywords: ['qr code', 'scan', 'app'],
  schema: z.object({
    frame: frameSchema,
    /** What a phone reads: an address, usually. May hold variables. */
    data: z.string().min(1).max(500),
    color: hex(),
    background: hex(),
  }),
  defaults: () => ({
    frame: { ...UNPLACED_FRAME },
    data: 'https://example.com',
    color: '#111827',
    background: '#ffffff',
  }),
  parents: ELEMENT_PARENTS,
  toPlainText: (props) => props.data,
});

export const mediaElements = [
  rectElement,
  ellipseElement,
  lineElement,
  imageElement,
  iconElement,
  logoElement,
  qrElement,
];
