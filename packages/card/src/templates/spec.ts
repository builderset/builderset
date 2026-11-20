import type { ElementRegistry } from '@builderset/engine';

import { buildCard, type CardDocument, type CardMeta } from '../core';
import { templateOptions, type CardTemplate } from './categories';

/** A whole new card from a template — for a host's "New card from template". */
export function buildTemplateCard(
  registry: ElementRegistry,
  template: CardTemplate,
  options: { meta?: Partial<CardMeta>; stable?: boolean } = {},
): CardDocument {
  return buildCard(registry, {
    ...templateOptions(template),
    meta: { name: template.name.sq, ...options.meta },
    stable: options.stable,
  });
}
