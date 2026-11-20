/**
 * A QR code, made here: a popup's "scan to get the app" must scan, and the
 * package takes no dependency for it.
 *
 * Byte mode (the text as UTF-8), error correction level M (15 % of the code
 * may be dirty or covered and it still reads), the smallest of the 40
 * versions that holds the text, and the mask with the lowest penalty — the
 * standard's own procedure (ISO/IEC 18004), as Project Nayuki's reference
 * implementation lays it out.
 */

// Per version 1–40 at level M (index 0 unused).
const ECC_PER_BLOCK = [
  -1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28,
  28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
];
const BLOCKS = [
  -1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25,
  26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49,
];
/** Level M's two format bits. */
const LEVEL_M = 0;

const at = (list: readonly number[], index: number): number => list[index] ?? 0;
const bit = (value: number, index: number): boolean => ((value >>> index) & 1) !== 0;

/** Modules a version holds for data and error correction, after the function patterns. */
function rawModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const aligns = Math.floor(version / 7) + 2;
    result -= (25 * aligns - 10) * aligns - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

const dataCodewords = (version: number): number =>
  Math.floor(rawModules(version) / 8) - at(ECC_PER_BLOCK, version) * at(BLOCKS, version);

// #region reed-solomon
function multiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function divisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = multiply(at(result, j), root);
      if (j + 1 < degree) result[j] = at(result, j) ^ at(result, j + 1);
    }
    root = multiply(root, 0x02);
  }
  return result;
}

function remainder(data: readonly number[], by: readonly number[]): number[] {
  const result = new Array<number>(by.length).fill(0);
  for (const byte of data) {
    const factor = byte ^ (result.shift() ?? 0);
    result.push(0);
    by.forEach((coefficient, i) => {
      result[i] = at(result, i) ^ multiply(coefficient, factor);
    });
  }
  return result;
}
// #endregion reed-solomon

/** The data codewords split into blocks, each with its error correction, interleaved. */
function withErrorCorrection(data: readonly number[], version: number): number[] {
  const blocks = at(BLOCKS, version);
  const eccLength = at(ECC_PER_BLOCK, version);
  const raw = Math.floor(rawModules(version) / 8);
  const shortBlocks = blocks - (raw % blocks);
  const shortLength = Math.floor(raw / blocks);
  const generator = divisor(eccLength);
  const parts: number[][] = [];
  for (let i = 0, k = 0; i < blocks; i++) {
    const block = data.slice(k, k + shortLength - eccLength + (i < shortBlocks ? 0 : 1));
    k += block.length;
    const ecc = remainder(block, generator);
    if (i < shortBlocks) block.push(0);
    parts.push([...block, ...ecc]);
  }
  const result: number[] = [];
  for (let i = 0; i < (parts[0]?.length ?? 0); i++) {
    parts.forEach((part, j) => {
      // The padding byte of a short block is not sent.
      if (i !== shortLength - eccLength || j >= shortBlocks) result.push(at(part, i));
    });
  }
  return result;
}

/** The codewords for `bytes` at `version`: mode, length, data, terminator, padding. */
function encodeData(bytes: Uint8Array, version: number): number[] {
  const bits: number[] = [];
  const push = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  push(0b0100, 4);
  push(bytes.length, version < 10 ? 8 : 16);
  for (const byte of bytes) push(byte, 8);
  const capacity = dataCodewords(version) * 8;
  push(0, Math.min(4, capacity - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) push(pad, 8);
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    codewords.push(bits.slice(i, i + 8).reduce((byte, one) => (byte << 1) | one, 0));
  }
  return codewords;
}

/** The smallest version that holds this many bytes at level M; 0 when none does. */
function versionFor(length: number): number {
  for (let version = 1; version <= 40; version++) {
    const header = 4 + (version < 10 ? 8 : 16);
    if (header + length * 8 <= dataCodewords(version) * 8) return version;
  }
  return 0;
}

const MASKS: readonly ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

class Matrix {
  readonly size: number;
  readonly dark: boolean[][];
  private readonly fixed: boolean[][];

