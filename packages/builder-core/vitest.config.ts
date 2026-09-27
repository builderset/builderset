import { defineConfig } from 'vitest/config';

/**
 * The model is pure TypeScript, but `importHTML` parses pasted HTML with the
 * platform's `DOMParser`, so the suite runs in a document.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.test.ts'],
  },
});
