import {
  FONT_STACKS,
  lookup,
  TEMPLATE_TOKEN,
  type EmailDocument,
  type EmailRichText,
  type FontStack,
  type VariableFormat,
} from '@motors/email-core';

/**
 * What rendering needs besides the document: the brand kit its `brand.*`
 * tokens resolve to, the data its variables are filled with, where media keys
 * live, and the reader's language (for dates and money).
 */

export interface BrandKit {
  name: string;
  website: string;
  address: string;
  logo?: { key: string; width?: number; height?: number } | null | undefined;
  logoDark?: { key: string; width?: number; height?: number } | null | undefined;
  colors: Record<string, string>;
  font?: string | undefined;
  social?: { network: string; href: string }[] | undefined;
}

export const DEFAULT_BRAND: BrandKit = {
  name: 'Your company',
  website: 'https://example.com',
  address: 'Street 1, City',
  logo: null,
  logoDark: null,
  colors: {
    primary: '#111827',
    secondary: '#374151',
    accent: '#2563eb',
    text: '#1f2937',
    muted: '#6b7280',
    background: '#f4f4f5',
    surface: '#ffffff',
    border: '#e5e7eb',
  },
  font: 'system',
  social: [],
};

export interface RenderOptions {
  brand?: BrandKit | undefined;
  /** The values variables are filled with. */
  data?: Record<string, unknown> | undefined;
  /** Storage key → absolute URL. */
  assetUrl: (key: string) => string;
  locale?: string | undefined;
  /**
   * `send`: variables are replaced by their values. `preview-raw`: they stay
   * visible as `{{ name }}` chips, for designing without sample data.
   */
  mode?: 'send' | 'preview-raw' | undefined;
  /** A network → icon URL, for the social block. Without it, text links. */
  socialIcon?: ((network: string, style: string) => string | null) | undefined;
  /** For the currency format. */
  currency?: string | undefined;
}

export interface RenderContext {
  doc: EmailDocument;
  brand: BrandKit;
  data: Record<string, unknown>;
  assetUrl: (key: string) => string;
  locale: string;
  mode: 'send' | 'preview-raw';
  socialIcon: RenderOptions['socialIcon'];
  currency: string;
  /** Variables used with no value and no fallback — reported as warnings. */
  missing: Set<string>;
}

export function createContext(doc: EmailDocument, options: RenderOptions): RenderContext {
  const brand = options.brand ?? DEFAULT_BRAND;
  const now = new Date();
  return {
    doc,
    brand,
    data: {
      now: now.toISOString(),
      current_year: now.getFullYear(),
      brand: { name: brand.name, website: brand.website, address: brand.address },
      ...options.data,
    },
    assetUrl: options.assetUrl,
    locale: options.locale ?? 'en',
    mode: options.mode ?? 'send',
    socialIcon: options.socialIcon,
    currency: options.currency ?? 'EUR',
    missing: new Set(),
  };
}

/** A colour value — hex or `brand.primary` — as hex. */
export function color(
  value: string | null | undefined,
  context: RenderContext,
): string | undefined {
  if (!value) return undefined;
  if (value.startsWith('brand.')) {
    const key = value.slice('brand.'.length);
    return context.brand.colors[key] ?? DEFAULT_BRAND.colors[key] ?? '#111827';
  }
  return value;
}

/** Weight, spacing and case — the typography a modern layout leans on. */
export function typography(props: Record<string, unknown>): {
  fontWeight?: string | undefined;
  letterSpacing?: string | undefined;
  textTransform?: string | undefined;
} {
  const spacing = props.letterSpacing;
  const transform = props.transform;
  return {
    fontWeight: typeof props.weight === 'string' ? props.weight : undefined,
    letterSpacing:
      typeof spacing === 'number' && spacing !== 0 ? `${String(spacing)}px` : undefined,
    textTransform: typeof transform === 'string' && transform !== 'none' ? transform : undefined,
  };
}

/** Every font the document uses — the email's and each block's own. */
export function fontsInUse(doc: EmailDocument): string[] {
  const keys = new Set<string>([doc.settings.font]);
  // Fonts set on parts of a text, anywhere in a block's props.
  const scan = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) scan(item);
    } else if (value && typeof value === 'object') {
      const mark = value as { type?: unknown; family?: unknown };
      if (mark.type === 'font' && typeof mark.family === 'string') keys.add(mark.family);
      for (const item of Object.values(value)) scan(item);
    }
  };
  for (const node of Object.values(doc.nodes)) {
    if (typeof node.props.font === 'string') keys.add(node.props.font);
    scan(node.props);
  }
  return [...keys];
}

