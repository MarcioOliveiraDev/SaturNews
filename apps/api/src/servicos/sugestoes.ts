import type { SugestaoDTO, SugestaoEntrada } from '@saturbank/shared';
import type { Db } from '../db/conexao';
import { emTransacao } from '../db/transacao';
import { ErroApp, entradaInvalida, estadoInvalido, naoEncontrado } from '../erros';
import { registrarAuditoria } from './auditoria';
import { exigirProfessorDaTurma } from './consultas';

const MAX_PENDENTES_POR_ALUNO = 3;

function consulta(db: Db) {
  return db
    .selectFrom('sugestao as s')
    .innerJoin('usuario as a', 'a.id', 's.alunoId')
    .leftJoin('itemCatalogo as i', 'i.id', 's.itemId')
    .select(['s.id', 'a.nome as aluno', 'i.nome as item', 's.texto', 's.status', 's.criadaEm']);
}

const paraDTO = (s: Awaited<ReturnType<ReturnType<typeof consulta>['executeTakeFirstOrThrow']>>): SugestaoDTO => ({
  ...s,
  criadaEm: s.criadaEm.toISOString(),
});

export async function sugerir(db: Db, entrada: SugestaoEntrada, ctx: { alunoId: string; turmaId: string; ip: string }) {
  const id = await emTransacao(db, async (trx) => {
    // Bloqueia o aluno para a contagem de pendentes não ser burlada com requisições simultâneas.
    await trx.selectFrom('usuario').select('id').where('id', '=', ctx.alunoId).forUpdate().execute();
    const { total } = await trx
      .selectFrom('sugestao')
      .select((eb) => eb.fn.countAll<string>().as('total'))
      .where('alunoId', '=', ctx.alunoId)
      .where('status', '=', 'PENDENTE')
      .executeTakeFirstOrThrow();
    if (Number(total) >= MAX_PENDENTES_POR_ALUNO) throw new ErroApp(422, 'LIMITE_SUGESTOES');
    if (entrada.itemId) {
      const item = await trx.selectFrom('itemCatalogo').select('id').where('id', '=', entrada.itemId).where('ativo', '=', true).executeTakeFirst();
      if (!item) throw entradaInvalida({ campos: ['itemId'] });
    }
    const s = await trx
      .insertInto('sugestao')
      .values({ turmaId: ctx.turmaId, alunoId: ctx.alunoId, itemId: entrada.itemId ?? null, texto: entrada.texto ?? null })
      .returning('id')
      .executeTakeFirstOrThrow();
    await registrarAuditoria(trx, { usuarioId: ctx.alunoId, acao: 'SUGESTAO', alvo: s.id, ip: ctx.ip, resultado: 'SUCESSO' });
    return s.id;
  });
  return paraDTO(await consulta(db).where('s.id', '=', id).executeTakeFirstOrThrow());
}

export async function sugestoesPendentes(db: Db, turmaId: string): Promise<SugestaoDTO[]> {
  const linhas = await consulta(db).where('s.turmaId', '=', turmaId).where('s.status', '=', 'PENDENTE').orderBy('s.criadaEm').execute();
  return linhas.map(paraDTO);
}

export function recusarSugestao(db: Db, id: string, ctx: { professorId: string; ip: string }) {
  return emTransacao(db, async (trx) => {
    const s = await trx.selectFrom('sugestao').select(['id', 'turmaId', 'status']).where('id', '=', id).forUpdate().executeTakeFirst();
    if (!s) throw naoEncontrado();
    await exigirProfessorDaTurma(trx, ctx.professorId, s.turmaId);
    if (s.status !== 'PENDENTE') throw estadoInvalido();
    await trx
      .updateTable('sugestao')
      .set({ status: 'RECUSADA', decididaPorId: ctx.professorId, decididaEm: new Date() })
      .where('id', '=', id)
      .execute();
    await registrarAuditoria(trx, { usuarioId: ctx.professorId, acao: 'SUGESTAO_RECUSADA', alvo: id, ip: ctx.ip, resultado: 'SUCESSO' });
  });
}
