import { i18nSchema, nodeShapeSchema, ROOT_ID, type EngineDocument } from '@builderset/engine';
import { z } from 'zod';

import { CARD_FORMAT_IDS, formatSpec, type CardFormat } from './formats';

/**
 * A card, as data.
 *
 * The engine's node tree: the root holds the card's format (its size in
 * millimetres, corners, sides and how it is printed), and two `side` nodes —
 * the front and the back — hold the elements placed on them, each at its own
 * frame (x, y, width, height in millimetres, and a rotation). Both sides are
 * always there: a card switched to one side keeps its back, unprinted, so
 * switching back loses nothing.
 */

export const CARD_SCHEMA = 'card/document' as const;
export const CARD_VERSION = 1;
/** The root's id — the engine's, so the shared tree checks apply. */
export const CARD_ROOT = ROOT_ID;
/** The sides' ids in a card made here. A stored card may use others; `face` is what counts. */
export const FRONT_ID = 'front';
export const BACK_ID = 'back';

/** A colour as `#rrggbb`. */
export const hexColor = () => z.string().regex(/^#[0-9a-fA-F]{6}$/);
/** A colour, or empty for "none" (a text's colour: the ink that reads on its side). */
export const optionalColor = () => z.string().regex(/^(#[0-9a-fA-F]{6})?$/);

/** The fonts a card may use: system stacks, and web fonts the host page loads. */
export const CARD_FONTS = {
  poppins: { label: 'Poppins', stack: '"Poppins", ui-sans-serif, system-ui, sans-serif' },
  sora: { label: 'Sora', stack: '"Sora", ui-sans-serif, system-ui, sans-serif' },
  inter: { label: 'Inter', stack: '"Inter", ui-sans-serif, system-ui, sans-serif' },
  mono: {
    label: 'Geist Mono',
    stack: '"Geist Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
  },
  georgia: { label: 'Georgia', stack: 'Georgia, "Times New Roman", serif' },
  system: {
    label: 'System',
    stack: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  },
} as const;
export type CardFont = keyof typeof CARD_FONTS;
export const CARD_FONT_KEYS = Object.keys(CARD_FONTS) as [CardFont, ...CardFont[]];

// #region shape
/** How the card is printed. Lengths in millimetres. */
export const cardPrintSchema = z.object({
  /** Colour runs this far past the cut line, so no white edge shows. */
  bleed: z.number().min(0).max(10),
  /** Text and codes stay this far inside the cut line: printers can cut a little off. */
  safe: z.number().min(0).max(15),
  dpi: z.union([z.literal(300), z.literal(600)]),
  colour: z.enum(['cmyk', 'rgb']),
  material: z.enum(['pvc', 'recycled-pvc', 'paper']),
  finish: z.enum(['matte', 'gloss', 'soft-touch']),
  /** Cards to print. */
  quantity: z.number().int().min(1).max(1_000_000),
});
export type CardPrint = z.infer<typeof cardPrintSchema>;

/** The root's props: the card's format. */
export const cardFormatSchema = z.object({
  format: z.enum(CARD_FORMAT_IDS),
  /** Millimetres. */
  width: z.number().min(20).max(300),
  height: z.number().min(20).max(300),
  /** The corners' radius, millimetres. */
  radius: z.number().min(0).max(20),
  /** Printed sides. With one, the back is kept but neither printed nor checked. */
  sides: z.union([z.literal(1), z.literal(2)]),
  print: cardPrintSchema,
  /** The member list the cards are printed for, as the host names it. Empty: none chosen. */
  source: z.string().max(120),
});
export type CardFormatProps = z.infer<typeof cardFormatSchema>;

export const cardMetaSchema = z.object({
  /** The design's working name in the admin. */
  name: z.string().max(120),
});
export type CardMeta = z.infer<typeof cardMetaSchema>;

/** The engine's node tree with a card's meta. `i18n` holds the words in other languages. */
export interface CardDocument extends EngineDocument<CardMeta> {
  schema: typeof CARD_SCHEMA;
}
// #endregion shape

export const defaultPrint = (): CardPrint => ({
  bleed: 3,
  safe: 3,
  dpi: 300,
  colour: 'cmyk',
  material: 'pvc',
  finish: 'matte',
  quantity: 250,
});

/** A format's props: its size and corners, printed on both sides. */
export function formatProps(format: CardFormat = 'membership'): CardFormatProps {
  const spec = formatSpec(format);
  return {
    format,
    width: spec.width,
    height: spec.height,
    radius: spec.radius,
    sides: 2,
    print: defaultPrint(),
    source: '',
  };
}

/** A card of a format with an empty front and back. */
export function createCardDocument(
  options: { meta?: Partial<CardMeta> | undefined; format?: CardFormat | undefined } = {},
): CardDocument {
  return {
    schema: CARD_SCHEMA,
    version: CARD_VERSION,
    root: CARD_ROOT,
    nodes: {
      [CARD_ROOT]: {
        id: CARD_ROOT,
        type: 'root',
        v: 1,
        props: formatProps(options.format),
        children: [FRONT_ID, BACK_ID],
      },
      [FRONT_ID]: {
        id: FRONT_ID,
        type: 'side',
        v: 1,
        props: { face: 'front', background: '#ffffff', image: null },
        children: [],
      },
      [BACK_ID]: {
        id: BACK_ID,
        type: 'side',
        v: 1,
        props: { face: 'back', background: '#ffffff', image: null },
        children: [],
      },
    },
    meta: { name: '', ...options.meta },
  };
}

export const cardShapeSchema = z.object({
  schema: z.literal(CARD_SCHEMA),
  version: z.number().int().min(1),
  root: z.literal(CARD_ROOT),
  nodes: z.record(z.string(), nodeShapeSchema),
  meta: cardMetaSchema,
  i18n: i18nSchema.optional(),
});