export function fontStack(font: string | null | undefined, context: RenderContext): string {
  const key = (font ?? context.doc.settings.font) as FontStack;
  return (FONT_STACKS as Partial<Record<string, string>>)[key] ?? FONT_STACKS.system;
}

// ── values ───────────────────────────────────────────────────────────────────

/** A primitive as text; objects and arrays are not values a reader can read. */
export function str(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  return '';
}

function formatValue(
  value: unknown,
  format: VariableFormat | undefined,
  context: RenderContext,
): string {
  if (value === null || value === undefined) return '';
  const locale = context.locale === 'sq' ? 'sq-AL' : context.locale === 'de' ? 'de-DE' : 'en-GB';
  try {
    switch (format) {
      case 'date':
      case 'date_long':
      case 'time':
      case 'datetime': {
        const date = new Date(str(value));
        if (Number.isNaN(date.getTime())) return str(value);
        const options: Intl.DateTimeFormatOptions =
          format === 'date'
            ? { dateStyle: 'medium' }
            : format === 'date_long'
              ? { dateStyle: 'full' }
              : format === 'time'
                ? { timeStyle: 'short' }
                : { dateStyle: 'medium', timeStyle: 'short' };
        return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'Europe/Tirane' }).format(
          date,
        );
      }
      case 'money':
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: context.currency,
          maximumFractionDigits: 0,
        }).format(Number(value));
      case 'number':
        return new Intl.NumberFormat(locale).format(Number(value));
      case 'upper':
        return str(value).toUpperCase();
      case 'lower':
        return str(value).toLowerCase();
      case 'capitalize': {
        const text = str(value);
        return text.charAt(0).toUpperCase() + text.slice(1);
      }
      default:
        return str(value);
    }
  } catch {
    return str(value);
  }
}

/** One variable's text, or its fallback, or — in raw preview — its name. */
export function variableText(
  path: string,
  format: VariableFormat | undefined,
  fallback: string | undefined,
  context: RenderContext,
  scope: Record<string, unknown> = {},
): string {
  if (context.mode === 'preview-raw') return `{{${path}}}`;
  const value = lookup({ ...context.data, ...scope }, path);
  const text = formatValue(value, format, context);
  if (text) return text;
  if (fallback) return fallback;
  context.missing.add(path);
  return '';
}

const TOKENS = new RegExp(TEMPLATE_TOKEN.source, 'g');

/** A template string with every `{{ … }}` filled in. NOT escaped — callers escape. */
export function fill(
  template: string,
  context: RenderContext,
  scope: Record<string, unknown> = {},
): string {
  return template.replace(TOKENS, (_, path: string, format: string | undefined) =>
    variableText(path, format as VariableFormat | undefined, undefined, context, scope),
  );
}

export function plain(value: EmailRichText | undefined | null): string {
  return (value ?? []).map((run) => run.text).join('');
}

// ── conditions ───────────────────────────────────────────────────────────────

export interface Condition {
  var: string;
  op: 'exists' | 'missing' | 'eq' | 'neq' | 'gt' | 'lt' | 'contains';
  value?: string | undefined;
}

export function holds(
  conditions: readonly Condition[],
  context: RenderContext,
  scope: Record<string, unknown> = {},
): boolean {
  if (context.mode === 'preview-raw') return true;
  return conditions.every((condition) => {
    const value = lookup({ ...context.data, ...scope }, condition.var);
    const text = str(value);
    switch (condition.op) {
      case 'exists':
        return text !== '' && value !== false;
      case 'missing':
        return text === '' || value === false;
      case 'eq':
        return text === (condition.value ?? '');
      case 'neq':
        return text !== (condition.value ?? '');
      case 'gt':
        return Number(value) > Number(condition.value);
      case 'lt':
        return Number(value) < Number(condition.value);
      case 'contains':
        return text.toLowerCase().includes((condition.value ?? '').toLowerCase());
    }
  });
}

export function listOf(
  path: string,
  context: RenderContext,
  scope: Record<string, unknown> = {},
): unknown[] {
  const value = lookup({ ...context.data, ...scope }, path);
  return Array.isArray(value) ? value : [];
}
