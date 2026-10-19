import type { Db } from '../db/conexao';
import type { Transacao } from '../db/transacao';

export interface RegistroAuditoria {
  usuarioId: string | null;
  acao: string;
  alvo?: string | null;
  ip?: string | null;
  resultado: 'SUCESSO' | 'FALHA' | 'NEGADO';
  detalhes?: Record<string, unknown>;
}

export async function registrarAuditoria(db: Db | Transacao, r: RegistroAuditoria): Promise<void> {
  await db
    .insertInto('auditoria')
    .values({
      usuarioId: r.usuarioId,
      acao: r.acao,
      alvo: r.alvo ?? null,
      ip: r.ip ?? null,
      resultado: r.resultado,
      detalhes: r.detalhes ? JSON.stringify(r.detalhes) : null,
    })
    .execute();
}
