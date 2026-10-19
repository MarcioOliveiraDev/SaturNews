import { sql } from 'kysely';
import { describe, expect, it } from 'vitest';
import { chamar, criarAdmin, criarAluno, criarMeta, criarProfessor, criarTurma, entrar, usarAmbiente } from './helpers';

const amb = usarAmbiente();

describe('ledger', () => {
  it('saldo de cada aluno e arrecadado de cada meta são iguais à soma do ledger', async () => {
    const turma = await criarTurma(amb.db, '6º A', 2026);
    const prof = await criarProfessor(amb.db, [turma.id], { login: 'prof.marta' });
    const sp = await entrar(amb.app, 'prof.marta');
    const alunos = [];
    for (let i = 0; i < 4; i++) alunos.push(await criarAluno(amb.db, turma.id, { login: `20260${i}` }));
    const m1 = await criarMeta(amb.db, turma.id, prof.id, 60);
    const m2 = await criarMeta(amb.db, turma.id, prof.id, 500);

    await chamar(amb.app, sp, 'POST', '/depositos/lote', { turmaId: turma.id, todos: true, valor: 40, descricao: 'x' });
    for (const a of alunos) {
      const s = await entrar(amb.app, a.login);
      await chamar(amb.app, s, 'POST', `/metas/${m1.id}/contribuicoes`, { valor: 20 });
      await chamar(amb.app, s, 'POST', `/metas/${m2.id}/contribuicoes`, { valor: 10 });
    }
    await chamar(amb.app, sp, 'POST', `/metas/${m2.id}/cancelar`);
    await chamar(amb.app, sp, 'POST', '/depositos', { alunoId: alunos[0]!.id, valor: 30, descricao: 'x' });
    const admin = await criarAdmin(amb.db);
    await chamar(amb.app, await entrar(amb.app, admin.login), 'POST', '/admin/encerrar-ano', { confirmacao: 'ENCERRAR 2026' });

    const divergentesAlunos = await sql<{ id: string }>`
      SELECT u.id FROM usuario u
      LEFT JOIN transacao t ON t.aluno_id = u.id
      WHERE u.papel = 'ALUNO'
      GROUP BY u.id, u.saldo
      HAVING u.saldo <> COALESCE(SUM(CASE WHEN t.tipo IN ('DEPOSITO', 'ESTORNO') THEN t.valor ELSE -t.valor END), 0)
    `.execute(amb.db);
    const divergentesMetas = await sql<{ id: string }>`
      SELECT m.id FROM meta m
      LEFT JOIN transacao t ON t.meta_id = m.id
      GROUP BY m.id, m.arrecadado
      HAVING m.arrecadado <> COALESCE(SUM(CASE WHEN t.tipo = 'CONTRIBUICAO' THEN t.valor ELSE -t.valor END), 0)
    `.execute(amb.db);

    expect(divergentesAlunos.rows).toEqual([]);
    expect(divergentesMetas.rows).toEqual([]);
    expect((await amb.db.selectFrom('transacao').select('tipo').distinct().execute()).map((t) => t.tipo).sort()).toEqual(
      ['CONTRIBUICAO', 'DEPOSITO', 'ESTORNO', 'ZERAMENTO'],
    );
  });

  it('transações e auditoria não podem ser alteradas nem apagadas (OWASP A08)', async () => {
    const turma = await criarTurma(amb.db);
    const aluno = await criarAluno(amb.db, turma.id);
    await criarProfessor(amb.db, [turma.id], { login: 'prof.marta' });
    const sp = await entrar(amb.app, 'prof.marta');
    await chamar(amb.app, sp, 'POST', '/depositos', { alunoId: aluno.id, valor: 5, descricao: 'x' });

    await expect(amb.db.updateTable('transacao').set({ valor: 999 }).execute()).rejects.toThrow(/somente inserção/);
    await expect(amb.db.deleteFrom('transacao').execute()).rejects.toThrow(/somente inserção/);
    await expect(amb.db.updateTable('auditoria').set({ acao: 'X' }).execute()).rejects.toThrow(/somente inserção/);
    await expect(amb.db.deleteFrom('auditoria').execute()).rejects.toThrow(/somente inserção/);
  });
});
