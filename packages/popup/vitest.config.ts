import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Two environments. Most suites run in a document: the editor and the renderer have component tests, and the editor and the renderer draw into a document.
 *
 * `*.node.test.ts` run in plain Node, with no DOM and no setup file: they
 * prove the entries a server imports load there.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    globals: false,
    projects: [
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          setupFiles: ['./src/render/test-setup.ts', './src/editor/test-setup.ts'],
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/**/*.node.test.ts'],
          // The first editor test pays for loading the whole editor into jsdom: seconds
          // on a shared CI runner, over the 5 s default.
          testTimeout: 20_000,
        },
      },
      {
        extends: true,
        test: { name: 'node', environment: 'node', include: ['src/**/*.node.test.ts'] },
      },
    ],
  },
});
