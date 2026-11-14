import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { ENGINE_VERSION } from '../core';
import { registerEngine } from './one-engine';

const KEY = Symbol.for('builderset.engine.versions');
const scope = globalThis as unknown as Record<symbol, Set<string> | undefined>;

afterEach(() => {
  scope[KEY] = undefined;
  vi.restoreAllMocks();
});

it("knows its own version, from the package's manifest", () => {
  const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
  expect(ENGINE_VERSION).toBe(manifest.version);
});

it('warns once when a different engine is already in the page', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  registerEngine();
  expect(warn).not.toHaveBeenCalled();
  scope[KEY]?.add('9.9.9');
  registerEngine();
  registerEngine();
  expect(warn).toHaveBeenCalledTimes(1);
  expect(String(warn.mock.calls[0]?.[0])).toContain('9.9.9');
});
