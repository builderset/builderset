import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

/**
 * Two environments. Most suites run in a document: the editor's component tests need a document.
 *
 * `*.node.test.ts` run in plain Node, with no DOM and no setup file: they
 * prove the entries a server imports load there.
 */
export default defineConfig({
  plugins: [react()],
  // As the build does: tsdown.config.ts.
  define: { __BUILDERSET_ENGINE_VERSION__: JSON.stringify(version) },
  test: {
    globals: false,
    projects: [
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          setupFiles: ['./src/editor/test-setup.ts'],
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/**/*.node.test.ts'],
        },
      },
      {
        extends: true,
        test: { name: 'node', environment: 'node', include: ['src/**/*.node.test.ts'] },
      },
    ],
  },
});
