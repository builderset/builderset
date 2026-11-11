import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * One environment for the whole package: the editor and the renderer have
 * component tests, and the core's `importHTML` parses pasted HTML with the
 * platform's `DOMParser`, so every suite runs in a document.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/render/test-setup.ts', './src/editor/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
