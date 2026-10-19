import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts', 'src/db/migrar.ts', 'src/db/criar-admin.ts'],
  format: 'esm',
  target: 'node22',
  platform: 'node',
  clean: true,
  // O pacote compartilhado é TypeScript puro e vai embutido no bundle.
  noExternal: ['@saturbank/shared'],
});
