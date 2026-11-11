import type { ElementRegistry } from '@motors/builder-core';
import { z } from 'zod';

/**
 * The JSON Schema of an element's props, walked to build its inspector.
 *
 * Generated from the element's zod schema rather than described twice, so a
 * new prop on an element shows up in the inspector without anyone writing a
 * form for it — and can never be edited into something the schema refuses.
 */

export interface JsonSchema {
  type?: string | string[];
  enum?: unknown[];
  const?: unknown;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  minItems?: number;
  maxItems?: number;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  minLength?: number;
  maxLength?: number;
  default?: unknown;
}

const cache = new WeakMap<ElementRegistry, Map<string, JsonSchema>>();

export function propsSchema(registry: ElementRegistry, type: string): JsonSchema | null {
  let byType = cache.get(registry);
  if (!byType) {
    byType = new Map();
    cache.set(registry, byType);
  }
  const hit = byType.get(type);
  if (hit) return hit;
  const definition = registry.get(type);
  if (!definition) return null;
  const schema = z.toJSONSchema(definition.schema, {
    io: 'input',
    unrepresentable: 'any',
    reused: 'inline',
  }) as JsonSchema;
  byType.set(type, schema);
  return schema;
}

export type FieldKind =
  | { kind: 'richText' }
  | { kind: 'media' }
  | { kind: 'enum'; options: string[] }
  | { kind: 'string'; multiline: boolean; max?: number | undefined }
  | { kind: 'number'; min?: number | undefined; max?: number | undefined; integer: boolean }
  | { kind: 'boolean' }
  | { kind: 'array'; item: JsonSchema; min: number; max: number }
  | { kind: 'object'; properties: Record<string, JsonSchema>; required: string[] }
  | { kind: 'nullable'; inner: JsonSchema }
  | { kind: 'unknown' };

const LONG_TEXT_KEYS = new Set(['code', 'summary', 'bio', 'body', 'description', 'answer']);

function isNull(schema: JsonSchema): boolean {
  return schema.type === 'null';
}

export function classify(schema: JsonSchema, key = ''): FieldKind {
  const union = schema.anyOf ?? schema.oneOf;
  if (union) {
    const rest = union.filter((option) => !isNull(option));
    if (rest.length === 1 && rest[0] && rest.length < union.length) {
      return { kind: 'nullable', inner: rest[0] };
    }
    return { kind: 'unknown' };
  }
  if (schema.enum) return { kind: 'enum', options: schema.enum.map(String) };
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  switch (type) {
    case 'string':
      return {
        kind: 'string',
        multiline: (schema.maxLength ?? 0) > 300 || LONG_TEXT_KEYS.has(key),
        max: schema.maxLength,
      };
    case 'integer':
    case 'number':
      return {
        kind: 'number',
        min: schema.minimum ?? schema.exclusiveMinimum,
        max: schema.maximum,
        integer: type === 'integer',
      };
    case 'boolean':
      return { kind: 'boolean' };
    case 'array': {
      const item = schema.items ?? {};
      if (item.properties?.text && item.properties.marks) return { kind: 'richText' };
      return { kind: 'array', item, min: schema.minItems ?? 0, max: schema.maxItems ?? 50 };
    }
    case 'object':
      if (schema.properties?.key && schema.properties.mime) return { kind: 'media' };
      return {
        kind: 'object',
        properties: schema.properties ?? {},
        required: schema.required ?? [],
      };
    default:
      return { kind: 'unknown' };
  }
}

/** A value that passes `schema`, for a newly added list item. */
export function defaultFor(schema: JsonSchema): unknown {
  if (schema.default !== undefined) return structuredClone(schema.default);
  const field = classify(schema);
  switch (field.kind) {
    case 'richText':
      return [];
    case 'media':
      return null;
    case 'enum':
      return field.options[0];
    case 'string':
      return '';
    case 'number':
      return field.min ?? 0;
    case 'boolean':
      return false;
    case 'array':
      return Array.from({ length: field.min }, () => defaultFor(field.item));
    case 'object': {
      const value: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(field.properties)) {
        if (field.required.includes(key)) value[key] = defaultFor(child);
      }
      return value;
    }
    case 'nullable':
      return null;
    default:
      return null;
  }
}

/** Props the inspector never shows: bookkeeping the editor manages itself. */
export const HIDDEN_PROPS = new Set(['pendingUrl']);
