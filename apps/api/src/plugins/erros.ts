import { MENSAGENS_ERRO } from '@saturbank/shared';
import type { FastifyError, FastifyInstance, FastifyReply } from 'fastify';
import { ErroApp } from '../erros';
import { registrarAuditoria } from '../servicos/auditoria';
import type { Db } from '../db/conexao';

export function enviarProblema(reply: FastifyReply, status: number, codigo: string, extras: Record<string, unknown> = {}) {
  return reply
    .status(status)
    .type('application/problem+json')
    .send({ type: 'about:blank', title: MENSAGENS_ERRO[codigo] ?? codigo, status, codigo, ...extras });
}

/** Respostas de erro no formato RFC 9457, sem detalhes internos (OWASP A02/A10). */
export function registrarTratamentoDeErros(app: FastifyInstance, db: Db) {
  app.setErrorHandler(async (erro: FastifyError | ErroApp, req, reply) => {
    if (erro instanceof ErroApp) {
      if (erro.statusCode === 403 && req.usuario) {
        await registrarAuditoria(db, {
          usuarioId: req.usuario.id,
          acao: 'ACESSO_NEGADO',
          alvo: `${req.method} ${req.url.split('?')[0]}`,
          ip: req.ip,
          resultado: 'NEGADO',
        }).catch((e) => req.log.error(e));
      }
      return enviarProblema(reply, erro.statusCode, erro.codigo, erro.extras);
    }
    const status = erro.statusCode ?? 500;
    if (status === 429) return enviarProblema(reply, 429, 'MUITAS_REQUISICOES');
    if (status >= 400 && status < 500) return enviarProblema(reply, status, status === 404 ? 'NAO_ENCONTRADO' : 'ENTRADA_INVALIDA');
    req.log.error({ err: erro }, 'erro inesperado');
    return enviarProblema(reply, 500, 'ERRO_INTERNO');
  });
}
