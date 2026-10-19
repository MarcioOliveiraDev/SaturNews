import { parse } from 'csv-parse/sync';
import { sql } from 'kysely';
import { z } from 'zod';
import type { Db } from '../db/conexao';
import { emTransacao } from '../db/transacao';
import { ErroApp, entradaInvalida, naoEncontrado } from '../erros';
import { registrarAuditoria } from './auditoria';
import { cancelarMetaBloqueada } from './metas';
import { gerarHash, gerarSenhaTemporaria } from './senhas';

// ---------- importação de alunos ----------

const COLUNAS = ['matricula', 'nome', 'turma', 'ano_letivo'] as const;
// Recusa conteúdo que planilhas interpretariam como fórmula (CSV injection).
const semFormula = (v: string) => !/^[=+\-@\t\r]/.test(v);

const linhaSchema = z.object({
  matricula: z.string().regex(/^\d{4,20}$/, 'matrícula deve ter só números (4 a 20)'),
  nome: z.string().min(1, 'nome obrigatório').max(120).refine(semFormula, 'nome inválido'),
  turma: z.string().min(1, 'turma obrigatória').max(40).refine(semFormula, 'turma inválida'),
  ano_letivo: z.coerce.number().int().min(2000).max(2100),
});

type Linha = z.infer<typeof linhaSchema>;

export function lerCsvAlunos(csv: string): { alunos: Linha[]; erros: { linha: number; mensagem: string }[] } {
  let registros: { record: Record<string, string>; info: { lines: number } }[];
  try {
    registros = parse(csv, {
      columns: (cab: string[]) => cab.map((c) => c.trim().toLowerCase()),
      bom: true,
      trim: true,
      skip_empty_lines: true,
      info: true,
      relax_column_count: true,
    });
  } catch {
    throw entradaInvalida({ erros: [{ linha: 0, mensagem: 'CSV malformado' }] });
  }
  const cabecalho = registros[0] ? Object.keys(registros[0].record) : csv.split(/\r?\n/, 1)[0]!.toLowerCase().split(',');
  const faltando = COLUNAS.filter((c) => !cabecalho.includes(c));
  if (faltando.length) {
    throw entradaInvalida({ erros: [{ linha: 1, mensagem: `colunas obrigatórias: ${COLUNAS.join(', ')}` }] });
  }

  const alunos: Linha[] = [];
  const erros: { linha: number; mensagem: string }[] = [];
  const vistas = new Set<string>();
  for (const { record, info } of registros) {
    const r = linhaSchema.safeParse(record);
    if (!r.success) {
      erros.push({ linha: info.lines, mensagem: r.error.issues.map((i) => i.message).join('; ') });
    } else if (vistas.has(r.data.matricula)) {
      erros.push({ linha: info.lines, mensagem: `matrícula ${r.data.matricula} repetida` });
    } else {
      vistas.add(r.data.matricula);
      alunos.push(r.data);
    }
  }
  if (alunos.length + erros.length === 0) erros.push({ linha: 1, mensagem: 'nenhum aluno no arquivo' });
  return { alunos, erros };
}

