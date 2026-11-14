import { defineConfig } from 'vitest/config';

/** Plain Node: the package is re-exports and a stylesheet, and is tested as built. */
export default defineConfig({
  test: { globals: false, environment: 'node', include: ['src/**/*.test.ts'] },
});
