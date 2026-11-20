import type { BuilderNode, ElementRegistry } from '@builderset/engine';

import { answerKindOf, takesAnswer, type FormDocument } from '../core';

/**
 * Small rules the form editor applies to fields: the key a label suggests,
 * keeping keys unique, the example answer a field shows with "test answers"
 * on, and which field types can stand in for each other.
 */

/** "Kodi i aplikimit" → `kodi_i_aplikimit`: a label as an answer key. */
export function keyFromLabel(label: string): string {
  const key = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
  return /^[a-z]/.test(key) ? key : `field_${key}`.replace(/_+$/, '') || 'field';
}

/** Every key in use, but the given node's. */
export function keysInUse(doc: FormDocument, except?: string): Set<string> {
  return new Set(
    Object.values(doc.nodes)
      .filter((node) => node.id !== except && takesAnswer(node))
      .map((node) => node.props.key as string),
  );
}

/** `base`, or `base_2`, `base_3`… — the first one not taken. */
export function uniqueKey(base: string, used: ReadonlySet<string>): string {
  const root = base.slice(0, 36) || 'field';
  if (!used.has(root)) return root;
  for (let n = 2; ; n += 1) {
    const candidate = `${root}_${String(n)}`;
    if (!used.has(candidate)) return candidate;
  }
}

/**
 * Whether a key still follows its label — so renaming the label may rename
 * the key. Once someone set a key of their own, it is left alone.
 */
export function keyFollowsLabel(key: string, label: string): boolean {
  const base = keyFromLabel(label);
  return key === base || new RegExp(`^${base}_\\d+$`).test(key);
}

/** Field types that hold the same kind of answer, and can be swapped. */
export const SWAPPABLE: readonly (readonly string[])[] = [
  ['text', 'textarea', 'email', 'phone', 'password'],
  ['select', 'radio', 'checkbox'],
  ['number', 'slider'],
];

export function swappableWith(type: string): readonly string[] {
  return SWAPPABLE.find((group) => group.includes(type)) ?? [];
}

/** An example answer for a field, for the canvas's "test answers". */
export function exampleAnswer(node: BuilderNode): unknown {
  const p = node.props;
  const options = Array.isArray(p.options) ? (p.options as string[]) : [];
  switch (node.type) {
    case 'text':
      return 'AA 123 BC';
    case 'textarea':
      return 'Everything works, the brakes were changed last spring.';
    case 'email':
      return 'arben@example.com';
    case 'phone':
      return '69 123 4567';
    case 'number':
      return '2016';
    case 'date':
      return '2026-11-24';
    case 'time':
      return '10:30';
    case 'password':
      return 'secret-password';
    case 'select':
    case 'radio':
      return options[0] ?? '';
    case 'checkbox':
      return options.slice(0, 2);
    case 'yes-no':
      return 'yes';
    case 'rating':
      return 4;
    case 'scale':
      return 9;
    case 'slider':
      return p.defaultValue;
    case 'name':
      return { first: 'Arben', last: 'Hoxha' };
    case 'address':
      return { street: 'Rruga e Durrësit 12', city: 'Tiranë', zip: '1001' };
    case 'consent':
      return true;
    case 'file':
      return [{ name: 'photo.jpg', size: 120_000 }];
    default:
      return answerKindOf(node.type) === 'none' ? undefined : '';
  }
}

/**
 * Turn a field into another of the same kind (a short text into an email),
 * keeping every prop the new type also has — the label, key, help, logic —
 * and the new type's defaults for the rest. Nothing changes if the result
 * would not be a valid field.
 */
export function swapFieldType(
  draft: FormDocument,
  registry: ElementRegistry,
  id: string,
  type: string,
): void {
  const node = draft.nodes[id];
  if (!node || node.type === type || !swappableWith(node.type).includes(type)) return;
  const definition = registry.require(type);
  const defaults = definition.defaults();
  const kept = Object.fromEntries(Object.entries(node.props).filter(([key]) => key in defaults));
  const parsed = definition.schema.safeParse({ ...defaults, ...kept });
  if (!parsed.success) return;
  node.type = type;
  node.v = definition.version;
  node.props = parsed.data;
}
