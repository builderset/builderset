import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/** Component tests need a DOM, as in `@motors/ui`. */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
