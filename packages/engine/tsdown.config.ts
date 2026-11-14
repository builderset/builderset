import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsdown';

const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

export default defineConfig({
  entry: [
    'src/core/index.ts',
    'src/host/index.ts',
    'src/editor/index.ts',
    'src/editor/ui/index.ts',
    'src/locales/*.ts',
    '!src/**/*.test.ts',
  ],
  root: 'src',
  format: 'esm',
  platform: 'neutral',
  outDir: 'dist',
  // No type maps: they would point at src/, which is not shipped. The
  // JavaScript maps carry their sources inside them.
  dts: { sourcemap: false },
  sourcemap: true,
  clean: true,
  // One output file per source file. This is what keeps every 'use client'
  // line at the top of the file it belongs to.
  unbundle: true,
  // The engine knows its own version: ENGINE_VERSION, and the two-engines warning.
  define: { __BUILDERSET_ENGINE_VERSION__: JSON.stringify(version) },
});
