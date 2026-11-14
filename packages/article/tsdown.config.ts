import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: [
    'src/core/index.ts',
    'src/render/index.ts',
    'src/editor/index.ts',
    'src/host.ts',
    'src/locales/*.ts',
    '!src/**/*.test.ts',
  ],
  root: 'src',
  format: 'esm',
  platform: 'neutral',
  outDir: 'dist',
  dts: true,
  sourcemap: true,
  clean: true,
  // One output file per source file. This is what keeps every 'use client'
  // line at the top of the file it belongs to.
  unbundle: true,
});
