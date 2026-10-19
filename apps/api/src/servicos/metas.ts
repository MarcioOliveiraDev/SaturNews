import {
  type CriarMetaEntrada,
  type MetaDTO,
  aplicarContribuicao,
  calcularEstornos,
  podeCancelar,
  podeResgatar,
} from '@saturbank/shared';
import type { Db } from '../db/conexao';
import { type Transacao, emTransacao } from '../db/transacao';
import { ErroApp, entradaInvalida, estadoInvalido, naoEncontrado } from '../erros';
import { registrarAuditoria } from './auditoria';
import { exigirProfessorDaTurma, metaPorId } from './consultas';

async function bloquearMeta(trx: Transacao, metaId: string) {
  const meta = await trx.selectFrom('meta').selectAll().where('id', '=', metaId).forUpdate().executeTakeFirst();
  if (!meta) throw naoEncontrado();
  return meta;
}

export async function criarMeta(db: Db, turmaId: string, entrada: CriarMetaEntrada, ctx: { professorId: string; ip: string }) {
  return emTransacao(db, async (trx) => {
    await exigirProfessorDaTurma(trx, ctx.professorId, turmaId);
    const turma = await trx.selectFrom('turma').select('ativa').where('id', '=', turmaId).executeTakeFirst();
    if (!turma?.ativa) throw estadoInvalido();
    const item = await trx
      .selectFrom('itemCatalogo')
      .select(['id', 'nome'])
      .where('id', '=', entrada.itemId)
      .where('ativo', '=', true)
      .executeTakeFirst();
    if (!item) throw entradaInvalida({ campos: ['itemId'] });

    if (entrada.sugestaoId) {
      const aprovada = await trx
        .updateTable('sugestao')
        .set({ status: 'APROVADA', decididaPorId: ctx.professorId, decididaEm: new Date() })
        .where('id', '=', entrada.sugestaoId)
        .where('turmaId', '=', turmaId)
        .where('status', '=', 'PENDENTE')
        .returning('id')
        .executeTakeFirst();
      if (!aprovada) throw entradaInvalida({ campos: ['sugestaoId'] });
    }

    const meta = await trx
      .insertInto('meta')
      .values({
        turmaId,
        itemId: item.id,
        titulo: entrada.titulo ?? item.nome,
        valorAlvo: entrada.valorAlvo,
        criadaPorId: ctx.professorId,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    await registrarAuditoria(trx, {
      usuarioId: ctx.professorId,
      acao: 'META_CRIADA',
      alvo: meta.id,
      ip: ctx.ip,
      resultado: 'SUCESSO',
      detalhes: { turmaId, valorAlvo: entrada.valorAlvo },
    });
    return metaPorId(trx, meta.id);
  });
}

export function contribuir(db: Db, metaId: string, valor: number, ctx: { alunoId: string; ip: string; chave?: string }) {
  return emTransacao(
    db,
    async (trx) => {
      // Ordem de bloqueio: meta e depois aluno. Impede gasto duplo e estouro do alvo.
      const meta = await bloquearMeta(trx, metaId);
      const aluno = await trx
        .selectFrom('usuario')
        .select(['id', 'saldo', 'turmaId'])
        .where('id', '=', ctx.alunoId)
        .forUpdate()
        .executeTakeFirstOrThrow();
      if (aluno.turmaId !== meta.turmaId) throw naoEncontrado();

      const r = aplicarContribuicao(meta, aluno.saldo, valor);
      if (!r.ok) throw new ErroApp(422, r.erro, r.maximo !== undefined ? { maximo: r.maximo } : {});

      const { saldo } = await trx
        .updateTable('usuario')
        .set((eb) => ({ saldo: eb('saldo', '-', valor) }))
        .where('id', '=', aluno.id)
        .returning('saldo')
        .executeTakeFirstOrThrow();
      await trx
        .updateTable('meta')
        .set({ arrecadado: r.arrecadado, status: r.status, atingidaEm: r.status === 'ATINGIDA' ? new Date() : null })
        .where('id', '=', meta.id)
        .execute();
      await trx
        .insertInto('transacao')
        .values({ tipo: 'CONTRIBUICAO', valor, alunoId: aluno.id, metaId: meta.id, autorId: aluno.id, descricao: meta.titulo })
        .execute();
      await registrarAuditoria(trx, {
        usuarioId: aluno.id,
        acao: 'CONTRIBUICAO',
        alvo: meta.id,
        ip: ctx.ip,
        resultado: 'SUCESSO',
        detalhes: { valor, status: r.status },
      });
      return { saldo, meta: await metaPorId(trx, meta.id) };
    },
    { usuarioId: ctx.alunoId, chave: ctx.chave },
  );
}

export async function minhaContribuicao(db: Db, metaId: string, alunoId: string): Promise<number> {
  const linhas = await db
    .selectFrom('transacao')
    .select(['tipo', 'valor'])
    .where('metaId', '=', metaId)
    .where('alunoId', '=', alunoId)
    .execute();
  return linhas.reduce((soma, t) => soma + (t.tipo === 'CONTRIBUICAO' ? t.valor : -t.valor), 0);
}

/** Cancela a meta (já bloqueada) devolvendo a cada aluno o que ele contribuiu. */
export async function cancelarMetaBloqueada(
  trx: Transacao,
  meta: { id: string; titulo: string },
  autorId: string,
): Promise<{ alunoId: string; valor: number }[]> {
  const contribuicoes = await trx
    .selectFrom('transacao')
    .select(['alunoId', 'valor'])
    .where('metaId', '=', meta.id)
    .where('tipo', '=', 'CONTRIBUICAO')
    .execute();
  const estornos = calcularEstornos(contribuicoes).sort((a, b) => a.alunoId.localeCompare(b.alunoId));
  for (const e of estornos) {
    // Estorno devolve o valor integral, mesmo que ultrapasse o teto (decisão D5).
    await trx
      .updateTable('usuario')
      .set((eb) => ({ saldo: eb('saldo', '+', e.valor) }))
      .where('id', '=', e.alunoId)
      .execute();
  }
  if (estornos.length) {
    await trx
      .insertInto('transacao')
      .values(
        estornos.map((e) => ({
          tipo: 'ESTORNO' as const,
          valor: e.valor,
          alunoId: e.alunoId,
          metaId: meta.id,
          autorId,
          descricao: `Estorno: ${meta.titulo}`,
        })),
      )
      .execute();
  }
  await trx.updateTable('meta').set({ status: 'CANCELADA', arrecadado: 0, canceladaEm: new Date() }).where('id', '=', meta.id).execute();
  return estornos;
}

export function cancelarMeta(db: Db, metaId: string, ctx: { professorId: string; ip: string }) {
  return emTransacao(db, async (trx) => {
    const meta = await bloquearMeta(trx, metaId);
    await exigirProfessorDaTurma(trx, ctx.professorId, meta.turmaId);
    if (!podeCancelar(meta.status)) throw estadoInvalido();
    const estornos = await cancelarMetaBloqueada(trx, meta, ctx.professorId);
    await registrarAuditoria(trx, {
      usuarioId: ctx.professorId,
      acao: 'META_CANCELADA',
      alvo: meta.id,
      ip: ctx.ip,
      resultado: 'SUCESSO',
      detalhes: { estornos: estornos.length },
    });
    return { meta: await metaPorId(trx, meta.id), estornos };
  });
}

export function resgatarMeta(db: Db, metaId: string, ctx: { professorId: string; ip: string }): Promise<MetaDTO> {
  return emTransacao(db, async (trx) => {
    const meta = await bloquearMeta(trx, metaId);
    await exigirProfessorDaTurma(trx, ctx.professorId, meta.turmaId);
    if (!podeResgatar(meta.status)) throw estadoInvalido();
    await trx.updateTable('meta').set({ status: 'RESGATADA', resgatadaEm: new Date() }).where('id', '=', meta.id).execute();
    await registrarAuditoria(trx, { usuarioId: ctx.professorId, acao: 'META_RESGATADA', alvo: meta.id, ip: ctx.ip, resultado: 'SUCESSO' });
    return metaPorId(trx, meta.id);
  });
}
