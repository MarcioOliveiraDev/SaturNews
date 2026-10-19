import type { FastifyInstance } from 'fastify';
import type { Db } from '../db/conexao';
import { ErroApp } from '../erros';
import { NOME_COOKIE, carregarSessao, csrfValido } from '../servicos/auth';

const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Controle de acesso centralizado (OWASP A01):
 * - negar por padrão: rota da API sem `publico`/`papeis` impede a app de iniciar;
 * - sessão obrigatória, token CSRF em toda escrita, troca de senha pendente e papel.
 * A autorização por recurso (ex.: professor ↔ turma) fica nos serviços.
 */
export function registrarControleDeAcesso(app: FastifyInstance, db: Db) {
  app.decorateRequest('usuario', null);

  app.addHook('onRoute', (rota) => {
    if (!rota.url.startsWith('/api/')) return;
    const cfg = rota.config ?? {};
    if (!cfg.publico && !cfg.papeis?.length) {
      throw new Error(`Rota sem controle de acesso declarado: ${String(rota.method)} ${rota.url}`);
    }
  });

  app.addHook('onRequest', async (req) => {
    if (!req.url.startsWith('/api/') || req.is404) return;
    const cfg = req.routeOptions.config;
    if (cfg.publico) return;

    const usuario = await carregarSessao(db, req.cookies[NOME_COOKIE]);
    if (!usuario) throw new ErroApp(401, 'NAO_AUTENTICADO');
    req.usuario = usuario;

    if (!METODOS_SEGUROS.has(req.method) && !csrfValido(usuario.csrfToken, req.headers['x-csrf-token'])) {
      throw new ErroApp(403, 'CSRF');
    }
    if (usuario.trocarSenha && !cfg.liberadaComTrocaPendente) throw new ErroApp(403, 'TROCA_SENHA_OBRIGATORIA');
    if (!cfg.papeis?.includes(usuario.papel)) throw new ErroApp(403, 'PROIBIDO');
  });
}
