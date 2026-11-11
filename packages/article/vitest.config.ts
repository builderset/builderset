import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Two environments. Most suites run in a document: the renderer and the editor have component tests, and `importHTML` parses pasted HTML with the platform's `DOMParser`.
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
        },
      },
      {
        extends: true,
        test: { name: 'node', environment: 'node', include: ['src/**/*.node.test.ts'] },
      },
    ],
  },
});
