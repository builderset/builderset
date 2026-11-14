import type { ElementRegistry } from '@builderset/engine';
import { z } from 'zod';

import { ROW_LAYOUTS } from './blocks/structure';
import { EMAIL_LIMITS } from './limits';
import { emailSchema } from './validate';
import { FORMATS, TEMPLATE_TOKEN, VARIABLE_PATH } from './variables';

/**
 * The email document as a JSON Schema — the contract the API reads. As with
 * articles, the structural rules JSON Schema cannot express are published as
 * data (`x-elements`) for the server's own checks.
 */
export function toEmailJSONSchema(registry: ElementRegistry): Record<string, unknown> {
  const schema = z.toJSONSchema(emailSchema(registry), {
    unrepresentable: 'any',
    reused: 'ref',
    target: 'draft-2020-12',
  }) as Record<string, unknown>;
  return {
    ...schema,
    $id: 'https://schemas.builder/email.v1.json',
    title: 'Email document',
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
    'x-limits': EMAIL_LIMITS,
    'x-row-layouts': ROW_LAYOUTS,
    'x-variables': {
      path: VARIABLE_PATH.source,
      token: TEMPLATE_TOKEN.source,
      formats: FORMATS,
    },
  };
}
