import { defineConfig, devices } from '@playwright/test';

const PORTA = 3100;
const DATABASE_URL = process.env.E2E_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/saturbank_e2e';

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://localhost:${PORTA}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'celular-pequeno', use: { ...devices['iPhone SE'], browserName: 'chromium' } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 860 } } },
  ],
  // Testa o build de produção: API servindo o frontend com a CSP real.
  webServer: {
    command: 'node ../api/dist/server.js',
    url: `http://localhost:${PORTA}/api/v1/saude`,
    reuseExistingServer: false,
    env: { NODE_ENV: 'test', PORT: String(PORTA), DATABASE_URL, WEB_DIST: './dist' },
  },
});
