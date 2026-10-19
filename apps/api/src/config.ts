import { z } from 'zod';

const booleano = z.enum(['true', 'false']).transform((v) => v === 'true');

const esquema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  TRUST_PROXY: booleano.default('false'),
  WEB_DIST: z.string().optional(),
  // Por IP. Uma sala inteira costuma sair pelo mesmo IP da escola (NAT); o bloqueio
  // por conta (5 falhas) é o que barra força bruta contra um aluno específico.
  LIMITE_LOGIN_POR_MINUTO: z.coerce.number().int().positive().default(60),
});

export interface Config {
  ambiente: 'development' | 'test' | 'production';
  porta: number;
  databaseUrl: string;
  confiarProxy: boolean;
  webDist?: string;
  /** Cookie só trafega em HTTPS. Desligado apenas em desenvolvimento/teste. */
  cookieSeguro: boolean;
  limiteRequisicoesLogin: number;
  limiteRequisicoesGlobal: number;
}

/** Falha na inicialização se faltar alguma variável obrigatória (OWASP A02). */
export function carregarConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const r = esquema.safeParse(env);
  if (!r.success) {
    const campos = r.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Configuração inválida: ${campos}`);
  }
  const e = r.data;
  return {
    ambiente: e.NODE_ENV,
    porta: e.PORT,
    databaseUrl: e.DATABASE_URL,
    confiarProxy: e.TRUST_PROXY,
    webDist: e.WEB_DIST || undefined,
    cookieSeguro: e.NODE_ENV === 'production',
    limiteRequisicoesLogin: e.LIMITE_LOGIN_POR_MINUTO,
    limiteRequisicoesGlobal: 600,
  };
}
