import { sql } from 'kysely';
import { criarDb } from '../src/db/conexao';
import { migrarParaUltima } from '../src/db/migrador';
import { urlBancoTeste } from './url';

/** Recria o schema do banco de testes do zero a cada execução. */
export default async function setup(): Promise<void> {
  const db = criarDb(urlBancoTeste());
  try {
    await sql`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`.execute(db);
    await migrarParaUltima(db);
  } finally {
    await db.destroy();
  }
}
