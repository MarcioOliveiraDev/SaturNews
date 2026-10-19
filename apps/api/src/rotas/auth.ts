import { loginSchema, trocarSenhaSchema } from '@saturbank/shared';
import type { FastifyPluginAsync } from 'fastify';
import type { Config } from '../config';
import type { Db } from '../db/conexao';
import { DURACAO_MAXIMA_MS, NOME_COOKIE, entrar, paraUsuarioLogado, sair, trocarSenha } from '../servicos/auth';
import { validar } from '../validacao';
import { TODOS } from './comum';

export const rotasAuth: FastifyPluginAsync<{ db: Db; config: Config }> = async (app, { db, config }) => {
  const limiteLogin = { max: config.limiteRequisicoesLogin, timeWindow: '1 minute' };

  app.post('/auth/login', { config: { publico: true, rateLimit: limiteLogin } }, async (req, reply) => {
    const { login, senha } = validar(loginSchema, req.body);
    const { token, usuario } = await entrar(db, login, senha, req.ip);
    reply.setCookie(NOME_COOKIE, token, {
      httpOnly: true,
      secure: config.cookieSeguro,
      sameSite: 'strict',
      path: '/',
      maxAge: DURACAO_MAXIMA_MS / 1000,
    });
    return { usuario: paraUsuarioLogado(usuario) };
  });

  app.post('/auth/logout', { config: { papeis: TODOS, liberadaComTrocaPendente: true } }, async (req, reply) => {
    await sair(db, req.usuario!, req.ip);
    reply.clearCookie(NOME_COOKIE, { path: '/' });
    return reply.status(204).send();
  });

  app.post(
    '/auth/trocar-senha',
    { config: { papeis: TODOS, liberadaComTrocaPendente: true, rateLimit: limiteLogin } },
    async (req, reply) => {
      const { senhaAtual, novaSenha } = validar(trocarSenhaSchema, req.body);
      await trocarSenha(db, req.usuario!, senhaAtual, novaSenha, req.ip);
      return reply.status(204).send();
    },
  );

  app.get('/me', { config: { papeis: TODOS, liberadaComTrocaPendente: true } }, async (req) => paraUsuarioLogado(req.usuario!));
};
