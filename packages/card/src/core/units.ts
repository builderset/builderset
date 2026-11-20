/**
 * Millimetres, points and pixels.
 *
 * A card is designed in millimetres because it is printed in millimetres: the
 * cut, the bleed and the safe area are all lengths on the sheet. Type is sized
 * in points, the unit printers and designers think in — and the unit the
 * "smaller than 6 pt" check is written in. Pixels only exist on a screen
 * (96 per inch, by CSS's definition) or in an exported image (the print's dpi).
 */

/** Millimetres in one inch. */
export const MM_PER_INCH = 25.4;
/** Millimetres in one typographic point (1/72 inch): 0.3528 mm. */
export const PT_MM = MM_PER_INCH / 72;
/** CSS pixels in one inch: what "actual size" on a screen means. */
export const CSS_DPI = 96;

export const ptToMm = (pt: number): number => pt * PT_MM;
export const mmToPt = (mm: number): number => mm / PT_MM;

/** Pixels for a length at a resolution: 85.6 mm at 300 dpi is 1011 px. */
export const mmToPx = (mm: number, dpi: number = CSS_DPI): number => (mm / MM_PER_INCH) * dpi;
export const pxToMm = (px: number, dpi: number = CSS_DPI): number => (px / dpi) * MM_PER_INCH;

/** A length rounded for showing: 85.6, 53.98, never 53.980000000001. */
export const roundTo = (value: number, decimals = 2): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};
