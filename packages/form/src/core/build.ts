import { createId, type BuilderNode, type ElementRegistry } from '@builderset/engine';

import {
  createFormDocument,
  defaultSettings,
  type FormDocument,
  type FormMeta,
  type FormSettings,
} from './document';

/**
 * Building forms from a short outline — for templates, tests and a project's
 * own ready-made forms, which would otherwise be pages of node bookkeeping:
 *
 *   buildForm(registry, { meta: { title: 'Contact us' } }, [
 *     step('Contact', [
 *       field('name', { label: 'Your name', required: true }),
 *       field('email', { width: 'half' }),
 *     ]),
 *   ])
 *
 * Every field's props are checked against its schema, so a mistake in an
 * outline fails loudly where it is written.
 */

export interface FieldSpec {
  type: string;
  props?: Record<string, unknown>;
}

export interface StepSpec {
  title: string;
  fields: FieldSpec[];
}

export const field = (type: string, props: Record<string, unknown> = {}): FieldSpec => ({
  type,
  props,
});

export const step = (title: string, fields: FieldSpec[]): StepSpec => ({ title, fields });

/** Settings with some groups changed: `{ style: { accent: '#e06a1b' } }` keeps the rest of `style`. */
export type SettingsPatch = { [K in keyof FormSettings]?: Partial<FormSettings[K]> };

/** The default settings with a patch merged in, group by group. */
export function settingsWith(patch: SettingsPatch = {}): FormSettings {
  const base = defaultSettings();
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const current = (base as Record<string, unknown>)[key];
    merged[key] =
      current &&
      typeof current === 'object' &&
      !Array.isArray(current) &&
      value &&
      typeof value === 'object'
        ? { ...current, ...value }
        : value;
  }
  return merged as FormSettings;
}

export function buildForm(
  registry: ElementRegistry,
  options: { meta?: Partial<FormMeta>; settings?: SettingsPatch; stable?: boolean },
  steps: StepSpec[],
): FormDocument {
  const doc = createFormDocument(options.meta);
  doc.settings = settingsWith(options.settings);
  let next = 0;
  const id = () => {
    if (!options.stable) return createId();
    next += 1;
    return `n${String(next)}`;
  };
  const make = (type: string, raw: Record<string, unknown>, children?: string[]): string => {
    const definition = registry.require(type);
    const parsed = definition.schema.safeParse({ ...definition.defaults(), ...raw });
    if (!parsed.success) throw new Error(`Invalid props for "${type}": ${parsed.error.message}`);
    const nodeId = id();
    const node: BuilderNode = { id: nodeId, type, v: definition.version, props: parsed.data };
    if (definition.container) node.children = children ?? [];
    doc.nodes[nodeId] = node;
    return nodeId;
  };

  // The starting document's empty step makes way for the outline's.
  for (const old of doc.nodes[doc.root]?.children ?? []) Reflect.deleteProperty(doc.nodes, old);
  const root = doc.nodes[doc.root];
  if (!root) throw new Error('No root');
  root.children = steps.map((spec) =>
    make(
      'step',
      { title: spec.title },
      spec.fields.map((fieldSpec) => make(fieldSpec.type, fieldSpec.props ?? {})),
    ),
  );
  return doc;
}
