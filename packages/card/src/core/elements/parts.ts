import { defineElement, mediaRefSchema } from '@builderset/engine';
import { z } from 'zod';

import { CARD_FONT_KEYS, hexColor } from '../document';
import { FIELD_PATH } from '../data';
import { ELEMENT_PARENTS, frameSchema, unplaced } from './common';

/**
 * The parts a card has and a page does not: the logo, the member's photo,
 * codes a reader scans, the contact chip, the contactless mark, the magnetic
 * stripe and the strip a member signs.
 */

export const logoElement = defineElement({
  type: 'logo',
  version: 1,
  category: 'parts',
  icon: 'badge-check',
  keywords: ['brand', 'wordmark'],
  schema: z.object({
    frame: frameSchema,
    /** The wordmark, drawn in type while no logo file is chosen. */
    text: z.string().max(80),
    font: z.enum(CARD_FONT_KEYS),
    /** Points. */
    size: z.number().min(2).max(120),
    color: hexColor(),
    /** An uploaded logo, drawn in place of the wordmark. */
    media: mediaRefSchema.nullable(),
  }),
  defaults: () => ({
    frame: unplaced(),
    text: 'marrimauto',
    font: 'sora' as const,
    size: 10.5,
    color: '#ffffff',
    media: null,
  }),
  parents: ELEMENT_PARENTS,
  toPlainText: (props) => props.text,
  media: (props) => (props.media ? [props.media] : []),
});

export const photoElement = defineElement({
  type: 'photo',
  version: 1,
  category: 'parts',
  icon: 'square-user',
  keywords: ['portrait', 'face', 'member'],
  schema: z.object({
    frame: frameSchema,
    /** The photo field each card takes its picture from. */
    bind: z.string().regex(FIELD_PATH),
    radius: z.number().min(0).max(100),
    /** What the frame shows without a photo. */
    tone: hexColor(),
  }),
  defaults: () => ({
    frame: unplaced(),
    bind: 'member.photo',
    radius: 1.7,
    tone: '#374151',
  }),
  parents: ELEMENT_PARENTS,
});

export const qrElement = defineElement({
  type: 'qr',
  version: 1,
  category: 'parts',
  icon: 'qr-code',
  keywords: ['code', 'scan', 'link'],
  schema: z.object({
    frame: frameSchema,
    /** What it encodes: a member's code, or a link. */
    data: z.string().max(500),
    color: hexColor(),
    background: hexColor(),
    /** Error correction: how much of the code may be scratched off and still scan. */
    level: z.enum(['L', 'M', 'Q', 'H']),
  }),
  defaults: () => ({
    frame: unplaced(),
    data: '{{member.qr}}',
    color: '#111827',
    background: '#ffffff',
    level: 'M' as const,
  }),
  parents: ELEMENT_PARENTS,
});

export const barcodeElement = defineElement({
  type: 'barcode',
  version: 1,
  category: 'parts',
  icon: 'barcode',
  keywords: ['code 128', 'scan', 'number'],
  schema: z.object({
    frame: frameSchema,
    /** What it encodes, as Code 128: letters, digits and punctuation without accents. */
    data: z.string().max(80),
    color: hexColor(),
  }),
  defaults: () => ({ frame: unplaced(), data: '{{member.number}}', color: '#111827' }),
  parents: ELEMENT_PARENTS,
});

export const chipElement = defineElement({
  type: 'chip',
  version: 1,
  category: 'parts',
  icon: 'cpu',
  keywords: ['emv', 'smart card', 'contact'],
  schema: z.object({ frame: frameSchema, finish: z.enum(['gold', 'silver']) }),
  defaults: () => ({
    frame: unplaced(),
    finish: 'gold' as const,
  }),
  parents: ELEMENT_PARENTS,
});

export const nfcElement = defineElement({
  type: 'nfc',
  version: 1,
  category: 'parts',
  icon: 'nfc',
  keywords: ['contactless', 'tap'],
  schema: z.object({ frame: frameSchema, color: hexColor() }),
  defaults: () => ({ frame: unplaced(), color: '#ffffff' }),
  parents: ELEMENT_PARENTS,
});

export const stripeElement = defineElement({
  type: 'stripe',
  version: 1,
  category: 'parts',
  icon: 'credit-card',
  keywords: ['magnetic', 'magstripe'],
  schema: z.object({ frame: frameSchema, color: hexColor() }),
  defaults: () => ({
    frame: unplaced(),
    color: '#1f2937',
  }),
  parents: ELEMENT_PARENTS,
});

export const signElement = defineElement({
  type: 'sign',
  version: 1,
  category: 'parts',
  icon: 'signature',
  keywords: ['signature', 'autograph'],
  schema: z.object({ frame: frameSchema, label: z.string().max(60), color: hexColor() }),
  defaults: () => ({ frame: unplaced(), label: 'Nënshkrimi', color: '#9ca3af' }),
  parents: ELEMENT_PARENTS,
  toPlainText: (props) => props.label,
});

export const partElements = [
  logoElement,
  photoElement,
  qrElement,
  barcodeElement,
  chipElement,
  nfcElement,
  stripeElement,
  signElement,
];
