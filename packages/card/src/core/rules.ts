import { isSafeUrl } from '@builderset/engine';

import { PT_MM } from './units';

/**
 * The numbers and lists the checks hold a card to, in one place: the checks
 * read them, and the JSON Schema publishes them (`x-rules`) so a server in
 * another language holds a card to exactly the same ones.
 */
export const CARD_RULES = {
  /** Type smaller than this many points is hard to read once printed. */
  minTextPt: 6,
  /** A QR code smaller than this many millimetres is not reliably scanned by phones. */
  minQrMm: 15,
  /** Millimetres in a point. */
  ptMm: PT_MM,
  /** How far, in millimetres, an element may poke over the safe area before it counts. */
  tolerance: 0.05,
  /** Schemes a QR code may only carry as a safe link (see `isSafeUrl`). */
  webSchemes: ['http', 'https', 'mailto', 'tel'],
  /** Schemes a QR code never carries: they run code or read files. */
  dangerousSchemes: ['javascript', 'data', 'vbscript', 'file'],
  /** The characters Code 128 (set B) encodes: printable ASCII. */
  barcodeChars: { min: 32, max: 126 },
} as const;

// Whitespace and control characters inside a scheme are how `java\tscript:`
// would pass a naive look at the start.
// eslint-disable-next-line no-control-regex
const INVISIBLE = /[\s\u0000-\u001f\u007f]/g;

/**
 * Whether what a QR code encodes is a link a phone should not be sent to.
 * Plain values (`MA02481173`), and payloads of other kinds (`WIFI:…`,
 * `BEGIN:VCARD`, `sms:…`), are not links and are never refused.
 */
export function isUnsafeCodeLink(data: string): boolean {
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(data.replace(INVISIBLE, ''))?.[1]?.toLowerCase();
  if (!scheme) return false;
  if ((CARD_RULES.dangerousSchemes as readonly string[]).includes(scheme)) return true;
  if ((CARD_RULES.webSchemes as readonly string[]).includes(scheme)) return !isSafeUrl(data);
  return false;
}

/** Characters Code 128 cannot encode, in order, once. */
export function unencodableChars(text: string): string[] {
  const { min, max } = CARD_RULES.barcodeChars;
  const bad = new Set<string>();
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code < min || code > max) bad.add(char);
  }
  return [...bad];
}
