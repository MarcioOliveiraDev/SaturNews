import { describe, expect, it } from 'vitest';
import { SENHA, chamar, criarAdmin, criarAluno, criarMeta, criarProfessor, criarTurma, entrar, saldoDe, usarAmbiente } from './helpers';

const amb = usarAmbiente();

async function sessaoAdmin() {
  const admin = await criarAdmin(amb.db);
  return { admin, s: await entrar(amb.app, admin.login) };
}

const CSV = `matricula,nome,turma,ano_letivo
2026001,Ana Beatriz Souza,6º A,2026
2026002,Bruno Henrique Lima,6º A,2026
2026009,Isabela Pereira Melo,7º A,2026
`;

describe('importação de alunos via CSV', () => {
  it('simulação mostra a prévia sem gravar nada', async () => {
    const { s } = await sessaoAdmin();
    const r = await chamar(amb.app, s, 'POST', '/admin/importacoes/alunos', { csv: CSV, simular: true });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ simulacao: true, erros: [], alunos: expect.arrayContaining([expect.objectContaining({ matricula: '2026001', turma: '6º A' })]) });
    expect(await amb.db.selectFrom('usuario').select('id').where('papel', '=', 'ALUNO').execute()).toHaveLength(0);
  });

  it('cria turmas e alunos com senha provisória e troca obrigatória', async () => {
    const { s } = await sessaoAdmin();
    const r = await chamar(amb.app, s, 'POST', '/admin/importacoes/alunos', { csv: CSV });
    expect(r.statusCode).toBe(201);
    const alunos = r.json().alunos as { matricula: string; senhaTemporaria: string }[];
    expect(alunos).toHaveLength(3);
    expect(new Set(alunos.map((a) => a.senhaTemporaria)).size).toBe(3);
    expect((await amb.db.selectFrom('turma').select('nome').orderBy('nome').execute()).map((t) => t.nome)).toEqual(['6º A', '7º A']);

    const ana = alunos.find((a) => a.matricula === '2026001')!;
    const sa = await entrar(amb.app, '2026001', ana.senhaTemporaria);
    expect((await chamar(amb.app, sa, 'GET', '/me')).json()).toMatchObject({ trocarSenha: true, turma: { nome: '6º A' } });
  });

  it('com qualquer linha inválida, nada é importado e os erros indicam a linha', async () => {
    const { s } = await sessaoAdmin();
    const ruim = `${CSV}abc,,6º A,2026\n2026001,Duplicada,6º A,2026\n`;
    const r = await chamar(amb.app, s, 'POST', '/admin/importacoes/alunos', { csv: ruim });
    expect(r.statusCode).toBe(422);
    const linhas = r.json().erros.map((e: { linha: number }) => e.linha);
    expect(linhas).toEqual([5, 6]);
    expect(await amb.db.selectFrom('usuario').select('id').where('papel', '=', 'ALUNO').execute()).toHaveLength(0);
  });

  it('recusa CSV sem as colunas esperadas', async () => {
    const { s } = await sessaoAdmin();
    const r = await chamar(amb.app, s, 'POST', '/admin/importacoes/alunos', { csv: 'nome;turma\nAna;6A' });
    expect(r.statusCode).toBe(422);
  });

  it('aluno já existente muda de turma e mantém o saldo', async () => {
    const { s } = await sessaoAdmin();
    const antiga = await criarTurma(amb.db, '5º A', 2025);
    const aluno = await criarAluno(amb.db, antiga.id, { login: '2026001', saldo: 12 });
    const r = await chamar(amb.app, s, 'POST', '/admin/importacoes/alunos', { csv: CSV });
    expect(r.statusCode).toBe(201);
    expect(r.json().alunos.find((a: { matricula: string }) => a.matricula === '2026001')).toMatchObject({ senhaTemporaria: null, atualizado: true });
    const depois = await amb.db.selectFrom('usuario').innerJoin('turma', 'turma.id', 'usuario.turmaId').select(['turma.nome', 'usuario.saldo']).where('usuario.id', '=', aluno.id).executeTakeFirstOrThrow();
    expect(depois).toEqual({ nome: '6º A', saldo: 12 });
  });
});

