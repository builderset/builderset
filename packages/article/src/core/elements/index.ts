import { ElementRegistry, type ElementDefinition } from '@builderset/engine';
import { mediaElements } from './media';
import { articleElements } from './article';
import { engagementElements } from './engagement';
import { layoutElements } from './layout';
import { textElements } from './text';

export * from './article';
export * from './engagement';
export * from './fields';
export * from './layout';
export * from './media';
export * from './text';

/** Every standard element, in the order the insert menu lists them. */
export const standardElements = [
  ...layoutElements,
  ...textElements,
  ...mediaElements,
  ...articleElements,
  ...engagementElements,
] as unknown as readonly ElementDefinition<never>[];

/**
 * A registry with the standard library and, optionally, a host's own
 * elements. Plugins go last so the insert menu lists them after the standard
 * set, in their own category.
 */
export function createArticleRegistry(
  plugins: readonly ElementDefinition<never>[] = [],
): ElementRegistry {
  return new ElementRegistry([...standardElements, ...plugins]);
}
