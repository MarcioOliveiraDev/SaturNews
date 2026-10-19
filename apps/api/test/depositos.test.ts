import { sql } from 'kysely';
import { describe, expect, it } from 'vitest';
import { chamar, criarAdmin, criarAluno, criarProfessor, criarTurma, entrar, saldoDe, usarAmbiente } from './helpers';

const amb = usarAmbiente();

async function cenario() {
  const turma = await criarTurma(amb.db, '7º A');
  const outraTurma = await criarTurma(amb.db, '8º B');
  const prof = await criarProfessor(amb.db, [turma.id], { login: 'prof.marta' });
  const s = await entrar(amb.app, 'prof.marta');
  return { turma, outraTurma, prof, s };
}

describe('depósito individual', () => {
  it('professor deposita para aluno da sua turma e o extrato registra autor e descrição', async () => {
    const { turma, prof, s } = await cenario();
    const aluno = await criarAluno(amb.db, turma.id, { saldo: 20 });

    const r = await chamar(amb.app, s, 'POST', '/depositos', { alunoId: aluno.id, valor: 15, descricao: 'Feira de ciências' });

    expect(r.statusCode).toBe(201);
    expect(r.json()).toMatchObject({ saldo: 35 });
    expect(await saldoDe(amb.db, aluno.id)).toBe(35);
    const t = await amb.db.selectFrom('transacao').selectAll().executeTakeFirstOrThrow();
    expect(t).toMatchObject({ tipo: 'DEPOSITO', valor: 15, alunoId: aluno.id, autorId: prof.id, descricao: 'Feira de ciências' });
  });

  it('professor não tem limite próprio: pode fazer vários depósitos seguidos', async () => {
    const { turma, s } = await cenario();
    const alunos = await Promise.all(Array.from({ length: 5 }, () => criarAluno(amb.db, turma.id)));
    for (const a of alunos) {
      expect((await chamar(amb.app, s, 'POST', '/depositos', { alunoId: a.id, valor: 100, descricao: 'Prêmio' })).statusCode).toBe(201);
    }
  });

  it('recusa depósito que ultrapassaria o teto de S$ 100 e informa quanto cabe', async () => {
    const { turma, s } = await cenario();
    const aluno = await criarAluno(amb.db, turma.id, { saldo: 85 });

    const r = await chamar(amb.app, s, 'POST', '/depositos', { alunoId: aluno.id, valor: 20, descricao: 'x' });

    expect(r.statusCode).toBe(422);
    expect(r.json()).toMatchObject({ codigo: 'TETO_SALDO', maximo: 15 });
    expect(await saldoDe(amb.db, aluno.id)).toBe(85);
  });

  it('registra o depósito na auditoria', async () => {
    const { turma, prof, s } = await cenario();
    const aluno = await criarAluno(amb.db, turma.id);
    await chamar(amb.app, s, 'POST', '/depositos', { alunoId: aluno.id, valor: 5, descricao: 'x' });
    const a = await amb.db.selectFrom('auditoria').selectAll().where('acao', '=', 'DEPOSITO').executeTakeFirstOrThrow();
    expect(a).toMatchObject({ usuarioId: prof.id, resultado: 'SUCESSO', alvo: aluno.id });
  });

  it('aluno não pode depositar, nem para si mesmo (OWASP A01)', async () => {
    const { turma } = await cenario();
    const aluno = await criarAluno(amb.db, turma.id, { login: '2026001' });
    const sa = await entrar(amb.app, '2026001');
    const r = await chamar(amb.app, sa, 'POST', '/depositos', { alunoId: aluno.id, valor: 10, descricao: 'x' });
    expect(r.statusCode).toBe(403);
    expect(await saldoDe(amb.db, aluno.id)).toBe(0);
  });

  it('administrador não deposita (separação de funções)', async () => {
    const { turma } = await cenario();
    const aluno = await criarAluno(amb.db, turma.id);
    const admin = await criarAdmin(amb.db);
    const sa = await entrar(amb.app, admin.login);
    expect((await chamar(amb.app, sa, 'POST', '/depositos', { alunoId: aluno.id, valor: 10, descricao: 'x' })).statusCode).toBe(403);
  });

  it('professor não deposita para aluno de turma que não é dele', async () => {
    const { outraTurma, s } = await cenario();
    const aluno = await criarAluno(amb.db, outraTurma.id);
    const r = await chamar(amb.app, s, 'POST', '/depositos', { alunoId: aluno.id, valor: 10, descricao: 'x' });
    expect(r.statusCode).toBe(403);
    expect(await saldoDe(amb.db, aluno.id)).toBe(0);
  });

  it('aluno inexistente responde 404', async () => {
    const { s } = await cenario();
    const r = await chamar(amb.app, s, 'POST', '/depositos', {
      alunoId: '0f8fad5b-d9cb-469f-a165-70867728950e',
      valor: 10,
      descricao: 'x',
    });
    expect(r.statusCode).toBe(404);
  });

  it('mesma Idempotency-Key gera um único depósito e a mesma resposta (duplo clique)', async () => {
    const { turma, s } = await cenario();
    const aluno = await criarAluno(amb.db, turma.id);
    const enviar = () =>
      chamar(amb.app, s, 'POST', '/depositos', { alunoId: aluno.id, valor: 10, descricao: 'x' }, { 'idempotency-key': 'clique-123456' });

    const [a, b] = await Promise.all([enviar(), enviar()]);
    const c = await enviar();

    expect([a.statusCode, b.statusCode, c.statusCode]).toEqual([201, 201, 201]);
    expect(a.json()).toEqual(c.json());
    expect(await saldoDe(amb.db, aluno.id)).toBe(10);
    expect(await amb.db.selectFrom('transacao').select('id').execute()).toHaveLength(1);
  });

  it('recusa Idempotency-Key em formato inválido', async () => {
    const { turma, s } = await cenario();
    const aluno = await criarAluno(amb.db, turma.id);
    const r = await chamar(amb.app, s, 'POST', '/depositos', { alunoId: aluno.id, valor: 1, descricao: 'x' }, { 'idempotency-key': 'a b' });
    expect(r.statusCode).toBe(422);
  });
});

