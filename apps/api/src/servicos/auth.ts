import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Papel, UsuarioLogado } from '@saturbank/shared';
import type { Db } from '../db/conexao';
import { ErroApp } from '../erros';
import { registrarAuditoria } from './auditoria';
import { conferirSenha, gerarHash } from './senhas';

export const NOME_COOKIE = 'sb_sessao';
export const INATIVIDADE_MS = 30 * 60_000;
export const DURACAO_MAXIMA_MS = 8 * 60 * 60_000;
const MAX_FALHAS = 5;
const BLOQUEIO_MS = 15 * 60_000;

export interface UsuarioSessao {
  id: string;
  nome: string;
  papel: Papel;
  turmaId: string | null;
  turmaNome: string | null;
  trocarSenha: boolean;
  csrfToken: string;
  idHash: string;
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const tokenAleatorio = () => randomBytes(32).toString('base64url');

export const normalizarLogin = (login: string) => login.trim().toLowerCase();

export function paraUsuarioLogado(u: UsuarioSessao): UsuarioLogado {
  return {
    id: u.id,
    nome: u.nome,
    papel: u.papel,
    turma: u.turmaId && u.turmaNome ? { id: u.turmaId, nome: u.turmaNome } : null,
    trocarSenha: u.trocarSenha,
    csrfToken: u.csrfToken,
  };
}

async function criarSessao(db: Db, usuarioId: string): Promise<{ token: string; csrfToken: string }> {
  const token = tokenAleatorio();
  const csrfToken = tokenAleatorio();
  const agora = Date.now();
  await db.deleteFrom('sessao').where('usuarioId', '=', usuarioId).where('expiraEm', '<', new Date(agora)).execute();
  await db
    .insertInto('sessao')
    .values({
      idHash: hashToken(token),
      usuarioId,
      csrfToken,
      ultimoAcesso: new Date(agora),
      expiraEm: new Date(agora + DURACAO_MAXIMA_MS),
    })
    .execute();
  return { token, csrfToken };
}

export async function entrar(db: Db, login: string, senha: string, ip: string) {
  const loginNormalizado = normalizarLogin(login);
  const u = await db
    .selectFrom('usuario')
    .leftJoin('turma', 'turma.id', 'usuario.turmaId')
    .select([
      'usuario.id',
      'usuario.nome',
      'usuario.papel',
      'usuario.turmaId',
      'turma.nome as turmaNome',
      'usuario.senhaHash',
      'usuario.ativo',
      'usuario.trocarSenha',
      'usuario.bloqueadoAte',
    ])
    .where('usuario.login', '=', loginNormalizado)
    .executeTakeFirst();

  const falhar = async (motivo: string, erro = new ErroApp(401, 'CREDENCIAIS_INVALIDAS')) => {
    await registrarAuditoria(db, {
      usuarioId: u?.id ?? null,
      acao: 'LOGIN',
      ip,
      resultado: 'FALHA',
      detalhes: { login: loginNormalizado.slice(0, 64), motivo },
    });
    return erro;
  };

  if (u?.bloqueadoAte && u.bloqueadoAte.getTime() > Date.now()) {
    throw await falhar('bloqueado', new ErroApp(429, 'CONTA_BLOQUEADA'));
  }
  const senhaOk = await conferirSenha(u?.ativo ? u.senhaHash : undefined, senha);
  if (!u || !u.ativo) throw await falhar('usuario');
  if (!senhaOk) {
    const { tentativasFalhas } = await db
      .updateTable('usuario')
      .set((eb) => ({ tentativasFalhas: eb('tentativasFalhas', '+', 1) }))
      .where('id', '=', u.id)
      .returning('tentativasFalhas')
      .executeTakeFirstOrThrow();
    if (tentativasFalhas >= MAX_FALHAS) {
      await db
        .updateTable('usuario')
        .set({ tentativasFalhas: 0, bloqueadoAte: new Date(Date.now() + BLOQUEIO_MS) })
        .where('id', '=', u.id)
        .execute();
    }
    throw await falhar('senha');
  }

  await db.updateTable('usuario').set({ tentativasFalhas: 0, bloqueadoAte: null }).where('id', '=', u.id).execute();
  const { token, csrfToken } = await criarSessao(db, u.id);
  await registrarAuditoria(db, { usuarioId: u.id, acao: 'LOGIN', ip, resultado: 'SUCESSO' });
  const usuario: UsuarioSessao = {
    id: u.id,
    nome: u.nome,
    papel: u.papel,
    turmaId: u.turmaId,
    turmaNome: u.turmaNome,
    trocarSenha: u.trocarSenha,
    csrfToken,
    idHash: hashToken(token),
  };
  return { token, usuario };
}

export async function carregarSessao(db: Db, token: string | undefined): Promise<UsuarioSessao | null> {
  if (!token || token.length > 128) return null;
  const idHash = hashToken(token);
  const agora = Date.now();
  const s = await db
    .selectFrom('sessao')
    .innerJoin('usuario', 'usuario.id', 'sessao.usuarioId')
    .leftJoin('turma', 'turma.id', 'usuario.turmaId')
    .select([
      'usuario.id',
      'usuario.nome',
      'usuario.papel',
      'usuario.turmaId',
      'turma.nome as turmaNome',
      'usuario.trocarSenha',
      'sessao.csrfToken',
      'sessao.ultimoAcesso',
    ])
    .where('sessao.idHash', '=', idHash)
    .where('sessao.expiraEm', '>', new Date(agora))
    .where('sessao.ultimoAcesso', '>', new Date(agora - INATIVIDADE_MS))
    .where('usuario.ativo', '=', true)
    .executeTakeFirst();
  if (!s) return null;
  // Renova a janela de inatividade no máximo uma vez por minuto.
  if (agora - s.ultimoAcesso.getTime() > 60_000) {
    await db.updateTable('sessao').set({ ultimoAcesso: new Date(agora) }).where('idHash', '=', idHash).execute();
  }
  const { ultimoAcesso: _u, ...resto } = s;
  return { ...resto, idHash };
}

export function csrfValido(esperado: string, recebido: unknown): boolean {
  if (typeof recebido !== 'string' || recebido.length !== esperado.length) return false;
  return timingSafeEqual(Buffer.from(esperado), Buffer.from(recebido));
}

export async function sair(db: Db, usuario: UsuarioSessao, ip: string): Promise<void> {
  await db.deleteFrom('sessao').where('idHash', '=', usuario.idHash).execute();
  await registrarAuditoria(db, { usuarioId: usuario.id, acao: 'LOGOUT', ip, resultado: 'SUCESSO' });
}

export async function trocarSenha(db: Db, usuario: UsuarioSessao, senhaAtual: string, novaSenha: string, ip: string) {
  const { senhaHash } = await db.selectFrom('usuario').select('senhaHash').where('id', '=', usuario.id).executeTakeFirstOrThrow();
  if (!(await conferirSenha(senhaHash, senhaAtual))) {
    await registrarAuditoria(db, { usuarioId: usuario.id, acao: 'TROCA_SENHA', ip, resultado: 'FALHA' });
    throw new ErroApp(401, 'CREDENCIAIS_INVALIDAS');
  }
  const novoHash = await gerarHash(novaSenha);
  await db.transaction().execute(async (trx) => {
    await trx.updateTable('usuario').set({ senhaHash: novoHash, trocarSenha: false }).where('id', '=', usuario.id).execute();
    // Encerra as outras sessões (ex.: um computador esquecido logado).
    await trx.deleteFrom('sessao').where('usuarioId', '=', usuario.id).where('idHash', '<>', usuario.idHash).execute();
    await registrarAuditoria(trx, { usuarioId: usuario.id, acao: 'TROCA_SENHA', ip, resultado: 'SUCESSO' });
  });
}
