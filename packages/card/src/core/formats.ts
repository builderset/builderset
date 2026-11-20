/**
 * What a card can be, and the measurements the standards fix.
 *
 * Most plastic cards are ISO/IEC 7810 ID-1 — a bank card's size, 85.60 ×
 * 53.98 mm with 3.18 mm corners — and readers, wallets and card printers are
 * built around it. A format is a starting size and corner; the person may
 * still change both (a format only decides what the inspector offers and
 * which checks apply: a bank card wants its chip).
 */

/** ISO/IEC 7810 ID-1, in millimetres. */
export const ISO_ID1 = { width: 85.6, height: 53.98, radius: 3.18 } as const;

export const CARD_FORMAT_IDS = [
  'membership',
  'id',
  'bank',
  'business',
  'badge',
  'wallet',
  'custom',
] as const;
export type CardFormat = (typeof CARD_FORMAT_IDS)[number];

export interface CardFormatSpec {
  id: CardFormat;
  /** Millimetres. */
  width: number;
  height: number;
  /** The corners' radius, millimetres. */
  radius: number;
  /** Printed (bleed, safe area, a print-ready PDF), or only shown on a screen (a wallet pass). */
  print: boolean;
  /** The lucide icon the format pickers show. */
  icon: string;
}

/** Every format, in the order the pickers list them. Names and lines are in the locales. */
export const CARD_FORMATS: readonly CardFormatSpec[] = [
  { id: 'membership', ...ISO_ID1, print: true, icon: 'badge-check' },
  { id: 'id', ...ISO_ID1, print: true, icon: 'id-card' },
  { id: 'bank', ...ISO_ID1, print: true, icon: 'credit-card' },
  { id: 'business', width: 85, height: 55, radius: 0, print: true, icon: 'contact' },
  {
    id: 'badge',
    width: ISO_ID1.height,
    height: ISO_ID1.width,
    radius: ISO_ID1.radius,
    print: true,
    icon: 'id-card-lanyard',
  },
  { id: 'wallet', width: 85.6, height: 53.98, radius: 4, print: false, icon: 'wallet' },
  { id: 'custom', width: 90, height: 60, radius: 2, print: true, icon: 'ruler' },
];

export function formatSpec(id: CardFormat): CardFormatSpec {
  const spec = CARD_FORMATS.find((format) => format.id === id);
  if (!spec) throw new Error(`Unknown card format "${id}".`);
  return spec;
}

/**
 * Where a bank card's contact chip goes (ISO/IEC 7816-2): its contacts start
 * 10.25 mm from the left edge and 19.23 mm from the top, on the front of a
 * landscape card. The box is the chip module the editor draws there.
 */
export const CHIP_ZONE = { x: 10.25, y: 19.23, width: 11, height: 9 } as const;

/**
 * Where the magnetic stripe runs (ISO/IEC 7811): across the back, its top
 * 5.54 mm below the card's top edge, 12.7 mm wide for three tracks.
 */
export const STRIPE_ZONE = { y: 5.54, height: 12.7 } as const;
