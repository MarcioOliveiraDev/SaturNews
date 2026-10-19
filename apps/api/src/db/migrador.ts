import { type Kysely, type Migration, Migrator } from 'kysely';
import * as m001 from './migracoes/001_inicial';

// Migrações importadas estaticamente para funcionarem também no bundle de produção.
const migracoes: Record<string, Migration> = { '001_inicial': m001 };

export async function migrarParaUltima(db: Kysely<unknown>): Promise<void> {
  const migrator = new Migrator({ db, provider: { getMigrations: async () => migracoes } });
  const { error, results } = await migrator.migrateToLatest();
  for (const r of results ?? []) if (r.status === 'Error') console.error(`Falha na migração ${r.migrationName}`);
  if (error) throw error;
}
