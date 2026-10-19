import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance } from 'fastify';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Config } from './config';
import type { Db } from './db/conexao';
import { ErroApp } from './erros';
import { registrarControleDeAcesso } from './plugins/acesso';
import { enviarProblema, registrarTratamentoDeErros } from './plugins/erros';
import { rotasAdmin } from './rotas/admin';
import { rotasAluno } from './rotas/aluno';
import { rotasAuth } from './rotas/auth';
import { rotasProfessor } from './rotas/professor';

export interface OpcoesApp {
  config: Config;
  db: Db;
  /** Gancho para testes registrarem rotas extras. */
  aoRegistrar?: (app: FastifyInstance) => void;
}

export async function construirApp({ config, db, aoRegistrar }: OpcoesApp): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      config.ambiente === 'test'
        ? false
        : { level: 'info', redact: ['req.headers.cookie', 'req.headers["x-csrf-token"]', 'res.headers["set-cookie"]'] },
    trustProxy: config.confiarProxy,
    bodyLimit: 32 * 1024,
    // Desliga parâmetros de rota longos demais e protege contra prototype pollution.
    maxParamLength: 100,
    onProtoPoisoning: 'error',
    onConstructorPoisoning: 'error',
  });

  registrarTratamentoDeErros(app, db);

  await app.register(helmet, {
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        manifestSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        ...(config.ambiente === 'production' ? { upgradeInsecureRequests: [] } : {}),
      },
    },
    hsts: { maxAge: 31_536_000, includeSubDomains: true },
    referrerPolicy: { policy: 'no-referrer' },
  });
  await app.register(cookie);
  await app.register(rateLimit, {
    global: true,
    max: config.limiteRequisicoesGlobal,
    timeWindow: '1 minute',
    errorResponseBuilder: () => new ErroApp(429, 'MUITAS_REQUISICOES'),
  });

  registrarControleDeAcesso(app, db);

  app.addHook('onSend', async (req, reply) => {
    if (req.url.startsWith('/api/')) reply.header('cache-control', 'no-store');
  });

  await app.register(
    async (api) => {
      api.get('/saude', { config: { publico: true } }, async () => {
        await db.selectNoFrom((eb) => eb.val(1).as('ok')).execute();
        return { ok: true };
      });
      await api.register(rotasAuth, { db, config });
      await api.register(rotasAluno, { db });
      await api.register(rotasProfessor, { db });
      await api.register(rotasAdmin, { db });
    },
    { prefix: '/api/v1' },
  );

  aoRegistrar?.(app);

  const webDist = config.webDist ? resolve(config.webDist) : undefined;
  // Caminho vem da configuração do servidor, não do usuário.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  if (webDist && existsSync(webDist)) {
    await app.register(fastifyStatic, { root: webDist, wildcard: false, index: ['index.html'] });
  }

  app.setNotFoundHandler(async (req, reply) => {
    // Rotas do frontend (SPA) devolvem o index.html; a API responde 404.
    const caminho = req.url.split('?')[0]!;
    if (webDist && req.method === 'GET' && !caminho.startsWith('/api/') && !/\.[a-z0-9]+$/i.test(caminho)) {
      return reply.type('text/html').sendFile('index.html');
    }
    return enviarProblema(reply, 404, 'NAO_ENCONTRADO');
  });

  await app.ready();
  return app;
}
