import { execSync } from 'node:child_process';

/** Banco E2E limpo + dados fictícios antes da suíte. */
export default function setup() {
  const env = { ...process.env, NODE_ENV: 'test', DATABASE_URL: process.env.E2E_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/saturbank_e2e' };
  const api = { cwd: '../api', env, stdio: 'inherit' as const };
  execSync('npx tsx src/db/resetar.ts', api);
  execSync('npx tsx src/db/seed.ts', api);
}
