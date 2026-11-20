import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { CODE128_PATTERNS, code128Values, encodeCode128 } from './code128';
import { encodeQr } from './qr';

/**
 * The encoders against outputs proven elsewhere. The QR codes below were
 * compared module for module with segno (a Python QR library), across all
 * four levels, versions 1 to 39 and two masks each, before they were written
 * down here; segno 1.6.6 needed one fix for that — it adds a whole zero byte
 * after a stream that already ends on a byte, which the standard does not.
 */

const rows = (modules: boolean[][]) =>
  modules.map((row) => row.map((dark) => (dark ? '1' : '0')).join(''));
const digest = (modules: boolean[][]) =>
  createHash('sha256').update(rows(modules).join('\n')).digest('hex');

describe('encodeQr', () => {
  it('draws a member code as segno does', () => {
    const code = encodeQr('MA02481173', 'M', { mask: 7 });
    expect(code && { version: code.version, size: code.size }).toEqual({ version: 1, size: 21 });
    expect(rows(code?.modules ?? [])).toEqual([
      '111111100110001111111',
      '100000100111101000001',
      '101110100111101011101',
      '101110100001001011101',
      '101110100101101011101',
      '100000101010001000001',
      '111111101010101111111',
      '000000000110000000000',
      '100101101001110100000',
      '100111011101010011010',
      '011101110101001001101',
      '111010000110111000001',
      '111100110001010011010',
      '000000001010010001000',
      '111111100111111011110',
      '100000101100010101011',
      '101110100000100011010',
      '101110101100011010011',
      '101110100111010010001',
      '100000100011100111000',
      '111111101000000110010',
    ]);
  });

  it('draws a link at level Q, and a long text at H with version information, as segno does', () => {
    const link = encodeQr('https://marrimauto.com/k/MA02481173', 'Q', { mask: 6 });
    expect(link?.version).toBe(4);
    expect(digest(link?.modules ?? [])).toBe(
      '67da97a7c524892b76bcc1c3e901545198da5345b0f0a3e401b3aee59f1e2625',
    );
    const long = encodeQr('y'.repeat(300), 'H', { mask: 2 });
    expect(long?.version).toBe(18);
    expect(digest(long?.modules ?? [])).toBe(
      'ae03a9936d90ede85fda0ac70fd4d48ef7c2877fdfac8ce8422bdb99aa1d7636',
    );
  });

  it('picks the smallest version, a mask by itself, and refuses what does not fit', () => {
    expect(encodeQr('MA02481173')?.version).toBe(1);
    expect(encodeQr('Arben Hoxha · Gold', 'H')?.version).toBe(3);
    const auto = encodeQr('MA02481173', 'M');
    expect(auto?.mask).toBeGreaterThanOrEqual(0);
    expect(auto?.mask).toBeLessThan(8);
    expect(encodeQr('x'.repeat(2954), 'L')).toBeNull();
    expect(encodeQr('x'.repeat(2953), 'L')?.version).toBe(40);
  });
});

describe('Code 128', () => {
  it('has 107 distinct symbols, each 11 modules (the stop 13) with an even bar total', () => {
    expect(new Set(CODE128_PATTERNS).size).toBe(107);
    CODE128_PATTERNS.forEach((pattern, value) => {
      const widths = Array.from(pattern, Number);
      const bars = widths
        .filter((_, index) => index % 2 === 0)
        .reduce((sum, width) => sum + width, 0);
      expect(
        widths.reduce((sum, width) => sum + width, 0),
        String(value),
      ).toBe(value === 106 ? 13 : 11);
      expect(bars % 2, String(value)).toBe(0);
    });
  });

  it('packs digit runs into set C and checks the sum', () => {
    // Start C, 12 34 56 78, check 47 (105 + 12 + 2·34 + 3·56 + 4·78 = 665 ≡ 47), stop.
    expect(code128Values('12345678')).toEqual([105, 12, 34, 56, 78, 47, 106]);
    // Letters in B, four digits switch to C, the space back to B.
    expect(code128Values('MA 0248 1173')).toEqual([
      104, 45, 33, 0, 99, 2, 48, 100, 0, 99, 11, 73, 14, 106,
    ]);
    // An odd run starts in B with one digit.
    expect(code128Values('123')).toEqual([104, 17, 99, 23, 79, 106]);
    expect(code128Values('X')).toEqual([104, 56, 57, 106]);
  });

  it('refuses no text and characters outside printable ASCII', () => {
    expect(encodeCode128('')).toBeNull();
    expect(encodeCode128('Kodi ë')).toBeNull();
    expect(encodeCode128('A\nB')).toBeNull();
    const code = encodeCode128('MA02481173');
    expect(code?.modules).toBe(code?.widths.reduce((sum, width) => sum + width, 0));
  });
});
