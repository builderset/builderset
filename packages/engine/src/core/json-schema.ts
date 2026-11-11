import { z } from 'zod';

import type { ElementRegistry } from './registry';

/**
 * Turning a kit's document schema into a JSON Schema — the contract other
 * languages read. Each kit writes its own file (`articleJSONSchema`); these
 * are the parts they share.
 */

/** A zod schema as JSON Schema draft 2020-12, with repeated parts written once as `$defs`. */
export function toDraft2020(schema: z.ZodType): Record<string, unknown> {
  return z.toJSONSchema(schema, {
    unrepresentable: 'any',
    // Rich text, media and the style model repeat in dozens of elements; as
    // `$defs` they are written once instead of being inlined each time.
    reused: 'ref',
    target: 'draft-2020-12',
  });
}

/**
 * What JSON Schema cannot say about placement, as data the server reads
 * rather than copies: which children each container takes, how many, and
 * which parents an element needs. Written as `x-elements`.
 */
export function elementRules(registry: ElementRegistry): Record<string, unknown> {
  return Object.fromEntries(
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
  );
}
