import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Os testes de integração compartilham um banco real; rodam em série.
    fileParallelism: false,
    globalSetup: ['test/global-setup.ts'],
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
