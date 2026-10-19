import { describe, expect, it } from 'vitest';
import { chamar, criarAluno, criarItem, criarMeta, criarProfessor, criarTurma, entrar, saldoDe, usarAmbiente } from './helpers';

const amb = usarAmbiente();

async function cenario() {
  const turma = await criarTurma(amb.db, '6º A');
  const outraTurma = await criarTurma(amb.db, '8º B');
  const prof = await criarProfessor(amb.db, [turma.id], { login: 'prof.marta' });
  const sp = await entrar(amb.app, 'prof.marta');
  const aluno = await criarAluno(amb.db, turma.id, { login: '2026001', saldo: 50 });
  const sa = await entrar(amb.app, '2026001');
  return { turma, outraTurma, prof, sp, aluno, sa };
}

const contribuir = (s: Parameters<typeof chamar>[1], metaId: string, valor: number) =>
  chamar(amb.app, s, 'POST', `/metas/${metaId}/contribuicoes`, { valor });

describe('criação de metas (D3: só o professor cria)', () => {
  it('professor cria meta a partir do catálogo e o aluno a vê com quanto falta', async () => {
    const { turma, sp, sa } = await cenario();
    const filme = await criarItem(amb.db, 'Filme', 300);

    const r = await chamar(amb.app, sp, 'POST', `/turmas/${turma.id}/metas`, { itemId: filme.id, valorAlvo: 250 });

    expect(r.statusCode).toBe(201);
    expect(r.json()).toMatchObject({ titulo: 'Filme', valorAlvo: 250, arrecadado: 0, falta: 250, percentual: 0, status: 'ABERTA' });
    const lista = await chamar(amb.app, sa, 'GET', '/me/turma/metas');
    expect(lista.json()).toHaveLength(1);
    expect(lista.json()[0]).toMatchObject({ titulo: 'Filme', falta: 250, icone: 'film' });
  });

  it('aluno não cria meta', async () => {
    const { turma, sa } = await cenario();
    const item = await criarItem(amb.db);
    expect((await chamar(amb.app, sa, 'POST', `/turmas/${turma.id}/metas`, { itemId: item.id, valorAlvo: 10 })).statusCode).toBe(403);
  });

  it('professor não cria meta em turma que não é dele', async () => {
    const { outraTurma, sp } = await cenario();
    const item = await criarItem(amb.db);
    expect((await chamar(amb.app, sp, 'POST', `/turmas/${outraTurma.id}/metas`, { itemId: item.id, valorAlvo: 10 })).statusCode).toBe(403);
  });
});

describe('contribuição', () => {
  it('move o valor do saldo do aluno para a meta e aparece no extrato', async () => {
    const { turma, prof, aluno, sa } = await cenario();
    const meta = await criarMeta(amb.db, turma.id, prof.id, 200, 120);

    const r = await contribuir(sa, meta.id, 30);

    expect(r.statusCode).toBe(201);
    expect(r.json()).toMatchObject({ saldo: 20, meta: { arrecadado: 150, falta: 50, percentual: 75, status: 'ABERTA' } });
    expect(await saldoDe(amb.db, aluno.id)).toBe(20);
    const extrato = await chamar(amb.app, sa, 'GET', '/me/transacoes');
    expect(extrato.json().itens[0]).toMatchObject({ tipo: 'CONTRIBUICAO', valor: 30, meta: meta.titulo });
    const detalhe = await chamar(amb.app, sa, 'GET', `/metas/${meta.id}`);
    expect(detalhe.json()).toMatchObject({ minhaContribuicao: 30 });
  });

  it('meta é ATINGIDA quando completa o alvo e para de aceitar contribuições', async () => {
    const { turma, prof, sa } = await cenario();
    const meta = await criarMeta(amb.db, turma.id, prof.id, 100, 90);

    expect((await contribuir(sa, meta.id, 10)).json().meta.status).toBe('ATINGIDA');

    const r = await contribuir(sa, meta.id, 1);
    expect(r.statusCode).toBe(422);
    expect(r.json().codigo).toBe('META_FECHADA');
  });

  it('recusa contribuição maior que o que falta, informando o máximo', async () => {
    const { turma, prof, aluno, sa } = await cenario();
    const meta = await criarMeta(amb.db, turma.id, prof.id, 100, 95);
    const r = await contribuir(sa, meta.id, 10);
    expect(r.statusCode).toBe(422);
    expect(r.json()).toMatchObject({ codigo: 'EXCEDE_META', maximo: 5 });
    expect(await saldoDe(amb.db, aluno.id)).toBe(50);
  });

  it('recusa contribuição maior que o saldo', async () => {
    const { turma, prof, sa } = await cenario();
    const meta = await criarMeta(amb.db, turma.id, prof.id, 100);
    expect((await contribuir(sa, meta.id, 51)).json().codigo).toBe('SALDO_INSUFICIENTE');
  });

  it('aluno não vê nem contribui para meta de outra turma (IDOR)', async () => {
    const { outraTurma, prof, sa } = await cenario();
    const meta = await criarMeta(amb.db, outraTurma.id, prof.id, 100);
    expect((await contribuir(sa, meta.id, 10)).statusCode).toBe(404);
    expect((await chamar(amb.app, sa, 'GET', `/metas/${meta.id}`)).statusCode).toBe(404);
  });

  it('professor não contribui', async () => {
    const { turma, prof, sp } = await cenario();
    const meta = await criarMeta(amb.db, turma.id, prof.id, 100);
    expect((await contribuir(sp, meta.id, 10)).statusCode).toBe(403);
  });

  it('não existe forma de o aluno retirar uma contribuição (D4)', async () => {
    const { turma, prof, sa } = await cenario();
    const meta = await criarMeta(amb.db, turma.id, prof.id, 100);
    await contribuir(sa, meta.id, 10);
    for (const metodo of ['DELETE', 'PATCH', 'PUT'] as const) {
      expect([404, 405]).toContain((await chamar(amb.app, sa, metodo, `/metas/${meta.id}/contribuicoes`)).statusCode);
    }
    expect((await chamar(amb.app, sa, 'POST', `/metas/${meta.id}/cancelar`)).statusCode).toBe(403);
  });

  it('contribuições simultâneas de vários alunos nunca ultrapassam o alvo (OWASP A06)', async () => {
    const { turma, prof } = await cenario();
    const meta = await criarMeta(amb.db, turma.id, prof.id, 100);
    const sessoes = [];
    for (let i = 0; i < 20; i++) {
      const a = await criarAluno(amb.db, turma.id, { login: `30000${String(i).padStart(2, '0')}`, saldo: 10 });
      sessoes.push({ aluno: a, s: await entrar(amb.app, a.login) });
    }

    const respostas = await Promise.all(sessoes.map(({ s }) => contribuir(s, meta.id, 10)));

    expect(respostas.filter((r) => r.statusCode === 201)).toHaveLength(10);
    expect(respostas.filter((r) => r.statusCode === 422)).toHaveLength(10);
    const final = await amb.db.selectFrom('meta').selectAll().where('id', '=', meta.id).executeTakeFirstOrThrow();
    expect(final).toMatchObject({ arrecadado: 100, status: 'ATINGIDA' });
    let somaSaldos = 0;
    for (const { aluno } of sessoes) somaSaldos += await saldoDe(amb.db, aluno.id);
    expect(somaSaldos).toBe(100);
  });

  it('o mesmo aluno não gasta o saldo duas vezes com requisições simultâneas', async () => {
    const { turma, prof, aluno, sa } = await cenario();
    const meta = await criarMeta(amb.db, turma.id, prof.id, 1000);

    const respostas = await Promise.all(Array.from({ length: 8 }, () => contribuir(sa, meta.id, 20)));

    expect(respostas.filter((r) => r.statusCode === 201)).toHaveLength(2);
    expect(await saldoDe(amb.db, aluno.id)).toBe(10);
  });
});

