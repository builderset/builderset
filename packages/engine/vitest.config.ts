import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * The editor's component tests need a document.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/editor/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
