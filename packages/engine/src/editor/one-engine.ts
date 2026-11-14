import { ENGINE_VERSION } from '../core';

const KEY = Symbol.for('builderset.engine.versions');
let warned = false;

const inDevelopment = () => typeof process === 'undefined' || process.env.NODE_ENV !== 'production';

/**
 * Two engines in one page: `builderset` and a separately installed kit at a
 * different version each bring their own. Every editor still works — an
 * editor uses only its own engine — but the bundle carries both. Each editor
 * records its engine's version when it mounts; a second, different one gets
 * one warning, in development only.
 */
export function registerEngine(): void {
  const scope = globalThis as unknown as Record<symbol, Set<string> | undefined>;
  const versions = (scope[KEY] ??= new Set<string>());
  versions.add(ENGINE_VERSION);
  if (versions.size < 2 || warned || !inDevelopment()) return;
  warned = true;
  console.warn(
    `Builderset: two engines are loaded (${[...versions].join(' and ')}). ` +
      'Keep builderset and every @builderset/* package at one version, so the page carries one engine.',
  );
}
