import type { Transaction } from 'kysely';
import type { Db } from './conexao';
import type { Database } from './tipos';

export type Transacao = Transaction<Database>;

/**
 * Executa `fn` numa transação SQL. Com chave de idempotência, uma repetição da mesma
 * operação (duplo clique, reenvio da rede) devolve a resposta original sem reexecutar.
 * Requisições simultâneas com a mesma chave esperam pela primeira na constraint única.
 */
export async function emTransacao<T>(
  db: Db,
  fn: (trx: Transacao) => Promise<T>,
  idempotencia?: { usuarioId: string; chave: string | undefined },
): Promise<T> {
  return db.transaction().execute(async (trx) => {
    const chave = idempotencia?.chave;
    if (idempotencia && chave) {
      const nova = await trx
        .insertInto('idempotencia')
        .values({ usuarioId: idempotencia.usuarioId, chave, resposta: null })
        .onConflict((oc) => oc.columns(['usuarioId', 'chave']).doNothing())
        .returning('chave')
        .executeTakeFirst();
      if (!nova) {
        const anterior = await trx
          .selectFrom('idempotencia')
          .select('resposta')
          .where('usuarioId', '=', idempotencia.usuarioId)
          .where('chave', '=', chave)
          .executeTakeFirstOrThrow();
        return anterior.resposta as T;
      }
    }
    const resultado = await fn(trx);
    if (idempotencia && chave) {
      await trx
        .updateTable('idempotencia')
        .set({ resposta: JSON.stringify(resultado) })
        .where('usuarioId', '=', idempotencia.usuarioId)
        .where('chave', '=', chave)
        .execute();
    }
    return resultado;
  });
}