export async function importarAlunos(db: Db, csv: string, simular: boolean, ctx: { adminId: string; ip: string }) {
  const { alunos, erros } = lerCsvAlunos(csv);
  if (erros.length) throw entradaInvalida({ erros });

  const existentes = new Map(
    (
      await db
        .selectFrom('usuario')
        .select(['login', 'papel'])
        .where(
          'login',
          'in',
          alunos.map((a) => a.matricula),
        )
        .execute()
    ).map((u) => [u.login, u.papel]),
  );
  const conflitos = alunos.filter((a) => existentes.has(a.matricula) && existentes.get(a.matricula) !== 'ALUNO');
  if (conflitos.length) {
    throw entradaInvalida({ erros: conflitos.map((a) => ({ linha: 0, mensagem: `login ${a.matricula} já usado por outro usuário` })) });
  }

  if (simular) {
    return {
      simulacao: true,
      erros: [],
      alunos: alunos.map((a) => ({ matricula: a.matricula, nome: a.nome, turma: a.turma, anoLetivo: a.ano_letivo, existente: existentes.has(a.matricula) })),
    };
  }

  // Hash fora da transação: é a parte lenta e não precisa de bloqueio.
  const senhas = new Map<string, { senha: string; hash: string }>();
  for (const a of alunos) {
    if (!existentes.has(a.matricula)) {
      const senha = gerarSenhaTemporaria();
      senhas.set(a.matricula, { senha, hash: await gerarHash(senha) });
    }
  }

  return emTransacao(db, async (trx) => {
    const turmas = new Map<string, string>();
    for (const a of alunos) {
      const chave = `${a.turma}|${a.ano_letivo}`;
      if (turmas.has(chave)) continue;
      const t = await trx
        .insertInto('turma')
        .values({ nome: a.turma, anoLetivo: a.ano_letivo })
        .onConflict((oc) => oc.columns(['nome', 'anoLetivo']).doUpdateSet({ ativa: true }))
        .returning('id')
        .executeTakeFirstOrThrow();
      turmas.set(chave, t.id);
    }
    const resultado = [];
    for (const a of alunos) {
      const turmaId = turmas.get(`${a.turma}|${a.ano_letivo}`)!;
      const nova = senhas.get(a.matricula);
      if (nova) {
        await trx
          .insertInto('usuario')
          .values({ nome: a.nome, login: a.matricula, senhaHash: nova.hash, papel: 'ALUNO', turmaId, trocarSenha: true })
          .execute();
      } else {
        await trx.updateTable('usuario').set({ nome: a.nome, turmaId, ativo: true }).where('login', '=', a.matricula).execute();
      }
      resultado.push({ matricula: a.matricula, nome: a.nome, turma: a.turma, senhaTemporaria: nova?.senha ?? null, atualizado: !nova });
    }
    await registrarAuditoria(trx, {
      usuarioId: ctx.adminId,
      acao: 'IMPORTACAO_ALUNOS',
      ip: ctx.ip,
      resultado: 'SUCESSO',
      detalhes: { criados: senhas.size, atualizados: alunos.length - senhas.size },
    });
    return { simulacao: false, erros: [], alunos: resultado };
  });
}

// ---------- usuários ----------

export async function redefinirSenha(db: Db, usuarioId: string, ctx: { adminId: string; ip: string }) {
  const senhaTemporaria = gerarSenhaTemporaria();
  const senhaHash = await gerarHash(senhaTemporaria);
  await emTransacao(db, async (trx) => {
    const u = await trx
      .updateTable('usuario')
      .set({ senhaHash, trocarSenha: true, tentativasFalhas: 0, bloqueadoAte: null })
      .where('id', '=', usuarioId)
      .where('papel', '<>', 'ADMIN')
      .returning('id')
      .executeTakeFirst();
    if (!u) throw naoEncontrado();
    await trx.deleteFrom('sessao').where('usuarioId', '=', usuarioId).execute();
    await registrarAuditoria(trx, { usuarioId: ctx.adminId, acao: 'REDEFINIR_SENHA', alvo: usuarioId, ip: ctx.ip, resultado: 'SUCESSO' });
  });
  return { senhaTemporaria };
}

export async function buscarAlunos(db: Db, busca: string) {
  const termo = busca.trim().slice(0, 60).replace(/[\\%_]/g, (c) => `\\${c}`);
  return db
    .selectFrom('usuario')
    .innerJoin('turma', 'turma.id', 'usuario.turmaId')
    .select(['usuario.id', 'usuario.nome', 'usuario.login as matricula', 'turma.nome as turma', 'usuario.saldo', 'usuario.ativo'])
    .where('usuario.papel', '=', 'ALUNO')
    .where((eb) => eb.or([eb('usuario.nome', 'ilike', `%${termo}%`), eb('usuario.login', 'like', `${termo}%`)]))
    .orderBy('usuario.nome')
    .limit(50)
    .execute();
}

