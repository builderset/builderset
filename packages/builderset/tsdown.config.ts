import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/**/*.ts', '!src/**/*.test.ts'],
  root: 'src',
  format: 'esm',
  platform: 'neutral',
  outDir: 'dist',
  // No type maps: they would point at src/, which is not shipped.
  dts: { sourcemap: false },
  sourcemap: true,
  clean: true,
  // One output file per door, each keeping its 'use client' line.
  unbundle: true,
});
