/**
 * The public theme: sixteen CSS variables, `--builderset-<name>`, each with a
 * light and a dark default in the stylesheet. Set them in CSS, or pass them
 * to an editor as `tokens`; nothing has to be set.
 */

/** The public variables, without their `--builderset-` prefix. */
export const TOKEN_NAMES = [
  'background',
  'surface',
  'foreground',
  'muted',
  'muted-foreground',
  'border',
  'primary',
  'primary-foreground',
  'danger',
  'success',
  'warning',
  'ring',
  'radius',
  'font',
  'font-mono',
  'prose-width',
] as const;

export type TokenName = (typeof TOKEN_NAMES)[number];

/** Theme values from JavaScript: `{ primary: '#da6c1e', radius: '0.5rem' }`. */
export type ThemeTokens = Partial<Record<TokenName, string>>;

/**
 * `'light'` and `'dark'` pin the scheme. `'auto'` follows an ancestor marked
 * `dark` or `light` (a class, or `data-theme`), and otherwise the operating
 * system.
 */
export type ThemeMode = 'light' | 'dark' | 'auto';

const KNOWN = new Set<string>(TOKEN_NAMES);

/**
 * `{ primary: '#da6c1e' }` → `{ '--builderset-primary': '#da6c1e' }`, for an
 * element's `style`. A name that is not a public variable, and an empty value,
 * are left out.
 */
export function themeVariables(tokens: ThemeTokens | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!tokens) return out;
  for (const [name, value] of Object.entries(tokens)) {
    if (KNOWN.has(name) && typeof value === 'string' && value.trim())
      out[`--builderset-${name}`] = value;
  }
  return out;
}
