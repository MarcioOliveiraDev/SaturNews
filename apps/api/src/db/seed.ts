import { parse } from 'csv-parse/sync';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { carregarConfig } from '../config';
import { gerarHash } from '../servicos/senhas';
import { criarDb } from './conexao';
import { migrarParaUltima } from './migrador';

/** Dados fictícios para desenvolvimento. Nunca rodar em produção. */
const config = carregarConfig();
if (config.ambiente === 'production') {
  console.error('O seed de dados fictícios não pode rodar em produção.');
  process.exit(1);
}

const SENHA_DEV = 'Saturno2026!';
const dados = (arquivo: string) =>
  parse(readFileSync(fileURLToPath(new URL(`../../../../docs/dados/${arquivo}`, import.meta.url))), {
    columns: true,
    bom: true,
    trim: true,
  }) as Record<string, string>[];

const db = criarDb(config.databaseUrl);
try {
  await migrarParaUltima(db);
  const senhaHash = await gerarHash(SENHA_DEV);
  const turmas = new Map<string, string>();
  const turma = async (nome: string, ano: number) => {
    if (!turmas.has(nome)) {
      const t = await db
        .insertInto('turma')
        .values({ nome, anoLetivo: ano })
        .onConflict((oc) => oc.columns(['nome', 'anoLetivo']).doUpdateSet({ ativa: true }))
        .returning('id')
        .executeTakeFirstOrThrow();
      turmas.set(nome, t.id);
    }
    return turmas.get(nome)!;
  };

  for (const a of dados('alunos-ficticios.csv')) {
    await db
      .insertInto('usuario')
      .values({ nome: a.nome!, login: a.matricula!, senhaHash, papel: 'ALUNO', turmaId: await turma(a.turma!, Number(a.ano_letivo)), trocarSenha: false })
      .onConflict((oc) => oc.column('login').doNothing())
      .execute();
  }
  for (const p of dados('professores-ficticios.csv')) {
    const prof = await db
      .insertInto('usuario')
      .values({ nome: p.nome!, login: p.login!, senhaHash, papel: 'PROFESSOR', trocarSenha: false })
      .onConflict((oc) => oc.column('login').doUpdateSet({ nome: p.nome! }))
      .returning('id')
      .executeTakeFirstOrThrow();
    for (const nome of p.turmas!.split(';')) {
      await db
        .insertInto('professorTurma')
        .values({ professorId: prof.id, turmaId: await turma(nome.trim(), 2026) })
        .onConflict((oc) => oc.doNothing())
        .execute();
    }
  }
  await db
    .insertInto('usuario')
    .values({ nome: 'Coordenação', login: 'admin', senhaHash, papel: 'ADMIN', trocarSenha: false })
    .onConflict((oc) => oc.column('login').doNothing())
    .execute();
  console.log(`Seed concluído. Senha de todos os usuários fictícios: ${SENHA_DEV}`);
} finally {
  await db.destroy();
}
