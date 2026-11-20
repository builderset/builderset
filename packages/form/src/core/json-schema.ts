import { LIMITS, type ElementRegistry } from '@builderset/engine';
import { z } from 'zod';

import { ANSWER_FORMATS } from './answers';
import { ANSWER_KINDS, LOGIC_OPS, PATTERNS } from './fields';
import { formSchema, PERSONAL_FIELD_TYPES } from './validate';

/**
 * The form document as a JSON Schema — the contract a server in another
 * language reads. As with articles and emails, what JSON Schema cannot express
 * is published as data rather than restated there:
 *
 * - `x-elements`: which element may hold which (`container`, `parents`)
 * - `x-limits`: the tree's ceilings (nodes, depth, bytes)
 * - `x-answer-kinds`: what kind of answer each field type takes
 * - `x-logic-ops`, `x-patterns`: the logic operators and the short-answer formats
 * - `x-answer-formats`: the shapes an email, a phone number, a date… must have,
 *   as JavaScript regular expressions (`source` and `flags`)
 * - `x-personal-types`: the field types that call for a consent box
 */
export function toFormJSONSchema(registry: ElementRegistry): Record<string, unknown> {
  const schema = z.toJSONSchema(formSchema(registry), {
    unrepresentable: 'any',
    reused: 'ref',
    target: 'draft-2020-12',
  }) as Record<string, unknown>;
  return {
    ...schema,
    $id: 'https://schemas.builder/form.v1.json',
    title: 'Form document',
    'x-elements': Object.fromEntries(
      registry.all().map((definition) => [
        definition.type,
        {
          ...(definition.container
            ? {
                container: {
                  ...(definition.container.only ? { only: definition.container.only } : {}),
                  ...(definition.container.except ? { except: definition.container.except } : {}),
                  ...(definition.container.min !== undefined
                    ? { min: definition.container.min }
                    : {}),
                  ...(definition.container.max !== undefined
                    ? { max: definition.container.max }
                    : {}),
                },
              }
            : {}),
          ...(definition.parents ? { parents: definition.parents } : {}),
        },
      ]),
    ),
    'x-limits': { nodes: LIMITS.nodes, depth: LIMITS.depth, bytes: LIMITS.bytes },
    'x-answer-kinds': ANSWER_KINDS,
    'x-logic-ops': LOGIC_OPS,
    'x-patterns': PATTERNS,
    'x-answer-formats': Object.fromEntries(
      Object.entries(ANSWER_FORMATS).map(([name, format]) => [
        name,
        { source: format.source, flags: format.flags },
      ]),
    ),
    'x-personal-types': PERSONAL_FIELD_TYPES,
  };
}
