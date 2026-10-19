import { CamelCasePlugin, Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import type { Database } from './tipos';

// BIGSERIAL e COUNT chegam como string; os ids de auditoria ficam como string mesmo.
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => v);

export type Db = Kysely<Database>;

export function criarDb(url: string): Db {
  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString: url, max: 10 }) }),
    plugins: [new CamelCasePlugin()],
  });
}
