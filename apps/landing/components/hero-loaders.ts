import type { ComponentType } from 'react';

import type { HeroKitId } from './hero-kit-list';
import type { HeroKitProps } from './hero-ready';

type Loader = () => Promise<{ default: ComponentType<HeroKitProps> }>;

/**
 * Each editor is its own chunk, fetched the first time it is needed. Calling
 * a loader early (before the switch, or when a tab is pointed at) only fetches
 * it: the bundler keeps the module, so mounting it later does not wait.
 */
export const LOADERS: Record<HeroKitId, Loader> = {
  article: () => import('./hero-editor-article'),
  email: () => import('./hero-editor-email'),
  form: () => import('./hero-editor-form'),
  card: () => import('./hero-editor-card'),
  popup: () => import('./hero-editor-popup'),
};

export function preloadKit(id: HeroKitId) {
  // A failed fetch is retried when the editor mounts; nothing to do here.
  LOADERS[id]().catch(() => undefined);
}
