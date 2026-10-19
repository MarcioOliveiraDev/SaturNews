import { hash } from '@node-rs/argon2';
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from 'fastify';
import { sql } from 'kysely';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { construirApp, type OpcoesApp } from '../src/app';
import type { Config } from '../src/config';
import { type Db, criarDb } from '../src/db/conexao';
import { urlBancoTeste } from './url';

export const SENHA = 'Senha-Teste-123';
let hashSenha: string | undefined;

export const configTeste = (extra: Partial<Config> = {}): Config => ({
  ambiente: 'test',
  porta: 0,
  databaseUrl: urlBancoTeste(),
  confiarProxy: false,
  cookieSeguro: false,
  limiteRequisicoesLogin: 1000,
  limiteRequisicoesGlobal: 10_000,
  ...extra,
});

export interface Ambiente {
  app: FastifyInstance;
  db: Db;
}

/** Sobe a app com banco real e limpa todas as tabelas antes de cada teste. */
export function usarAmbiente(config: Partial<Config> = {}, opcoes: Partial<OpcoesApp> = {}): Ambiente {
  const amb = {} as Ambiente;
  beforeAll(async () => {
    hashSenha ??= await hash(SENHA);
    amb.db = criarDb(urlBancoTeste());
    amb.app = await construirApp({ config: configTeste(config), db: amb.db, ...opcoes });
  });
  beforeEach(async () => {
    await sql`TRUNCATE turma, usuario, professor_turma, item_catalogo, meta, lote_deposito, transacao,
      sugestao, idempotencia, auditoria, sessao, encerramento_ano RESTART IDENTITY CASCADE`.execute(amb.db);
  });
  afterAll(async () => {
    await amb.app?.close();
    await amb.db?.destroy();
  });
  return amb;
}

// ---------- fábricas ----------

let seq = 0;
const proximo = () => ++seq;

export async function criarTurma(db: Db, nome = `${proximo()}º A`, anoLetivo = 2026) {
  return db.insertInto('turma').values({ nome, anoLetivo }).returningAll().executeTakeFirstOrThrow();
}

export async function criarAluno(
  db: Db,
  turmaId: string,
  dados: { nome?: string; saldo?: number; trocarSenha?: boolean; login?: string } = {},
) {
  const n = proximo();
  return db
    .insertInto('usuario')
    .values({
      nome: dados.nome ?? `Aluno ${n}`,
      login: dados.login ?? `9${String(n).padStart(6, '0')}`,
      senhaHash: hashSenha!,
      papel: 'ALUNO',
      turmaId,
      saldo: dados.saldo ?? 0,
      trocarSenha: dados.trocarSenha ?? false,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function criarProfessor(db: Db, turmaIds: string[], dados: { login?: string } = {}) {
  const n = proximo();
  const prof = await db
    .insertInto('usuario')
    .values({ nome: `Professor ${n}`, login: dados.login ?? `prof.${n}`, senhaHash: hashSenha!, papel: 'PROFESSOR', trocarSenha: false })
    .returningAll()
    .executeTakeFirstOrThrow();
  if (turmaIds.length)
    await db.insertInto('professorTurma').values(turmaIds.map((turmaId) => ({ professorId: prof.id, turmaId }))).execute();
  return prof;
}

export async function criarAdmin(db: Db) {
  return db
    .insertInto('usuario')
    .values({ nome: 'Coordenação', login: `admin.${proximo()}`, senhaHash: hashSenha!, papel: 'ADMIN', trocarSenha: false })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function criarItem(db: Db, nome = `Item ${proximo()}`, precoSugerido = 200) {
  return db
    .insertInto('itemCatalogo')
    .values({ nome, descricao: `Descrição de ${nome}`, icone: 'film', precoSugerido })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function criarMeta(db: Db, turmaId: string, criadaPorId: string, valorAlvo = 100, arrecadado = 0) {
  const item = await criarItem(db);
  return db
    .insertInto('meta')
    .values({ turmaId, itemId: item.id, titulo: item.nome, valorAlvo, arrecadado, criadaPorId })
    .returningAll()
    .executeTakeFirstOrThrow();
}

// ---------- sessão HTTP ----------

export interface Sessao {
  cookie: string;
  csrf: string;
  usuarioId: string;
}

export async function entrar(app: FastifyInstance, login: string, senha = SENHA): Promise<Sessao> {
  const r = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { login, senha } });
  if (r.statusCode !== 200) throw new Error(`login falhou (${r.statusCode}): ${r.body}`);
  const cookie = r.cookies.find((c) => c.name === 'sb_sessao')!;
  const usuario = r.json().usuario;
  return { cookie: `sb_sessao=${cookie.value}`, csrf: usuario.csrfToken, usuarioId: usuario.id };
}

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export function chamar(
  app: FastifyInstance,
  sessao: Sessao | null,
  method: Metodo,
  url: string,
  payload?: unknown,
  headers: Record<string, string> = {},
): Promise<LightMyRequestResponse> {
  const h: Record<string, string> = { ...headers };
  if (sessao) {
    h.cookie = sessao.cookie;
    if (method !== 'GET') h['x-csrf-token'] ??= sessao.csrf;
  }
  const opts: InjectOptions = { method, url: `/api/v1${url}`, headers: h };
  if (payload !== undefined) opts.payload = payload as InjectOptions['payload'];
  return app.inject(opts);
}

export async function saldoDe(db: Db, alunoId: string): Promise<number> {
  const r = await db.selectFrom('usuario').select('saldo').where('id', '=', alunoId).executeTakeFirstOrThrow();
  return r.saldo;
}
