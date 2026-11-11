import { z } from 'zod';

import { mediaRefSchema } from './media';

/**
 * The style every node may carry, as TOKENS — never as raw CSS.
 *
 * A writer picks "large" spacing, the "muted" surface, the "strong" border;
 * the host's theme decides what those are. So a document written for one site
 * looks right in another, the dark theme still works, and nobody can type a
 * colour that breaks contrast or a font size outside the type scale. The
 * inspector only offers these values; the server only accepts them.
 *
 * ── Per breakpoint, inheriting downwards ─────────────────────────────────────
 * `desktop` is the base. `tablet` overrides it, `mobile` overrides tablet. A
 * value absent at a smaller breakpoint is inherited from the larger one, so a
 * writer sets the common case once and only the exceptions below it.
 */

export const BREAKPOINTS = ['desktop', 'tablet', 'mobile'] as const;
export type Breakpoint = (typeof BREAKPOINTS)[number];

export const SPACE = ['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const;
export type Space = (typeof SPACE)[number];

export const SURFACES = ['none', 'muted', 'card', 'inverted', 'primary'] as const;
export type Surface = (typeof SURFACES)[number];

export const styleValuesSchema = z
  .object({
    marginTop: z.enum(SPACE),
    marginBottom: z.enum(SPACE),
    paddingX: z.enum(SPACE),
    paddingY: z.enum(SPACE),
    /** How wide the node may grow: the reading measure, wider, or the full row. */
    width: z.enum(['auto', 'prose', 'wide', 'full']),
    /** Where a narrower-than-its-row node sits. */
    align: z.enum(['start', 'center', 'end']),
    textAlign: z.enum(['start', 'center', 'end', 'justify']),
    textColor: z.enum(['default', 'muted', 'primary', 'inverted']),
    fontSize: z.enum(['sm', 'base', 'lg', 'xl']),
    background: z.enum(SURFACES),
    backgroundImage: z
      .object({
        media: mediaRefSchema,
        /** Darkening over the image, in percent, so text on it stays legible. */
        overlay: z.number().int().min(0).max(90),
      })
      .nullable(),
    borderWidth: z.enum(['none', 'thin', 'thick']),
    borderColor: z.enum(['default', 'strong', 'primary']),
    radius: z.enum(['none', 'sm', 'md', 'lg', 'full']),
    shadow: z.enum(['none', 'sm', 'md', 'lg']),
    /** Hidden at this breakpoint (and below, unless overridden). */
    hidden: z.boolean(),
  })
  .partial();

export type StyleValues = z.infer<typeof styleValuesSchema>;

export const nodeStyleSchema = z
  .object({
    desktop: styleValuesSchema,
    tablet: styleValuesSchema,
    mobile: styleValuesSchema,
  })
  .partial();

export type NodeStyle = z.infer<typeof nodeStyleSchema>;

/** The effective values at a breakpoint, after inheritance. */
export function resolveStyle(style: NodeStyle | undefined, breakpoint: Breakpoint): StyleValues {
  if (!style) return {};
  const order = BREAKPOINTS.slice(0, BREAKPOINTS.indexOf(breakpoint) + 1);
  return Object.assign({}, ...order.map((bp) => style[bp] ?? {})) as StyleValues;
}

/** Whether a node is hidden at a breakpoint. */
export function isHiddenAt(style: NodeStyle | undefined, breakpoint: Breakpoint): boolean {
  return resolveStyle(style, breakpoint).hidden === true;
}

/**
 * Set (or clear, with `undefined`) one style value at one breakpoint, dropping
 * empty objects so an untouched node carries no `style` at all.
 */
export function setStyleValue<K extends keyof StyleValues>(
  style: NodeStyle | undefined,
  breakpoint: Breakpoint,
  key: K,
  value: StyleValues[K] | undefined,
): NodeStyle | undefined {
  const values: StyleValues = { ...style?.[breakpoint] };
  if (value === undefined) Reflect.deleteProperty(values, key);
  else values[key] = value;
  const next: NodeStyle = { ...style };
  if (Object.keys(values).length === 0) Reflect.deleteProperty(next, breakpoint);
  else next[breakpoint] = values;
  return Object.keys(next).length === 0 ? undefined : next;
}