describe('resgate e cancelamento (professor)', () => {
  it('só meta ATINGIDA pode ser resgatada', async () => {
    const { turma, prof, sp } = await cenario();
    const aberta = await criarMeta(amb.db, turma.id, prof.id, 100, 10);
    const atingida = await criarMeta(amb.db, turma.id, prof.id, 100, 100);
    await amb.db.updateTable('meta').set({ status: 'ATINGIDA' }).where('id', '=', atingida.id).execute();

    expect((await chamar(amb.app, sp, 'POST', `/metas/${aberta.id}/resgatar`)).statusCode).toBe(409);
    const r = await chamar(amb.app, sp, 'POST', `/metas/${atingida.id}/resgatar`);
    expect(r.statusCode).toBe(200);
    expect(r.json().status).toBe('RESGATADA');
  });

  it('cancelar meta aberta devolve a cada aluno exatamente o que contribuiu, mesmo acima do teto', async () => {
    const { turma, prof, sp, aluno, sa } = await cenario();
    const outro = await criarAluno(amb.db, turma.id, { login: '2026002', saldo: 30 });
    const so = await entrar(amb.app, '2026002');
    const meta = await criarMeta(amb.db, turma.id, prof.id, 200);
    await contribuir(sa, meta.id, 20);
    await contribuir(sa, meta.id, 15);
    await contribuir(so, meta.id, 30);
    // Depois de contribuir, o aluno recebeu depósitos até o teto.
    await chamar(amb.app, sp, 'POST', '/depositos', { alunoId: aluno.id, valor: 85, descricao: 'x' });

    const r = await chamar(amb.app, sp, 'POST', `/metas/${meta.id}/cancelar`);

    expect(r.statusCode).toBe(200);
    expect(r.json().meta).toMatchObject({ status: 'CANCELADA', arrecadado: 0 });
    expect(await saldoDe(amb.db, aluno.id)).toBe(135);
    expect(await saldoDe(amb.db, outro.id)).toBe(30);
    const estornos = await amb.db.selectFrom('transacao').selectAll().where('tipo', '=', 'ESTORNO').execute();
    expect(estornos.map((e) => [e.alunoId, e.valor]).sort()).toEqual([[aluno.id, 35], [outro.id, 30]].sort());

    // Acima do teto, o aluno não recebe novos depósitos.
    const dep = await chamar(amb.app, sp, 'POST', '/depositos', { alunoId: aluno.id, valor: 1, descricao: 'x' });
    expect(dep.json()).toMatchObject({ codigo: 'TETO_SALDO', maximo: 0 });
  });

  it('não cancela meta já atingida', async () => {
    const { turma, prof, sp } = await cenario();
    const meta = await criarMeta(amb.db, turma.id, prof.id, 100, 100);
    await amb.db.updateTable('meta').set({ status: 'ATINGIDA' }).where('id', '=', meta.id).execute();
    expect((await chamar(amb.app, sp, 'POST', `/metas/${meta.id}/cancelar`)).statusCode).toBe(409);
  });

  it('professor não resgata nem cancela meta de outra turma', async () => {
    const { outraTurma, prof, sp } = await cenario();
    const meta = await criarMeta(amb.db, outraTurma.id, prof.id, 100);
    expect((await chamar(amb.app, sp, 'POST', `/metas/${meta.id}/cancelar`)).statusCode).toBe(403);
    expect((await chamar(amb.app, sp, 'POST', `/metas/${meta.id}/resgatar`)).statusCode).toBe(403);
  });
});