// ---------- encerramento do ano letivo ----------

export async function encerrarAno(db: Db, confirmacao: string, ctx: { adminId: string; ip: string }) {
  const m = /^ENCERRAR (\d{4})$/.exec(confirmacao.trim());
  if (!m) throw entradaInvalida({ mensagens: ['Digite ENCERRAR seguido do ano, por exemplo: ENCERRAR 2026'] });
  const ano = Number(m[1]);

  return emTransacao(db, async (trx) => {
    const turmas = await trx.selectFrom('turma').select('id').where('anoLetivo', '=', ano).execute();
    if (!turmas.length) throw entradaInvalida({ mensagens: [`Nenhuma turma no ano ${ano}`] });
    const registrado = await trx
      .insertInto('encerramentoAno')
      .values({ ano, executadoPorId: ctx.adminId })
      .onConflict((oc) => oc.column('ano').doNothing())
      .returning('ano')
      .executeTakeFirst();
    if (!registrado) throw new ErroApp(409, 'ESTADO_INVALIDO', { mensagens: [`O ano ${ano} já foi encerrado`] });
    const turmaIds = turmas.map((t) => t.id);

    const abertas = await trx
      .selectFrom('meta')
      .select(['id', 'titulo'])
      .where('turmaId', 'in', turmaIds)
      .where('status', '=', 'ABERTA')
      .orderBy('id')
      .forUpdate()
      .execute();
    for (const meta of abertas) await cancelarMetaBloqueada(trx, meta, ctx.adminId);

    const comSaldo = await trx
      .selectFrom('usuario')
      .select(['id', 'saldo'])
      .where('turmaId', 'in', turmaIds)
      .where('papel', '=', 'ALUNO')
      .where('saldo', '>', 0)
      .orderBy('id')
      .forUpdate()
      .execute();
    if (comSaldo.length) {
      await trx
        .insertInto('transacao')
        .values(
          comSaldo.map((a) => ({
            tipo: 'ZERAMENTO' as const,
            valor: a.saldo,
            alunoId: a.id,
            autorId: ctx.adminId,
            descricao: `Encerramento do ano letivo ${ano}`,
          })),
        )
        .execute();
      await trx.updateTable('usuario').set({ saldo: 0 }).where('id', 'in', comSaldo.map((a) => a.id)).execute();
    }
    await trx.updateTable('turma').set({ ativa: false }).where('id', 'in', turmaIds).execute();
    const resumo = { ano, metasCanceladas: abertas.length, saldosZerados: comSaldo.length };
    await registrarAuditoria(trx, { usuarioId: ctx.adminId, acao: 'ENCERRAR_ANO', ip: ctx.ip, resultado: 'SUCESSO', detalhes: resumo });
    return resumo;
  });
}

// ---------- auditoria ----------

export async function listarAuditoria(db: Db, antesDe: unknown) {
  const cursor = typeof antesDe === 'string' && /^\d{1,18}$/.test(antesDe) ? antesDe : undefined;
  if (antesDe !== undefined && antesDe !== '' && !cursor) throw entradaInvalida({ campos: ['cursor'] });
  let q = db
    .selectFrom('auditoria as a')
    .leftJoin('usuario as u', 'u.id', 'a.usuarioId')
    .select(['a.id', 'a.acao', 'a.alvo', 'a.ip', 'a.resultado', 'a.detalhes', 'a.criadaEm', 'u.nome as usuario'])
    .orderBy('a.id', 'desc')
    .limit(51);
  if (cursor) q = q.where('a.id', '<', sql<string>`${cursor}::bigint`);
  const linhas = await q.execute();
  const itens = linhas.slice(0, 50).map((l) => ({ ...l, criadaEm: l.criadaEm.toISOString() }));
  return { itens, proximoCursor: linhas.length > 50 ? itens.at(-1)!.id : null };
}
