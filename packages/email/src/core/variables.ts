import { z } from 'zod';

/**
 * Variables: the data an email is filled with at send time.
 *
 * Each EMAIL TYPE (the event that sends it — "password reset", "newsletter")
 * declares its variables; a template for that type may use those and the
 * system ones, nothing else. There is no expression language: a variable is a
 * dotted path, optionally with a format from a closed list.
 *
 *   {{ recipient.name }}
 *   {{ appointment.date | date }}
 *   {{ order.total | money }}
 */

export const VARIABLE_PATH = /^[a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*){0,4}$/;

// #region formats
export const FORMATS = [
  'date',
  'date_long',
  'time',
  'datetime',
  'money',
  'number',
  'upper',
  'lower',
  'capitalize',
] as const;
// #endregion formats
export type VariableFormat = (typeof FORMATS)[number];

/** `{{ path }}` or `{{ path | format }}`, spaces optional. */
export const TEMPLATE_TOKEN = /\{\{\s*([a-z_][a-z0-9_.]*)\s*(?:\|\s*([a-z_]+)\s*)?\}\}/;
const TEMPLATE_TOKENS = new RegExp(TEMPLATE_TOKEN.source, 'g');

export interface VariableUse {
  path: string;
  format?: VariableFormat | undefined;
}

export function isTemplateString(value: string): boolean {
  return TEMPLATE_TOKEN.test(value);
}

/** Every `{{ … }}` in a string, in order. Unknown formats are reported as-is. */
export function tokensIn(value: string): { path: string; format: string | undefined }[] {
  return [...value.matchAll(TEMPLATE_TOKENS)].map((match) => ({
    path: match[1] ?? '',
    format: match[2],
  }));
}

export const VARIABLE_TYPES = [
  'string',
  'url',
  'email',
  'date',
  'datetime',
  'money',
  'number',
  'boolean',
  'list',
] as const;
export type VariableType = (typeof VARIABLE_TYPES)[number];

export const variableSpecSchema: z.ZodType<VariableSpec> = z.lazy(() =>
  z.object({
    name: z.string().regex(/^[a-z_][a-z0-9_]*$/),
    label: z.record(z.string(), z.string()),
    type: z.enum(VARIABLE_TYPES),
    required: z.boolean().optional(),
    example: z.unknown().optional(),
    /** For a list: the fields of each item. */
    fields: z.array(variableSpecSchema).optional(),
    /** For an object: nested variables (`reset.url`, `reset.expires_at`). */
    children: z.array(variableSpecSchema).optional(),
  }),
);

// #region types
export interface VariableSpec {
  name: string;
  label: Record<string, string>;
  type: VariableType;
  required?: boolean | undefined;
  example?: unknown;
  fields?: VariableSpec[] | undefined;
  children?: VariableSpec[] | undefined;
}

/** What a host declares for each kind of email it sends. */
export interface EmailType {
  key: string;
  label: Record<string, string>;
  description?: Record<string, string> | undefined;
  category: string;
  kind: 'transactional' | 'marketing';
  variables: VariableSpec[];
  /** Paths a template for this type must use somewhere (the reset link). */
  mustUse?: string[] | undefined;
  /** Realistic data for the preview, by name. */
  samples: Record<string, Record<string, unknown>>;
}

/** Variables every template may use, whatever its type. */
export const SYSTEM_VARIABLES: VariableSpec[] = [
  {
    name: 'recipient',
    label: { en: 'Recipient', sq: 'Marrësi', de: 'Empfänger' },
    type: 'string',
    children: [
      { name: 'name', label: { en: 'Name', sq: 'Emri', de: 'Name' }, type: 'string' },
      { name: 'email', label: { en: 'Email', sq: 'Email', de: 'E-Mail' }, type: 'email' },
    ],
  },
  {
    name: 'brand',
    label: { en: 'Brand', sq: 'Marka', de: 'Marke' },
    type: 'string',
    children: [
      { name: 'name', label: { en: 'Company', sq: 'Kompania', de: 'Firma' }, type: 'string' },
      { name: 'website', label: { en: 'Website', sq: 'Faqja', de: 'Website' }, type: 'url' },
      { name: 'address', label: { en: 'Address', sq: 'Adresa', de: 'Adresse' }, type: 'string' },
    ],
  },
  {
    name: 'links',
    label: { en: 'System links', sq: 'Lidhjet e sistemit', de: 'Systemlinks' },
    type: 'string',
    children: [
      {
        name: 'unsubscribe',
        label: { en: 'Unsubscribe', sq: 'Çregjistrohu', de: 'Abmelden' },
        type: 'url',
      },
      {
        name: 'preferences',
        label: { en: 'Preferences', sq: 'Preferencat', de: 'Einstellungen' },
        type: 'url',
      },
      {
        name: 'view_in_browser',
        label: { en: 'View in browser', sq: 'Shiko në shfletues', de: 'Im Browser ansehen' },
        type: 'url',
      },
    ],
  },
  {
    name: 'current_year',
    label: { en: 'Current year', sq: 'Viti aktual', de: 'Aktuelles Jahr' },
    type: 'number',
  },
];
// #endregion types

export interface FlatVariable {
  path: string;
  type: VariableType;
  label: Record<string, string>;
  required: boolean;
  example?: unknown;
  /** Set on a list's item fields: the list they belong to. */
  itemOf?: string | undefined;
}

/** Every usable path, flattened: `reset.url`, `order.items`, `item.price`. */
export function flattenVariables(specs: readonly VariableSpec[], prefix = ''): FlatVariable[] {
  const out: FlatVariable[] = [];
  for (const spec of specs) {
    const path = prefix ? `${prefix}.${spec.name}` : spec.name;
    if (spec.children?.length) {
      out.push(...flattenVariables(spec.children, path));
      continue;
    }
    out.push({
      path,
      type: spec.type,
      label: spec.label,
      required: spec.required === true,
      ...(spec.example !== undefined ? { example: spec.example } : {}),
    });
    if (spec.type === 'list' && spec.fields) {
      for (const field of flattenVariables(spec.fields, 'item')) {
        out.push({ ...field, itemOf: path });
      }
    }
  }
  return out;
}

export function variablesOf(type: EmailType | null | undefined): FlatVariable[] {
  return flattenVariables([...SYSTEM_VARIABLES, ...(type?.variables ?? [])]);
}

/** A value at a dotted path in the data. */
export function lookup(data: unknown, path: string): unknown {
  let current: unknown = data;
  for (const part of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