  constructor(readonly version: number) {
    this.size = version * 4 + 17;
    this.dark = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false));
    this.fixed = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false));
  }

  private setFixed(x: number, y: number, dark: boolean) {
    const row = this.dark[y];
    const fixedRow = this.fixed[y];
    if (!row || !fixedRow) return;
    row[x] = dark;
    fixedRow[x] = true;
  }

  get(x: number, y: number): boolean {
    return this.dark[y]?.[x] ?? false;
  }

  private alignments(): number[] {
    if (this.version === 1) return [];
    const count = Math.floor(this.version / 7) + 2;
    const step = this.version === 32 ? 26 : Math.ceil((this.version * 4 + 4) / (count * 2 - 2)) * 2;
    const result = [6];
    for (let position = this.size - 7; result.length < count; position -= step) {
      result.splice(1, 0, position);
    }
    return result;
  }

  drawFunctionPatterns() {
    for (let i = 0; i < this.size; i++) {
      this.setFixed(6, i, i % 2 === 0);
      this.setFixed(i, 6, i % 2 === 0);
    }
    for (const [cx, cy] of [
      [3, 3],
      [this.size - 4, 3],
      [3, this.size - 4],
    ] as const) {
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const distance = Math.max(Math.abs(dx), Math.abs(dy));
          const x = cx + dx;
          const y = cy + dy;
          if (x >= 0 && x < this.size && y >= 0 && y < this.size) {
            this.setFixed(x, y, distance !== 2 && distance !== 4);
          }
        }
      }
    }
    const positions = this.alignments();
    const last = positions.length - 1;
    positions.forEach((cx, i) => {
      positions.forEach((cy, j) => {
        // The three corners hold finder patterns.
        if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            this.setFixed(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
          }
        }
      });
    });
    this.drawFormat(0);
    if (this.version >= 7) {
      let rem = this.version;
      for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      const bits = (this.version << 12) | rem;
      for (let i = 0; i < 18; i++) {
        const a = this.size - 11 + (i % 3);
        const b = Math.floor(i / 3);
        this.setFixed(a, b, bit(bits, i));
        this.setFixed(b, a, bit(bits, i));
      }
    }
  }

  drawFormat(mask: number) {
    const data = (LEVEL_M << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i++) this.setFixed(8, i, bit(bits, i));
    this.setFixed(8, 7, bit(bits, 6));
    this.setFixed(8, 8, bit(bits, 7));
    this.setFixed(7, 8, bit(bits, 8));
    for (let i = 9; i < 15; i++) this.setFixed(14 - i, 8, bit(bits, i));
    for (let i = 0; i < 8; i++) this.setFixed(this.size - 1 - i, 8, bit(bits, i));
    for (let i = 8; i < 15; i++) this.setFixed(8, this.size - 15 + i, bit(bits, i));
    this.setFixed(8, this.size - 8, true);
  }

  drawCodewords(codewords: readonly number[]) {
    let i = 0;
    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vertical = 0; vertical < this.size; vertical++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? this.size - 1 - vertical : vertical;
          const row = this.dark[y];
          if (row && !this.fixed[y]?.[x] && i < codewords.length * 8) {
            row[x] = bit(at(codewords, i >>> 3), 7 - (i & 7));
            i++;
          }
        }
      }
    }
  }

  applyMask(mask: number) {
    const test = MASKS[mask];
    if (!test) return;
    for (let y = 0; y < this.size; y++) {
      const row = this.dark[y];
      for (let x = 0; x < this.size; x++) {
        if (row && !this.fixed[y]?.[x] && test(x, y)) row[x] = !row[x];
      }
    }
  }

  /** The standard's four penalty rules: runs, blocks, finder look-alikes, balance. */
  penalty(): number {
    let score = 0;
    const lines: string[] = [];
    for (let y = 0; y < this.size; y++) {
      lines.push(this.dark[y]?.map((dark) => (dark ? '1' : '0')).join('') ?? '');
    }
    for (let x = 0; x < this.size; x++)
      lines.push(
        lines
          .slice(0, this.size)
          .map((row) => row[x])
          .join(''),
      );
    for (const line of lines) {
      for (const run of line.match(/0{5,}|1{5,}/g) ?? []) score += run.length - 2;
      const padded = `0000${line}0000`;
      for (const pattern of ['00001011101', '10111010000']) {
        for (
          let from = padded.indexOf(pattern);
          from !== -1;
          from = padded.indexOf(pattern, from + 1)
        ) {
          score += 40;
        }
      }
    }
    let darkCount = 0;
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const here = this.get(x, y);
        if (here) darkCount++;
        if (
          x + 1 < this.size &&
          y + 1 < this.size &&
          here === this.get(x + 1, y) &&
          here === this.get(x, y + 1) &&
          here === this.get(x + 1, y + 1)
        ) {
          score += 3;
        }
      }
    }
    const total = this.size * this.size;
    score += Math.max(0, Math.ceil(Math.abs(darkCount * 20 - total * 10) / total) - 1) * 10;
    return score;
  }
}

/**
 * The QR code of a text, as rows of modules (`true`: dark), without the quiet
 * zone; null when the text is too long for any version (about 2,300 bytes).
 */
export function qrModules(text: string): boolean[][] | null {
  const bytes = new TextEncoder().encode(text);
  const version = versionFor(bytes.length);
  if (!version) return null;
  const matrix = new Matrix(version);
  matrix.drawFunctionPatterns();
  matrix.drawCodewords(withErrorCorrection(encodeData(bytes, version), version));
  let best = 0;
  let lowest = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    matrix.applyMask(mask);
    matrix.drawFormat(mask);
    const score = matrix.penalty();
    if (score < lowest) {
      lowest = score;
      best = mask;
    }
    matrix.applyMask(mask);
  }
  matrix.applyMask(best);
  matrix.drawFormat(best);
  return matrix.dark;
}

/** The dark modules as one SVG path, one unit per module, offset by `margin`. */
export function qrPath(modules: readonly (readonly boolean[])[], margin = 0): string {
  const parts: string[] = [];
  modules.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) parts.push(`M${String(x + margin)} ${String(y + margin)}h1v1h-1z`);
    });
  });
  return parts.join('');
}