describe('depósito em lote', () => {
  it('"todos" deposita para cada aluno ativo da turma, respeitando o teto', async () => {
    const { turma, outraTurma, s } = await cenario();
    const ana = await criarAluno(amb.db, turma.id, { nome: 'Ana', saldo: 0 });
    const bia = await criarAluno(amb.db, turma.id, { nome: 'Bia', saldo: 95 });
    const caio = await criarAluno(amb.db, turma.id, { nome: 'Caio', saldo: 100 });
    const inativo = await criarAluno(amb.db, turma.id, { nome: 'Inativo' });
    await amb.db.updateTable('usuario').set({ ativo: false }).where('id', '=', inativo.id).execute();
    const deFora = await criarAluno(amb.db, outraTurma.id);

    const r = await chamar(amb.app, s, 'POST', '/depositos/lote', { turmaId: turma.id, todos: true, valor: 10, descricao: 'Gincana' });

    expect(r.statusCode).toBe(201);
    expect(r.json()).toMatchObject({
      total: 15,
      itens: [
        { alunoId: ana.id, nome: 'Ana', credito: 10 },
        { alunoId: bia.id, nome: 'Bia', credito: 5 },
        { alunoId: caio.id, nome: 'Caio', credito: 0 },
      ],
    });
    expect(await saldoDe(amb.db, ana.id)).toBe(10);
    expect(await saldoDe(amb.db, bia.id)).toBe(100);
    expect(await saldoDe(amb.db, caio.id)).toBe(100);
    expect(await saldoDe(amb.db, inativo.id)).toBe(0);
    expect(await saldoDe(amb.db, deFora.id)).toBe(0);
    const transacoes = await amb.db.selectFrom('transacao').selectAll().execute();
    expect(transacoes).toHaveLength(2);
    expect(new Set(transacoes.map((t) => t.loteId)).size).toBe(1);
  });

  it('deposita só para os alunos selecionados', async () => {
    const { turma, s } = await cenario();
    const a = await criarAluno(amb.db, turma.id);
    const b = await criarAluno(amb.db, turma.id);
    const c = await criarAluno(amb.db, turma.id);

    const r = await chamar(amb.app, s, 'POST', '/depositos/lote', { turmaId: turma.id, alunoIds: [a.id, c.id], valor: 7, descricao: 'x' });

    expect(r.statusCode).toBe(201);
    expect([await saldoDe(amb.db, a.id), await saldoDe(amb.db, b.id), await saldoDe(amb.db, c.id)]).toEqual([7, 0, 7]);
  });

  it('lista com aluno de outra turma é recusada inteira, sem nenhum depósito', async () => {
    const { turma, outraTurma, s } = await cenario();
    const a = await criarAluno(amb.db, turma.id);
    const intruso = await criarAluno(amb.db, outraTurma.id);

    const r = await chamar(amb.app, s, 'POST', '/depositos/lote', { turmaId: turma.id, alunoIds: [a.id, intruso.id], valor: 5, descricao: 'x' });

    expect(r.statusCode).toBe(422);
    expect(await amb.db.selectFrom('transacao').select('id').execute()).toHaveLength(0);
    expect(await amb.db.selectFrom('loteDeposito').select('id').execute()).toHaveLength(0);
  });

  it('professor não deposita em lote em turma que não é dele', async () => {
    const { outraTurma, s } = await cenario();
    await criarAluno(amb.db, outraTurma.id);
    const r = await chamar(amb.app, s, 'POST', '/depositos/lote', { turmaId: outraTurma.id, todos: true, valor: 5, descricao: 'x' });
    expect(r.statusCode).toBe(403);
  });

  it('turma sem alunos ativos responde 422 LOTE_VAZIO', async () => {
    const { turma, s } = await cenario();
    const r = await chamar(amb.app, s, 'POST', '/depositos/lote', { turmaId: turma.id, todos: true, valor: 5, descricao: 'x' });
    expect(r.statusCode).toBe(422);
    expect(r.json().codigo).toBe('LOTE_VAZIO');
  });

  it('falha no meio do lote desfaz tudo (OWASP A10 — tudo ou nada)', async () => {
    const { turma, s } = await cenario();
    const alunos = [];
    for (let i = 0; i < 5; i++) alunos.push(await criarAluno(amb.db, turma.id, { nome: `Aluno ${i}` }));
    const vitima = alunos[3]!;
    await sql`
      CREATE OR REPLACE FUNCTION falha_teste() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'falha simulada'; END; $$ LANGUAGE plpgsql;
      CREATE TRIGGER falha_teste BEFORE INSERT ON transacao FOR EACH ROW
        WHEN (NEW.aluno_id = '${sql.raw(vitima.id)}') EXECUTE FUNCTION falha_teste();
    `.execute(amb.db);

    try {
      const r = await chamar(amb.app, s, 'POST', '/depositos/lote', { turmaId: turma.id, todos: true, valor: 10, descricao: 'x' });
      expect(r.statusCode).toBe(500);
    } finally {
      await sql`DROP TRIGGER falha_teste ON transacao; DROP FUNCTION falha_teste();`.execute(amb.db);
    }

    for (const a of alunos) expect(await saldoDe(amb.db, a.id)).toBe(0);
    expect(await amb.db.selectFrom('transacao').select('id').execute()).toHaveLength(0);
    expect(await amb.db.selectFrom('loteDeposito').select('id').execute()).toHaveLength(0);
  });
});
