import { describe, expect, it } from 'vitest';
import { chamar, criarAluno, criarItem, criarProfessor, criarTurma, entrar, usarAmbiente } from './helpers';

const amb = usarAmbiente();

async function cenario() {
  const turma = await criarTurma(amb.db, '6º A');
  const outraTurma = await criarTurma(amb.db, '8º B');
  await criarProfessor(amb.db, [turma.id], { login: 'prof.marta' });
  const sp = await entrar(amb.app, 'prof.marta');
  await criarAluno(amb.db, turma.id, { login: '2026001', nome: 'Ana' });
  const sa = await entrar(amb.app, '2026001');
  return { turma, outraTurma, sp, sa };
}

describe('sugestões de metas (D3)', () => {
  it('aluno sugere um item do catálogo ou uma ideia, e o professor da turma vê as pendentes', async () => {
    const { turma, sp, sa } = await cenario();
    const quadra = await criarItem(amb.db, 'Quadra');

    expect((await chamar(amb.app, sa, 'POST', '/me/turma/sugestoes', { itemId: quadra.id })).statusCode).toBe(201);
    expect((await chamar(amb.app, sa, 'POST', '/me/turma/sugestoes', { texto: 'Piquenique no pátio' })).statusCode).toBe(201);

    const r = await chamar(amb.app, sp, 'GET', `/turmas/${turma.id}/sugestoes`);
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ aluno: 'Ana', item: 'Quadra', texto: null, status: 'PENDENTE' }),
        expect.objectContaining({ aluno: 'Ana', item: null, texto: 'Piquenique no pátio' }),
      ]),
    );
  });

  it('aprovar = criar a meta a partir da sugestão', async () => {
    const { turma, sp, sa } = await cenario();
    const item = await criarItem(amb.db, 'Jogos de tabuleiro');
    const sugestao = (await chamar(amb.app, sa, 'POST', '/me/turma/sugestoes', { itemId: item.id })).json();

    const r = await chamar(amb.app, sp, 'POST', `/turmas/${turma.id}/metas`, { itemId: item.id, valorAlvo: 80, sugestaoId: sugestao.id });

    expect(r.statusCode).toBe(201);
    expect((await chamar(amb.app, sp, 'GET', `/turmas/${turma.id}/sugestoes`)).json()).toHaveLength(0);
    const s = await amb.db.selectFrom('sugestao').selectAll().where('id', '=', sugestao.id).executeTakeFirstOrThrow();
    expect(s.status).toBe('APROVADA');
  });

  it('professor pode recusar uma sugestão', async () => {
    const { turma, sp, sa } = await cenario();
    const sugestao = (await chamar(amb.app, sa, 'POST', '/me/turma/sugestoes', { texto: 'Sorvete' })).json();
    expect((await chamar(amb.app, sp, 'POST', `/sugestoes/${sugestao.id}/recusar`)).statusCode).toBe(204);
    expect((await chamar(amb.app, sp, 'GET', `/turmas/${turma.id}/sugestoes`)).json()).toHaveLength(0);
  });

  it('limita a 3 sugestões pendentes por aluno (anti-spam)', async () => {
    const { sa } = await cenario();
    for (let i = 0; i < 3; i++) expect((await chamar(amb.app, sa, 'POST', '/me/turma/sugestoes', { texto: `Ideia ${i}` })).statusCode).toBe(201);
    const r = await chamar(amb.app, sa, 'POST', '/me/turma/sugestoes', { texto: 'Mais uma' });
    expect(r.statusCode).toBe(422);
    expect(r.json().codigo).toBe('LIMITE_SUGESTOES');
  });

  it('professor não vê nem recusa sugestões de turma que não é dele', async () => {
    const { outraTurma, sp } = await cenario();
    await criarAluno(amb.db, outraTurma.id, { login: '2026099' });
    const so = await entrar(amb.app, '2026099');
    const sugestao = (await chamar(amb.app, so, 'POST', '/me/turma/sugestoes', { texto: 'Ideia' })).json();

    expect((await chamar(amb.app, sp, 'GET', `/turmas/${outraTurma.id}/sugestoes`)).statusCode).toBe(403);
    expect((await chamar(amb.app, sp, 'POST', `/sugestoes/${sugestao.id}/recusar`)).statusCode).toBe(403);
  });

  it('não aprova sugestão de outra turma ao criar meta', async () => {
    const { turma, outraTurma, sp } = await cenario();
    await criarAluno(amb.db, outraTurma.id, { login: '2026098' });
    const so = await entrar(amb.app, '2026098');
    const item = await criarItem(amb.db);
    const sugestao = (await chamar(amb.app, so, 'POST', '/me/turma/sugestoes', { itemId: item.id })).json();

    const r = await chamar(amb.app, sp, 'POST', `/turmas/${turma.id}/metas`, { itemId: item.id, valorAlvo: 10, sugestaoId: sugestao.id });
    expect(r.statusCode).toBe(422);
  });
});
