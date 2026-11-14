import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { unprefixedClasses } from '../../../tooling/check-prefix.mjs';

/**
 * Every Tailwind class carries the `bst:` prefix. A class without it is
 * silent — Tailwind emits nothing and the element loses a style — so this
 * test is what reports one (tooling/check-prefix.mjs).
 */
it('every Tailwind class carries the bst: prefix', async () => {
  const packageDir = fileURLToPath(new URL('..', import.meta.url));
  expect(await unprefixedClasses(packageDir, ['src/editor', 'src/render'])).toEqual([]);
}, 60_000);
