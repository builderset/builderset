/**
 * Code 128 (ISO/IEC 15417): the barcode most card readers and handheld
 * scanners take, encoding any printable ASCII character. Text goes in code
 * set B; a run of four or more digits switches to set C, which packs two
 * digits into one symbol, so a member number stays short.
 */

/** Each symbol's bar and space widths, in modules, bar first; 103–105 are the starts, 106 the stop. */
// prettier-ignore
export const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
] as const;

const START_B = 104;
const START_C = 105;
const TO_B = 100;
const TO_C = 99;
const STOP = 106;

const isDigit = (char: string | undefined) => char !== undefined && char >= '0' && char <= '9';

/** The symbol values for some text, the start, check and stop included; null for no text or a character it cannot encode. */
export function code128Values(text: string): number[] | null {
  const chars = Array.from(text);
  if (!chars.length || chars.some((char) => char.length !== 1 || char < ' ' || char > '~'))
    return null;
  const values: number[] = [];
  // An object, not a `let`: the code set changes inside `use`, which TypeScript does not follow.
  const current: { set: 'B' | 'C' | null } = { set: null };
  const use = (next: 'B' | 'C') => {
    if (current.set === next) return;
    values.push(
      current.set === null ? (next === 'B' ? START_B : START_C) : next === 'B' ? TO_B : TO_C,
    );
    current.set = next;
  };
  let i = 0;
  while (i < chars.length) {
    let run = 0;
    while (isDigit(chars[i + run])) run++;
    if (run >= 4 || (run >= 2 && (current.set === 'C' || run === chars.length))) {
      // An odd run starts with one digit in set B, so the rest pairs up; already
      // in set C, the pairs go first and the odd digit after, in set B.
      if (run % 2 === 1 && current.set !== 'C') {
        use('B');
        values.push((chars[i]?.charCodeAt(0) ?? 32) - 32);
        i++;
        run--;
      }
      use('C');
      for (let end = i + run - (run % 2); i < end; i += 2)
        values.push(Number(`${chars[i] ?? '0'}${chars[i + 1] ?? '0'}`));
    } else {
      use('B');
      values.push((chars[i]?.charCodeAt(0) ?? 32) - 32);
      i++;
    }
  }
  if (current.set === null) use('B');
  const check = values.reduce((sum, value, index) => sum + value * Math.max(1, index), 0) % 103;
  return [...values, check, STOP];
}

/**
 * The barcode for some text as bar and space widths in modules, bar first,
 * without the quiet zone (leave ten modules of background on each side).
 * Null if the text holds a character Code 128 cannot encode (an accent, a
 * line break).
 */
export function encodeCode128(text: string): { widths: number[]; modules: number } | null {
  const values = code128Values(text);
  if (!values) return null;
  const widths = values.flatMap((value) => Array.from(CODE128_PATTERNS[value] ?? '', Number));
  return { widths, modules: widths.reduce((sum, width) => sum + width, 0) };
}
