import { type Kysely, type Migration, Migrator } from 'kysely';
import * as m001 from './migracoes/001_inicial';
import * as m002 from './migracoes/002_catalogo';

// Migrações importadas estaticamente para funcionarem também no bundle de produção.
const migracoes: Record<string, Migration> = { '001_inicial': m001, '002_catalogo': m002 };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function migrarParaUltima(db: Kysely<any>): Promise<void> {
  const migrator = new Migrator({ db, provider: { getMigrations: async () => migracoes } });
  const { error, results } = await migrator.migrateToLatest();
  for (const r of results ?? []) if (r.status === 'Error') console.error(`Falha na migração ${r.migrationName}`);
  if (error) throw error;
}
