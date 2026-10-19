import { encerrarAnoSchema } from '@saturbank/shared';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { Db } from '../db/conexao';
import { buscarAlunos, encerrarAno, importarAlunos, listarAuditoria, redefinirSenha } from '../servicos/admin';
import { idDaRota, validar } from '../validacao';
import { ADMIN } from './comum';

const cfg = { config: { papeis: ADMIN } };
const importacaoSchema = z.object({ csv: z.string().min(1).max(500_000), simular: z.boolean().optional() }).strict();

export const rotasAdmin: FastifyPluginAsync<{ db: Db }> = async (app, { db }) => {
  app.post('/admin/importacoes/alunos', { ...cfg, bodyLimit: 1024 * 1024 }, async (req, reply) => {
    const { csv, simular } = validar(importacaoSchema, req.body);
    const r = await importarAlunos(db, csv, simular ?? false, { adminId: req.usuario!.id, ip: req.ip });
    reply.status(r.simulacao ? 200 : 201);
    return r;
  });

  app.get('/admin/alunos', cfg, async (req) => {
    const busca = (req.query as Record<string, unknown>).busca;
    return buscarAlunos(db, typeof busca === 'string' ? busca : '');
  });

  app.post('/admin/usuarios/:id/redefinir-senha', cfg, async (req) =>
    redefinirSenha(db, idDaRota(req.params), { adminId: req.usuario!.id, ip: req.ip }),
  );

  app.post('/admin/encerrar-ano', cfg, async (req) => {
    const { confirmacao } = validar(encerrarAnoSchema, req.body);
    return encerrarAno(db, confirmacao, { adminId: req.usuario!.id, ip: req.ip });
  });

  app.get('/admin/auditoria', cfg, async (req) => listarAuditoria(db, (req.query as Record<string, unknown>).cursor));
};
