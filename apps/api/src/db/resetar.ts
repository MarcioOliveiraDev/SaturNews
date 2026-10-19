import { sql } from 'kysely';
import { carregarConfig } from '../config';
import { criarDb } from './conexao';
import { migrarParaUltima } from './migrador';

/** Recria o banco do zero. Só para bancos de teste/E2E (o nome precisa conter "test" ou "e2e"). */
const config = carregarConfig();
if (!/test|e2e/i.test(new URL(config.databaseUrl).pathname)) {
  console.error('Recusado: DATABASE_URL não parece ser um banco de teste.');
  process.exit(1);
}
const db = criarDb(config.databaseUrl);
try {
  await sql`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`.execute(db);
  await migrarParaUltima(db);
} finally {
  await db.destroy();
}
