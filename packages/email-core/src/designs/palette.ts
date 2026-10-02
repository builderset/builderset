import { pad } from '../fields';
import type { EmailRichText } from '../rich-text';
import { block } from '../sample';

/**
 * The site's look, for the ready-made designs: the near-black hero and the
 * orange of blejmauto.com (`--hero` and `--color-brand-500/600` in the tokens,
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
export const bold = (text: string) => ({ text, marks: [{ type: 'bold' as const }] });

/** Show a block or a section only when a variable holds. */
export const when = (variable: string, op: 'exists' | 'missing' | 'gt', value?: string) => ({
  hideOn: 'none' as const,
  when: [{ var: variable, op, ...(value === undefined ? {} : { value }) }],
});

/** The small spaced capitals above a heading. */
export const eyebrow = (text: string, color: string, extra: Record<string, unknown> = {}) =>
  block('text', {
    text: t(text),
    size: 12,
    weight: '600',
    letterSpacing: 2,
    transform: 'uppercase',
    color,
    padding: pad(0, 0, 10, 0),
    ...extra,
  });

/** "blejmauto.com" as type, as the site's header sets it. */
export const wordmark = () =>
  block('text', {
    text: [{ text: 'blejmauto', marks: [{ type: 'bold' }] }, { text: '.com' }],
    font: 'sora',
    size: 22,
    lineHeight: 1.2,
    letterSpacing: -0.5,
    color: PAPER,
    padding: pad(0),
  });
