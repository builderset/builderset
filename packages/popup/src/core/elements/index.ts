import { defineElement, ElementRegistry, type ElementDefinition } from '@builderset/engine';

import { defaultFormat, popupFormatSchema } from '../document';
import { actionElements } from './actions';
import { mediaElements } from './media';
import { textElements } from './text';

export * from './actions';
export * from './common';
export * from './media';
export * from './text';

/**
 * The popup itself: the root of the tree, its props the popup's format. Never
 * offered in the library — every popup has exactly one.
 */
export const rootElement = defineElement({
  type: 'root',
  version: 1,
  category: 'structure',
  icon: 'app-window',
  schema: popupFormatSchema,
  defaults: () => defaultFormat('modal'),
  container: { max: 200 },
  internal: true,
});

/** The library's groups, in order. `structure` (the root) is never offered. */
export const POPUP_CATEGORIES = ['text', 'actions', 'media', 'structure'] as const;

/** Every element of a popup, in the library's order. */
export const standardPopupElements = [
  rootElement,
  ...textElements,
  ...actionElements,
  ...mediaElements,
] as unknown as readonly ElementDefinition<never>[];

/** A registry of the standard elements and, optionally, a host's own. */
export function createPopupRegistry(
  plugins: readonly ElementDefinition<never>[] = [],
): ElementRegistry {
  return new ElementRegistry([...standardPopupElements, ...plugins]);
}

/** The elements whose words a visitor reads, and may carry variables. */
export const TEXT_TYPES = ['heading', 'text', 'label', 'button'] as const;
