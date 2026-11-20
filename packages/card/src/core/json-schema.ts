import { LIMITS, type ElementRegistry } from '@builderset/engine';
import { z } from 'zod';

import { CARD_FIELDS, VARIABLE_TOKEN } from './data';
import { SAFE_TYPES, TEXT_TYPES } from './elements';
import { VARIABLE_PROPS } from './fill';
import { CARD_FORMATS } from './formats';
import { CARD_RULES } from './rules';
import { cardSchema } from './validate';

/**
 * The card document as a JSON Schema — the contract a server in another
 * language reads. What JSON Schema cannot express is published as data
 * rather than restated there:
 *
 * - `x-elements`: which element may hold which (`container`, `parents`)
 * - `x-limits`: the tree's ceilings (nodes, depth, bytes)
 * - `x-formats`: each format's size, corners and whether it is printed
 * - `x-fields`: the member fields a card may use when the host names none
 * - `x-rules`: the checks' numbers and lists — the smallest type, the
 *   smallest QR code, which elements are words and which keep to the safe
 *   area, the variable syntax (a JavaScript regular expression), the schemes
 *   a QR code may and may not carry, and which prop of which element may
 *   hold a variable
 */
export function toCardJSONSchema(registry: ElementRegistry): Record<string, unknown> {
  const schema = z.toJSONSchema(cardSchema(registry), {
    unrepresentable: 'any',
    reused: 'ref',
    target: 'draft-2020-12',
  }) as Record<string, unknown>;
  return {
    ...schema,
    $id: 'https://schemas.builder/card.v1.json',
    title: 'Card document',
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
    'x-formats': Object.fromEntries(
      CARD_FORMATS.map((format) => [
        format.id,
        { width: format.width, height: format.height, radius: format.radius, print: format.print },
      ]),
    ),
    'x-fields': CARD_FIELDS.map(({ path, kind }) => ({ path, kind })),
    'x-rules': {
      ...CARD_RULES,
      textTypes: TEXT_TYPES,
      safeTypes: SAFE_TYPES,
      variable: VARIABLE_TOKEN.source,
      variableProps: VARIABLE_PROPS,
    },
  };
}
