import { type AlunoResumoDTO, type TurmaDTO, criarMetaSchema, depositoLoteSchema, depositoSchema } from '@saturbank/shared';
import type { FastifyPluginAsync } from 'fastify';
import { sql } from 'kysely';
import type { Db } from '../db/conexao';
import { alunoDoProfessor, exigirProfessorDaTurma, extrato, metasDaTurma } from '../servicos/consultas';
import { depositar, depositarEmLote } from '../servicos/depositos';
import { cancelarMeta, criarMeta, resgatarMeta } from '../servicos/metas';
import { recusarSugestao, sugestoesPendentes } from '../servicos/sugestoes';
import { chaveIdempotencia, idDaRota, validar } from '../validacao';
import { PROFESSOR } from './comum';

const cfg = { config: { papeis: PROFESSOR } };

export const rotasProfessor: FastifyPluginAsync<{ db: Db }> = async (app, { db }) => {
  app.get('/turmas', cfg, async (req): Promise<TurmaDTO[]> => {
    const linhas = await db
      .selectFrom('turma as t')
      .innerJoin('professorTurma as pt', 'pt.turmaId', 't.id')
      .select((eb) => [
        't.id',
        't.nome',
        eb
          .selectFrom('usuario as u')
          .select(eb.fn.countAll<string>().as('n'))
          .whereRef('u.turmaId', '=', 't.id')
          .where('u.papel', '=', 'ALUNO')
          .where('u.ativo', '=', true)
          .as('totalAlunos'),
        eb
          .selectFrom('meta as m')
          .select(eb.fn.countAll<string>().as('n'))
          .whereRef('m.turmaId', '=', 't.id')
          .where('m.status', '=', 'ABERTA')
          .as('metasAbertas'),
      ])
      .where('pt.professorId', '=', req.usuario!.id)
      // Turmas encerradas continuam visíveis enquanto houver meta atingida para resgatar.
      .where((eb) =>
        eb.or([
          eb('t.ativa', '=', true),
          eb.exists(eb.selectFrom('meta as m2').select('m2.id').whereRef('m2.turmaId', '=', 't.id').where('m2.status', '=', 'ATINGIDA')),
        ]),
      )
      .orderBy(sql`t.nome`)
      .execute();
    return linhas.map((t) => ({ id: t.id, nome: t.nome, totalAlunos: Number(t.totalAlunos), metasAbertas: Number(t.metasAbertas) }));
  });

  app.get('/turmas/:id/alunos', cfg, async (req): Promise<AlunoResumoDTO[]> => {
    const turmaId = idDaRota(req.params);
    await exigirProfessorDaTurma(db, req.usuario!.id, turmaId);
    const alunos = await db
      .selectFrom('usuario')
      .select(['id', 'nome', 'login as matricula', 'saldo'])
      .where('turmaId', '=', turmaId)
      .where('papel', '=', 'ALUNO')
      .where('ativo', '=', true)
      .execute();
    return alunos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  });

  app.get('/turmas/:id/metas', cfg, async (req) => {
    const turmaId = idDaRota(req.params);
    await exigirProfessorDaTurma(db, req.usuario!.id, turmaId);
    return metasDaTurma(db, turmaId);
  });

  app.post('/turmas/:id/metas', cfg, async (req, reply) => {
    const turmaId = idDaRota(req.params);
    const entrada = validar(criarMetaSchema, req.body);
    reply.status(201);
    return criarMeta(db, turmaId, entrada, { professorId: req.usuario!.id, ip: req.ip });
  });

  app.get('/turmas/:id/sugestoes', cfg, async (req) => {
    const turmaId = idDaRota(req.params);
    await exigirProfessorDaTurma(db, req.usuario!.id, turmaId);
    return sugestoesPendentes(db, turmaId);
  });

  app.post('/sugestoes/:id/recusar', cfg, async (req, reply) => {
    await recusarSugestao(db, idDaRota(req.params), { professorId: req.usuario!.id, ip: req.ip });
    return reply.status(204).send();
  });

  app.post('/metas/:id/resgatar', cfg, async (req) => resgatarMeta(db, idDaRota(req.params), { professorId: req.usuario!.id, ip: req.ip }));

  app.post('/metas/:id/cancelar', cfg, async (req) => cancelarMeta(db, idDaRota(req.params), { professorId: req.usuario!.id, ip: req.ip }));

  app.post('/depositos', cfg, async (req, reply) => {
    const entrada = validar(depositoSchema, req.body);
    reply.status(201);
    return depositar(db, entrada, { professorId: req.usuario!.id, ip: req.ip, chave: chaveIdempotencia(req.headers) });
  });

  app.post('/depositos/lote', cfg, async (req, reply) => {
    const entrada = validar(depositoLoteSchema, req.body);
    reply.status(201);
    return depositarEmLote(db, entrada, { professorId: req.usuario!.id, ip: req.ip, chave: chaveIdempotencia(req.headers) });
  });

  app.get('/alunos/:id', cfg, async (req): Promise<AlunoResumoDTO> => {
    const { turmaId: _t, ...aluno } = await alunoDoProfessor(db, req.usuario!.id, idDaRota(req.params));
    return aluno;
  });

  app.get('/alunos/:id/transacoes', cfg, async (req) => {
    const aluno = await alunoDoProfessor(db, req.usuario!.id, idDaRota(req.params));
    return extrato(db, aluno.id, (req.query as Record<string, unknown>).cursor);
  });
};
