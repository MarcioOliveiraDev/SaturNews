import { type ItemCatalogoDTO, SALDO_MAXIMO, contribuicaoSchema, espacoDisponivel, sugestaoSchema } from '@saturbank/shared';
import type { FastifyPluginAsync } from 'fastify';
import type { Db } from '../db/conexao';
import { naoEncontrado } from '../erros';
import { extrato, metaPorId, metasDaTurma, professorDaTurma } from '../servicos/consultas';
import { contribuir, minhaContribuicao } from '../servicos/metas';
import { sugerir } from '../servicos/sugestoes';
import { chaveIdempotencia, idDaRota, validar } from '../validacao';
import { ALUNO, TODOS } from './comum';

export const rotasAluno: FastifyPluginAsync<{ db: Db }> = async (app, { db }) => {
  app.get('/me/conta', { config: { papeis: ALUNO } }, async (req) => {
    const { saldo } = await db.selectFrom('usuario').select('saldo').where('id', '=', req.usuario!.id).executeTakeFirstOrThrow();
    return { saldo, teto: SALDO_MAXIMO, espaco: espacoDisponivel(saldo) };
  });

  app.get('/me/transacoes', { config: { papeis: ALUNO } }, async (req) =>
    extrato(db, req.usuario!.id, (req.query as Record<string, unknown>).cursor),
  );

  app.get('/me/turma/metas', { config: { papeis: ALUNO } }, async (req) => metasDaTurma(db, req.usuario!.turmaId!));

  app.post('/me/turma/sugestoes', { config: { papeis: ALUNO } }, async (req, reply) => {
    const entrada = validar(sugestaoSchema, req.body);
    const u = req.usuario!;
    reply.status(201);
    return sugerir(db, entrada, { alunoId: u.id, turmaId: u.turmaId!, ip: req.ip });
  });

  app.get('/catalogo', { config: { papeis: TODOS } }, async (): Promise<ItemCatalogoDTO[]> =>
    db
      .selectFrom('itemCatalogo')
      .select(['id', 'nome', 'descricao', 'icone', 'precoSugerido'])
      .where('ativo', '=', true)
      .orderBy('nome')
      .execute(),
  );

  // Visível ao aluno da turma da meta e aos professores dessa turma.
  app.get('/metas/:id', { config: { papeis: ['ALUNO', 'PROFESSOR'] } }, async (req) => {
    const id = idDaRota(req.params);
    const u = req.usuario!;
    const meta = await db.selectFrom('meta').select('turmaId').where('id', '=', id).executeTakeFirst();
    if (!meta) throw naoEncontrado();
    if (u.papel === 'ALUNO') {
      if (meta.turmaId !== u.turmaId) throw naoEncontrado();
      return { ...(await metaPorId(db, id)), minhaContribuicao: await minhaContribuicao(db, id, u.id) };
    }
    if (!(await professorDaTurma(db, u.id, meta.turmaId))) throw naoEncontrado();
    return metaPorId(db, id);
  });

  app.post('/metas/:id/contribuicoes', { config: { papeis: ALUNO } }, async (req, reply) => {
    const id = idDaRota(req.params);
    const { valor } = validar(contribuicaoSchema, req.body);
    reply.status(201);
    return contribuir(db, id, valor, { alunoId: req.usuario!.id, ip: req.ip, chave: chaveIdempotencia(req.headers) });
  });
};
