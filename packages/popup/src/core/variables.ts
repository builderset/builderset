/**
 * Variables: what a popup fills in on the page it shows on — the visitor's
 * first name, the page's title, when the offer ends. A variable is a dotted
 * path in double braces, `{{visitor.first_name}}`; there is no expression
 * language and no formatting.
 *
 * Which paths exist is the host's: it passes them to the editor (`fields`),
 * to the check (`variables`) and their values to `PopupView` (`data`).
 */

/** `{{ path }}`, spaces optional. */
export const VARIABLE_TOKEN = /\{\{\s*([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*){0,4})\s*\}\}/g;

/** A variable the editor offers: its path, how it is called, and a value to preview with. */
export interface PopupField {
  path: string;
  label?: string | undefined;
  /** What the editor's example data shows for it. */
  example?: string | undefined;
}

/** The variables a popup has when the host names none. */
export const POPUP_FIELDS: readonly PopupField[] = [
  { path: 'visitor.first_name', label: 'Visitor’s first name', example: 'Ana' },
  { path: 'page.title', label: 'Page title', example: 'Sell your car' },
  { path: 'offer.ends', label: 'Offer ends', example: '30 November' },
];

/** Every variable path in a string, in order. */
export function variablesIn(value: string): string[] {
  return [...value.matchAll(VARIABLE_TOKEN)].map((match) => match[1] ?? '');
}

/** A value at a dotted path, as text: a string or a number; anything else is nothing. */
export function lookup(data: unknown, path: string): string {
  let here: unknown = data;
  for (const key of path.split('.')) {
    if (here === null || typeof here !== 'object' || !Object.hasOwn(here, key)) return '';
    here = (here as Record<string, unknown>)[key];
  }
  if (typeof here === 'string') return here;
  if (typeof here === 'number' && Number.isFinite(here)) return String(here);
  return '';
}

/**
 * The variables in a string filled from `data`. One it has no value for is
 * left out — a visitor never reads `{{visitor.first_name}}` — so a template
 * reads well without it ("Hello, {{visitor.first_name}}!" → "Hello, !" is
 * the designer's to word around; the example data shows how it reads).
 */
export function fillVariables(value: string, data: unknown): string {
  return value.replace(VARIABLE_TOKEN, (_, path: string) => lookup(data, path));
}

/** Example data in the shape `PopupView`'s `data` takes, from the fields' examples. */
export function exampleData(fields: readonly PopupField[] = POPUP_FIELDS): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const field of fields) {
    const keys = field.path.split('.');
    let here = data;
    keys.forEach((key, index) => {
      if (index === keys.length - 1) {
        here[key] = field.example ?? '';
        return;
      }
      const next = here[key];
      const branch =
        next !== null && typeof next === 'object' ? (next as Record<string, unknown>) : {};
      here[key] = branch;
      here = branch;
    });
  }
  return data;
}
