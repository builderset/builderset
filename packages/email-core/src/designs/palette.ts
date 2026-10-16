import { pad } from '../fields';
import type { EmailRichText } from '../rich-text';
import { block, mapWords, tr, type Tr, type Words } from '../sample';

/**
 * The site's look, for the ready-made designs: the near-black hero and the
 * orange of marrimauto.com (`--hero` and `--color-brand-500/600` in the tokens,
 * as hex — email has no `oklch`), Sora for display type and Poppins to read.
 */

export const INK = '#0b1018';
export const ORANGE = '#da6c1e';
export const ORANGE_DEEP = '#ba5702';
export const ORANGE_SOFT = '#fff4ec';
export const TEXT = '#1b1e22';
export const MUTED = '#626569';
export const LINE = '#e6e8eb';
export const PAPER = '#ffffff';
export const MIST = '#f6f7f9';
/** Body text on the dark hero. */
export const ON_INK = '#c6ccd4';

export const t = (text: string): EmailRichText => [{ text }];

/** `t` in every language a value has. */
export const tt = (text: Words): Words<EmailRichText> => mapWords(text, t);

export type Lang = 'sq' | 'en' | 'de';

/** A value built once per language: `inEvery((l) => [{ text: say(l, 'Po', 'Yes', 'Ja') }])`. */
export const inEvery = <T>(build: (lang: Lang) => T): Tr<T> =>
  tr(build('sq'), build('en'), build('de'));

/** The words for `lang`, inside an `inEvery`. */
export const say = (lang: Lang, sq: string, en: string, de: string): string =>
  lang === 'sq' ? sq : lang === 'en' ? en : de;
export const bold = (text: string) => ({ text, marks: [{ type: 'bold' as const }] });

/** Show a block or a section only when a variable holds. */
export const when = (variable: string, op: 'exists' | 'missing' | 'eq' | 'gt', value?: string) => ({
  hideOn: 'none' as const,
  when: [{ var: variable, op, ...(value === undefined ? {} : { value }) }],
});

/** The small spaced capitals above a heading. */
export const eyebrow = (text: Words, color: string, extra: Record<string, unknown> = {}) =>
  block('text', {
    text: tt(text),
    size: 12,
    weight: '600',
    letterSpacing: 2,
    transform: 'uppercase',
    color,
    padding: pad(0, 0, 10, 0),
    ...extra,
  });

/** "marrimauto.com" as type, as the site's header sets it. */
export const wordmark = () =>
  block('text', {
    text: [{ text: 'marrimauto', marks: [{ type: 'bold' }] }, { text: '.com' }],
    font: 'sora',
    size: 22,
    lineHeight: 1.2,
    letterSpacing: -0.5,
    color: PAPER,
    padding: pad(0),
  });
