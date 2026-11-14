import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: { port: 5199, strictPort: true },
  preview: { port: 5199, strictPort: true },
  build: {
    rollupOptions: {
      input: { main: 'index.html', bare: 'bare.html' },
    },
  },
});
