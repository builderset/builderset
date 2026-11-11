import { ElementRegistry, type ElementDefinition } from '@motors/builder-core';

import { commerceElements } from './commerce';
import { contentElements } from './content';
import { structureElements } from './structure';

export * from './commerce';
export * from './content';
export * from './structure';

/** The block categories, in the order the library lists them. */
export const EMAIL_CATEGORIES = [
  'structure',
  'content',
  'media',
  'brand',
  'commerce',
  'data',
  'compliance',
  'logic',
] as const;

export const standardEmailElements = [
  ...structureElements,
  ...contentElements,
  ...commerceElements,
] as unknown as readonly ElementDefinition<never>[];

/** A registry of the standard email blocks and, optionally, a host's own. */
export function createEmailRegistry(
  plugins: readonly ElementDefinition<never>[] = [],
): ElementRegistry {
  return new ElementRegistry([...standardEmailElements, ...plugins]);
}
