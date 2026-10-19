import {
  type MetaDTO,
  type Pagina,
  type StatusMeta,
  type TransacaoDTO,
  percentualArrecadado,
  quantoFalta,
} from '@saturbank/shared';
import { sql } from 'kysely';
import type { Db } from '../db/conexao';
import type { Transacao } from '../db/transacao';
import { ErroApp, naoEncontrado, proibido } from '../erros';

type Conexao = Db | Transacao;

export function consultaMetas(db: Conexao) {
  return db
    .selectFrom('meta')
    .innerJoin('itemCatalogo', 'itemCatalogo.id', 'meta.itemId')
    .select([
      'meta.id',
      'meta.turmaId',
      'meta.titulo',
      'itemCatalogo.icone',
      'meta.valorAlvo',
      'meta.arrecadado',
      'meta.status',
      'meta.criadaEm',
    ]);
}

export function paraMetaDTO(m: {
  id: string;
  titulo: string;
  icone: string;
  valorAlvo: number;
  arrecadado: number;
  status: StatusMeta;
  criadaEm: Date;
}): MetaDTO {
  return {
    id: m.id,
    titulo: m.titulo,
    icone: m.icone,
    valorAlvo: m.valorAlvo,
    arrecadado: m.arrecadado,
    falta: quantoFalta(m),
    percentual: percentualArrecadado(m),
    status: m.status,
    criadaEm: m.criadaEm.toISOString(),
  };
}

export async function metaPorId(db: Conexao, id: string): Promise<MetaDTO> {
  const m = await consultaMetas(db).where('meta.id', '=', id).executeTakeFirst();
  if (!m) throw naoEncontrado();
  return paraMetaDTO(m);
}

/** Metas visíveis de uma turma: abertas primeiro, sem as canceladas. */
export async function metasDaTurma(db: Db, turmaId: string): Promise<MetaDTO[]> {
  const metas = await consultaMetas(db)
    .where('meta.turmaId', '=', turmaId)
    .where('meta.status', '<>', 'CANCELADA')
    .orderBy(sql`meta.status = 'ABERTA'`, 'desc')
    .orderBy('meta.criadaEm', 'desc')
    .execute();
  return metas.map(paraMetaDTO);
}

const TAMANHO_PAGINA = 20;
const CURSOR = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z)\|([0-9a-f-]{36})$/;

function lerCursor(cursor: unknown): { data: string; id: string } | null {
  if (cursor === undefined || cursor === '') return null;
  const texto = typeof cursor === 'string' && cursor.length < 200 ? Buffer.from(cursor, 'base64url').toString() : '';
  const m = CURSOR.exec(texto);
  if (!m) throw new ErroApp(422, 'ENTRADA_INVALIDA', { campos: ['cursor'] });
  return { data: m[1]!, id: m[2]! };
}

export async function extrato(db: Db, alunoId: string, cursorBruto: unknown): Promise<Pagina<TransacaoDTO>> {
  const cursor = lerCursor(cursorBruto);
  let q = db
    .selectFrom('transacao as t')
    .innerJoin('usuario as autor', 'autor.id', 't.autorId')
    .leftJoin('meta as m', 'm.id', 't.metaId')
    .select([
      't.id',
      't.tipo',
      't.valor',
      't.descricao',
      't.criadaEm',
      'autor.nome as autor',
      'm.titulo as meta',
      // Microssegundos completos no cursor para a paginação não pular nem repetir linhas.
      sql<string>`to_char(t.criada_em AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`.as('cursorData'),
    ])
    .where('t.alunoId', '=', alunoId)
    .orderBy('t.criadaEm', 'desc')
    .orderBy('t.id', 'desc')
    .limit(TAMANHO_PAGINA + 1);
  if (cursor) q = q.where(sql<boolean>`(t.criada_em, t.id) < (${cursor.data}::timestamptz, ${cursor.id}::uuid)`);
  const linhas = await q.execute();
  const temMais = linhas.length > TAMANHO_PAGINA;
  const pagina = linhas.slice(0, TAMANHO_PAGINA);
  const ultima = pagina.at(-1);
  return {
    itens: pagina.map((t) => ({
      id: t.id,
      tipo: t.tipo,
      valor: t.valor,
      descricao: t.descricao,
      autor: t.autor,
      meta: t.meta,
      criadaEm: t.criadaEm.toISOString(),
    })),
    proximoCursor: temMais && ultima ? Buffer.from(`${ultima.cursorData}|${ultima.id}`).toString('base64url') : null,
  };
}

// ---------- autorização por recurso ----------

export async function professorDaTurma(db: Conexao, professorId: string, turmaId: string): Promise<boolean> {
  const v = await db
    .selectFrom('professorTurma')
    .select('turmaId')
    .where('professorId', '=', professorId)
    .where('turmaId', '=', turmaId)
    .executeTakeFirst();
  return v !== undefined;
}

export async function exigirProfessorDaTurma(db: Conexao, professorId: string, turmaId: string): Promise<void> {
  if (!(await professorDaTurma(db, professorId, turmaId))) throw proibido();
}

/** Aluno visível para o professor: 404 se não existe, 403 se é de turma alheia. */
export async function alunoDoProfessor(db: Conexao, professorId: string, alunoId: string) {
  const aluno = await db
    .selectFrom('usuario')
    .select(['id', 'nome', 'login as matricula', 'saldo', 'turmaId'])
    .where('id', '=', alunoId)
    .where('papel', '=', 'ALUNO')
    .executeTakeFirst();
  if (!aluno || !aluno.turmaId) throw naoEncontrado();
  await exigirProfessorDaTurma(db, professorId, aluno.turmaId);
  return aluno;
}
