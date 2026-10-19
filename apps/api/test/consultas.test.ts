import { describe, expect, it } from 'vitest';
import { chamar, criarAluno, criarItem, criarProfessor, criarTurma, entrar, usarAmbiente } from './helpers';

const amb = usarAmbiente();

describe('consultas do aluno', () => {
  it('mostra saldo, teto e quanto ainda pode receber', async () => {
    const turma = await criarTurma(amb.db);
    await criarAluno(amb.db, turma.id, { login: '2026001', saldo: 70 });
    const s = await entrar(amb.app, '2026001');
    expect((await chamar(amb.app, s, 'GET', '/me/conta')).json()).toEqual({ saldo: 70, teto: 100, espaco: 30 });
  });

  it('pagina o extrato do mais recente para o mais antigo', async () => {
    const turma = await criarTurma(amb.db);
    const aluno = await criarAluno(amb.db, turma.id, { login: '2026001' });
    await criarProfessor(amb.db, [turma.id], { login: 'prof.marta' });
    const sp = await entrar(amb.app, 'prof.marta');
    for (let i = 1; i <= 25; i++) await chamar(amb.app, sp, 'POST', '/depositos', { alunoId: aluno.id, valor: 1, descricao: `D${i}` });
    const s = await entrar(amb.app, '2026001');

    const p1 = (await chamar(amb.app, s, 'GET', '/me/transacoes')).json();
    expect(p1.itens).toHaveLength(20);
    expect(p1.itens[0]).toMatchObject({ descricao: 'D25', tipo: 'DEPOSITO', autor: expect.stringMatching(/Professor/) });
    const p2 = (await chamar(amb.app, s, 'GET', `/me/transacoes?cursor=${p1.proximoCursor}`)).json();
    expect(p2.itens.map((t: { descricao: string }) => t.descricao)).toEqual(['D5', 'D4', 'D3', 'D2', 'D1']);
    expect(p2.proximoCursor).toBeNull();
  });

  it('cursor inválido responde 422', async () => {
    const turma = await criarTurma(amb.db);
    await criarAluno(amb.db, turma.id, { login: '2026001' });
    const s = await entrar(amb.app, '2026001');
    expect((await chamar(amb.app, s, 'GET', '/me/transacoes?cursor=lixo')).statusCode).toBe(422);
  });

  it('lista o catálogo de itens ativos', async () => {
    const turma = await criarTurma(amb.db);
    await criarAluno(amb.db, turma.id, { login: '2026001' });
    await criarItem(amb.db, 'Filme', 300);
    const inativo = await criarItem(amb.db, 'Antigo');
    await amb.db.updateTable('itemCatalogo').set({ ativo: false }).where('id', '=', inativo.id).execute();
    const s = await entrar(amb.app, '2026001');
    const r = (await chamar(amb.app, s, 'GET', '/catalogo')).json();
    expect(r).toEqual([expect.objectContaining({ nome: 'Filme', precoSugerido: 300 })]);
  });
});

describe('consultas do professor e IDOR (OWASP A01)', () => {
  async function cenario() {
    const minha = await criarTurma(amb.db, '7º A');
    const alheia = await criarTurma(amb.db, '8º B');
    await criarProfessor(amb.db, [minha.id], { login: 'prof.marta' });
    const sp = await entrar(amb.app, 'prof.marta');
    return { minha, alheia, sp };
  }

  it('lista só as turmas do professor, com contagem de alunos', async () => {
    const { minha, sp } = await cenario();
    await criarAluno(amb.db, minha.id);
    await criarAluno(amb.db, minha.id);
    const r = (await chamar(amb.app, sp, 'GET', '/turmas')).json();
    expect(r).toEqual([{ id: minha.id, nome: '7º A', totalAlunos: 2, metasAbertas: 0 }]);
  });

  it('lista alunos da turma com saldo, em ordem alfabética', async () => {
    const { minha, sp } = await cenario();
    await criarAluno(amb.db, minha.id, { nome: 'Bruno', saldo: 10 });
    await criarAluno(amb.db, minha.id, { nome: 'Ana', saldo: 5 });
    const r = (await chamar(amb.app, sp, 'GET', `/turmas/${minha.id}/alunos`)).json();
    expect(r.map((a: { nome: string; saldo: number }) => [a.nome, a.saldo])).toEqual([['Ana', 5], ['Bruno', 10]]);
  });

  it('não acessa alunos, metas nem extratos de turma alheia', async () => {
    const { alheia, sp } = await cenario();
    const aluno = await criarAluno(amb.db, alheia.id);
    for (const url of [`/turmas/${alheia.id}/alunos`, `/turmas/${alheia.id}/metas`, `/alunos/${aluno.id}`, `/alunos/${aluno.id}/transacoes`]) {
      expect((await chamar(amb.app, sp, 'GET', url)).statusCode, url).toBe(403);
    }
  });

  it('aluno não acessa rotas de professor nem o extrato de colegas', async () => {
    const { minha } = await cenario();
    const colega = await criarAluno(amb.db, minha.id);
    await criarAluno(amb.db, minha.id, { login: '2026001' });
    const sa = await entrar(amb.app, '2026001');
    for (const url of ['/turmas', `/turmas/${minha.id}/alunos`, `/alunos/${colega.id}`, `/alunos/${colega.id}/transacoes`]) {
      expect((await chamar(amb.app, sa, 'GET', url)).statusCode, url).toBe(403);
    }
  });

  it('professor vê o extrato de aluno da sua turma', async () => {
    const { minha, sp } = await cenario();
    const aluno = await criarAluno(amb.db, minha.id, { nome: 'Ana' });
    await chamar(amb.app, sp, 'POST', '/depositos', { alunoId: aluno.id, valor: 3, descricao: 'Leitura' });
    expect((await chamar(amb.app, sp, 'GET', `/alunos/${aluno.id}`)).json()).toMatchObject({ nome: 'Ana', saldo: 3 });
    expect((await chamar(amb.app, sp, 'GET', `/alunos/${aluno.id}/transacoes`)).json().itens).toHaveLength(1);
  });
});
