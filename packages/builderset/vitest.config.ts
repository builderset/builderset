import { defineConfig } from 'vitest/config';

/**
 * Plain Node: the package is re-exports and a stylesheet, and is tested as
 * built. One project, named `node` like the kits' server-side projects, so
 * CI's Node 20 run (`vitest run --project node` in every package) finds it.
 */
export default defineConfig({
  test: {
    globals: false,
    projects: [{ test: { name: 'node', environment: 'node', include: ['src/**/*.test.ts'] } }],
  },
});