describe('administração de usuários', () => {
  it('redefine a senha de um aluno: provisória, troca obrigatória e sessões encerradas', async () => {
    const { s } = await sessaoAdmin();
    const turma = await criarTurma(amb.db);
    const aluno = await criarAluno(amb.db, turma.id, { login: '2026050' });
    const sa = await entrar(amb.app, '2026050');

    const r = await chamar(amb.app, s, 'POST', `/admin/usuarios/${aluno.id}/redefinir-senha`);

    expect(r.statusCode).toBe(200);
    const { senhaTemporaria } = r.json();
    expect(senhaTemporaria).toMatch(/^.{10,}$/);
    expect((await chamar(amb.app, sa, 'GET', '/me')).statusCode).toBe(401);
    const nova = await entrar(amb.app, '2026050', senhaTemporaria);
    expect((await chamar(amb.app, nova, 'GET', '/me')).json().trocarSenha).toBe(true);
    await expect(entrar(amb.app, '2026050', SENHA)).rejects.toThrow();
  });

  it('busca alunos por nome', async () => {
    const { s } = await sessaoAdmin();
    const turma = await criarTurma(amb.db, '6º A');
    await criarAluno(amb.db, turma.id, { nome: 'Ana Souza' });
    await criarAluno(amb.db, turma.id, { nome: 'Bruno Lima' });
    const r = (await chamar(amb.app, s, 'GET', `/admin/alunos?busca=${encodeURIComponent('ana')}`)).json();
    expect(r).toEqual([expect.objectContaining({ nome: 'Ana Souza', turma: '6º A' })]);
  });

  it('professor e aluno não acessam rotas de administração', async () => {
    const turma = await criarTurma(amb.db);
    await criarProfessor(amb.db, [turma.id], { login: 'prof.marta' });
    await criarAluno(amb.db, turma.id, { login: '2026001' });
    for (const login of ['prof.marta', '2026001']) {
      const s = await entrar(amb.app, login);
      expect((await chamar(amb.app, s, 'GET', '/admin/auditoria')).statusCode).toBe(403);
      expect((await chamar(amb.app, s, 'POST', '/admin/importacoes/alunos', { csv: CSV })).statusCode).toBe(403);
      expect((await chamar(amb.app, s, 'POST', '/admin/encerrar-ano', { confirmacao: 'ENCERRAR 2026' })).statusCode).toBe(403);
    }
  });

  it('consulta a auditoria paginada', async () => {
    const { s } = await sessaoAdmin();
    const r = (await chamar(amb.app, s, 'GET', '/admin/auditoria')).json();
    expect(r.itens[0]).toMatchObject({ acao: 'LOGIN', resultado: 'SUCESSO' });
  });
});

describe('encerramento do ano letivo (D7)', () => {
  async function cenario() {
    const { s } = await sessaoAdmin();
    const turma = await criarTurma(amb.db, '6º A', 2026);
    const prof = await criarProfessor(amb.db, [turma.id], { login: 'prof.marta' });
    const sp = await entrar(amb.app, 'prof.marta');
    const ana = await criarAluno(amb.db, turma.id, { login: '2026001', saldo: 60 });
    const bia = await criarAluno(amb.db, turma.id, { login: '2026002', saldo: 0 });
    const sa = await entrar(amb.app, '2026001');
    const aberta = await criarMeta(amb.db, turma.id, prof.id, 100);
    const atingida = await criarMeta(amb.db, turma.id, prof.id, 10);
    await chamar(amb.app, sa, 'POST', `/metas/${aberta.id}/contribuicoes`, { valor: 25 });
    await chamar(amb.app, sa, 'POST', `/metas/${atingida.id}/contribuicoes`, { valor: 10 });
    return { s, sp, turma, ana, bia, aberta, atingida };
  }

  it('exige a frase de confirmação com o ano', async () => {
    const { s } = await cenario();
    const r = await chamar(amb.app, s, 'POST', '/admin/encerrar-ano', { confirmacao: 'sim' });
    expect(r.statusCode).toBe(422);
  });

  it('cancela metas abertas com estorno, mantém as atingidas e zera todos os saldos', async () => {
    const { s, ana, bia, aberta, atingida, turma } = await cenario();

    const r = await chamar(amb.app, s, 'POST', '/admin/encerrar-ano', { confirmacao: 'ENCERRAR 2026' });

    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ ano: 2026, metasCanceladas: 1, saldosZerados: 1 });
    expect(await saldoDe(amb.db, ana.id)).toBe(0);
    expect(await saldoDe(amb.db, bia.id)).toBe(0);
    const metas = await amb.db.selectFrom('meta').select(['id', 'status']).execute();
    expect(Object.fromEntries(metas.map((m) => [m.id, m.status]))).toEqual({ [aberta.id]: 'CANCELADA', [atingida.id]: 'ATINGIDA' });
    const zeramento = await amb.db.selectFrom('transacao').selectAll().where('tipo', '=', 'ZERAMENTO').execute();
    // 60 - 25 - 10 + 25 (estorno) = 50 zerados.
    expect(zeramento).toEqual([expect.objectContaining({ alunoId: ana.id, valor: 50 })]);
    const t = await amb.db.selectFrom('turma').select('ativa').where('id', '=', turma.id).executeTakeFirstOrThrow();
    expect(t.ativa).toBe(false);
  });

  it('não encerra o mesmo ano duas vezes', async () => {
    const { s } = await cenario();
    await chamar(amb.app, s, 'POST', '/admin/encerrar-ano', { confirmacao: 'ENCERRAR 2026' });
    expect((await chamar(amb.app, s, 'POST', '/admin/encerrar-ano', { confirmacao: 'ENCERRAR 2026' })).statusCode).toBe(409);
  });

  it('meta atingida pode ser resgatada depois do encerramento', async () => {
    const { s, sp, atingida } = await cenario();
    await chamar(amb.app, s, 'POST', '/admin/encerrar-ano', { confirmacao: 'ENCERRAR 2026' });
    expect((await chamar(amb.app, sp, 'POST', `/metas/${atingida.id}/resgatar`)).statusCode).toBe(200);
  });
});
