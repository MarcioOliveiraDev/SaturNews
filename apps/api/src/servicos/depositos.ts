import {
  type DepositoEntrada,
  type DepositoLoteEntrada,
  type ResultadoLoteDTO,
  SALDO_MAXIMO,
  planejarDepositoIndividual,
  planejarLote,
} from '@saturbank/shared';
import type { Db } from '../db/conexao';
import { type Transacao, emTransacao } from '../db/transacao';
import { ErroApp, entradaInvalida, estadoInvalido, naoEncontrado } from '../erros';
import { registrarAuditoria } from './auditoria';
import { exigirProfessorDaTurma } from './consultas';

interface Contexto {
  professorId: string;
  ip: string;
  chave?: string;
}

/** Credita respeitando o teto também no SQL (defesa em profundidade). */
async function creditar(trx: Transacao, alunoId: string, credito: number): Promise<number> {
  const r = await trx
    .updateTable('usuario')
    .set((eb) => ({ saldo: eb('saldo', '+', credito) }))
    .where('id', '=', alunoId)
    .where((eb) => eb(eb('saldo', '+', credito), '<=', SALDO_MAXIMO))
    .returning('saldo')
    .executeTakeFirst();
  if (!r) throw new Error('Violação do teto de saldo no banco');
  return r.saldo;
}

async function exigirTurmaAtiva(trx: Transacao, turmaId: string) {
  const turma = await trx.selectFrom('turma').select('ativa').where('id', '=', turmaId).executeTakeFirst();
  if (!turma) throw naoEncontrado();
  if (!turma.ativa) throw estadoInvalido();
}

export function depositar(db: Db, entrada: DepositoEntrada, ctx: Contexto) {
  return emTransacao(
    db,
    async (trx) => {
      const aluno = await trx
        .selectFrom('usuario')
        .select(['id', 'saldo', 'turmaId'])
        .where('id', '=', entrada.alunoId)
        .where('papel', '=', 'ALUNO')
        .where('ativo', '=', true)
        .forUpdate()
        .executeTakeFirst();
      if (!aluno?.turmaId) throw naoEncontrado();
      await exigirProfessorDaTurma(trx, ctx.professorId, aluno.turmaId);
      await exigirTurmaAtiva(trx, aluno.turmaId);

      const plano = planejarDepositoIndividual(aluno.saldo, entrada.valor);
      if (!plano.ok) throw new ErroApp(422, plano.erro, plano.maximo !== undefined ? { maximo: plano.maximo } : {});

      const saldo = await creditar(trx, aluno.id, plano.credito);
      const t = await trx
        .insertInto('transacao')
        .values({ tipo: 'DEPOSITO', valor: plano.credito, alunoId: aluno.id, autorId: ctx.professorId, descricao: entrada.descricao })
        .returning('id')
        .executeTakeFirstOrThrow();
      await registrarAuditoria(trx, {
        usuarioId: ctx.professorId,
        acao: 'DEPOSITO',
        alvo: aluno.id,
        ip: ctx.ip,
        resultado: 'SUCESSO',
        detalhes: { valor: plano.credito, transacaoId: t.id },
      });
      return { transacaoId: t.id, saldo };
    },
    { usuarioId: ctx.professorId, chave: ctx.chave },
  );
}

export function depositarEmLote(db: Db, entrada: DepositoLoteEntrada, ctx: Contexto): Promise<ResultadoLoteDTO> {
  return emTransacao(
    db,
    async (trx) => {
      await exigirProfessorDaTurma(trx, ctx.professorId, entrada.turmaId);
      await exigirTurmaAtiva(trx, entrada.turmaId);

      let q = trx
        .selectFrom('usuario')
        .select(['id', 'nome', 'saldo'])
        .where('turmaId', '=', entrada.turmaId)
        .where('papel', '=', 'ALUNO')
        .where('ativo', '=', true)
        // Ordem fixa de bloqueio por id evita deadlock com outras operações em lote.
        .orderBy('id')
        .forUpdate();
      const ids = entrada.alunoIds ? [...new Set(entrada.alunoIds)] : undefined;
      if (ids) q = q.where('id', 'in', ids);
      const alunos = await q.execute();
      if (ids && alunos.length !== ids.length) {
        throw entradaInvalida({ mensagens: ['Há alunos que não pertencem a esta turma'] });
      }

      const plano = planejarLote(
        alunos.map((a) => ({ alunoId: a.id, saldo: a.saldo })),
        entrada.valor,
      );
      if (!plano.ok) throw new ErroApp(422, plano.erro);

      const lote = await trx
        .insertInto('loteDeposito')
        .values({ professorId: ctx.professorId, turmaId: entrada.turmaId, valorUnitario: entrada.valor, descricao: entrada.descricao })
        .returning('id')
        .executeTakeFirstOrThrow();
      const creditados = plano.itens.filter((i) => i.credito > 0);
      for (const item of creditados) await creditar(trx, item.alunoId, item.credito);
      if (creditados.length) {
        await trx
          .insertInto('transacao')
          .values(
            creditados.map((i) => ({
              tipo: 'DEPOSITO' as const,
              valor: i.credito,
              alunoId: i.alunoId,
              autorId: ctx.professorId,
              descricao: entrada.descricao,
              loteId: lote.id,
            })),
          )
          .execute();
      }
      await registrarAuditoria(trx, {
        usuarioId: ctx.professorId,
        acao: 'DEPOSITO_LOTE',
        alvo: entrada.turmaId,
        ip: ctx.ip,
        resultado: 'SUCESSO',
        detalhes: { loteId: lote.id, valorUnitario: entrada.valor, alunos: alunos.length, total: plano.total },
      });

      const nomes = new Map(alunos.map((a) => [a.id, a.nome]));
      const itens = plano.itens
        .map((i) => ({ alunoId: i.alunoId, nome: nomes.get(i.alunoId)!, credito: i.credito }))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      return { loteId: lote.id, total: plano.total, itens };
    },
    { usuarioId: ctx.professorId, chave: ctx.chave },
  );
}
