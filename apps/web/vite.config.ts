import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3000' },
  },
  // Sem assets embutidos como data: URI — a CSP só permite fontes de 'self'.
  build: { sourcemap: false, assetsInlineLimit: 0 },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/teste-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
