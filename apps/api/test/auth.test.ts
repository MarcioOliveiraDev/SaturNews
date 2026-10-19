import { describe, expect, it } from 'vitest';
import { SENHA, chamar, criarAluno, criarProfessor, criarTurma, entrar, usarAmbiente } from './helpers';

const amb = usarAmbiente();

const login = (login: string, senha: string, ip = '10.0.0.1') =>
  amb.app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { login, senha }, remoteAddress: ip });

describe('login (OWASP A07)', () => {
  it('autentica aluno com matrícula e senha e cria cookie de sessão seguro', async () => {
    const turma = await criarTurma(amb.db, '6º A');
    const aluno = await criarAluno(amb.db, turma.id, { nome: 'Ana Souza', login: '2026001' });

    const r = await login('2026001', SENHA);

    expect(r.statusCode).toBe(200);
    const corpo = r.json();
    expect(corpo.usuario).toMatchObject({ id: aluno.id, nome: 'Ana Souza', papel: 'ALUNO', turma: { nome: '6º A' } });
    expect(corpo.usuario.csrfToken).toMatch(/^[\w-]{40,}$/);
    expect(JSON.stringify(corpo)).not.toMatch(/senhaHash|argon2|idHash/i);
    const cookie = r.cookies.find((c) => c.name === 'sb_sessao')!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe('Strict');
    expect(cookie.path).toBe('/');
    expect(cookie.value.length).toBeGreaterThanOrEqual(43);
  });

  it('guarda a senha como hash Argon2id', async () => {
    const turma = await criarTurma(amb.db);
    const aluno = await criarAluno(amb.db, turma.id);
    const { senhaHash } = await amb.db.selectFrom('usuario').select('senhaHash').where('id', '=', aluno.id).executeTakeFirstOrThrow();
    expect(senhaHash).toMatch(/^\$argon2id\$/);
  });

  it('responde com a mesma mensagem genérica para senha errada e usuário inexistente', async () => {
    const turma = await criarTurma(amb.db);
    await criarAluno(amb.db, turma.id, { login: '2026002' });

    const errada = await login('2026002', 'errada');
    const inexistente = await login('9999999', 'errada');

    expect(errada.statusCode).toBe(401);
    expect(inexistente.statusCode).toBe(401);
    expect(errada.json().codigo).toBe('CREDENCIAIS_INVALIDAS');
    expect(errada.body).toBe(inexistente.body);
  });

  it('bloqueia a conta temporariamente após 5 falhas, mesmo com a senha certa depois', async () => {
    const turma = await criarTurma(amb.db);
    await criarAluno(amb.db, turma.id, { login: '2026003' });
    for (let i = 0; i < 5; i++) expect((await login('2026003', 'errada')).statusCode).toBe(401);

    const r = await login('2026003', SENHA);

    expect(r.statusCode).toBe(429);
    expect(r.json().codigo).toBe('CONTA_BLOQUEADA');
  });

  it('zera o contador de falhas após login bem-sucedido', async () => {
    const turma = await criarTurma(amb.db);
    await criarAluno(amb.db, turma.id, { login: '2026004' });
    for (let i = 0; i < 4; i++) await login('2026004', 'errada');
    expect((await login('2026004', SENHA)).statusCode).toBe(200);
    for (let i = 0; i < 4; i++) await login('2026004', 'errada');
    expect((await login('2026004', SENHA)).statusCode).toBe(200);
  });

  it('não autentica usuário desativado', async () => {
    const turma = await criarTurma(amb.db);
    const aluno = await criarAluno(amb.db, turma.id, { login: '2026005' });
    await amb.db.updateTable('usuario').set({ ativo: false }).where('id', '=', aluno.id).execute();
    expect((await login('2026005', SENHA)).statusCode).toBe(401);
  });

  it('registra login com sucesso e com falha na auditoria (OWASP A09)', async () => {
    const turma = await criarTurma(amb.db);
    const aluno = await criarAluno(amb.db, turma.id, { login: '2026006' });
    await login('2026006', 'errada');
    await login('2026006', SENHA);

    const registros = await amb.db.selectFrom('auditoria').selectAll().where('acao', '=', 'LOGIN').orderBy('id').execute();
    expect(registros.map((r) => r.resultado)).toEqual(['FALHA', 'SUCESSO']);
    expect(registros[1]!.usuarioId).toBe(aluno.id);
    expect(JSON.stringify(registros)).not.toContain('errada');
  });
});

describe('sessão', () => {
  it('rejeita requisição sem sessão', async () => {
    const r = await chamar(amb.app, null, 'GET', '/me');
    expect(r.statusCode).toBe(401);
    expect(r.json().codigo).toBe('NAO_AUTENTICADO');
  });

  it('rejeita cookie forjado', async () => {
    const r = await chamar(amb.app, { cookie: 'sb_sessao=abc', csrf: 'x', usuarioId: '' }, 'GET', '/me');
    expect(r.statusCode).toBe(401);
  });

  it('retorna o usuário logado em /me', async () => {
    const turma = await criarTurma(amb.db);
    const prof = await criarProfessor(amb.db, [turma.id], { login: 'prof.marta' });
    const s = await entrar(amb.app, 'prof.marta');
    const r = await chamar(amb.app, s, 'GET', '/me');
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ id: prof.id, papel: 'PROFESSOR', turma: null, csrfToken: s.csrf });
  });

  it('cada login gera um novo token de sessão (sem fixação de sessão)', async () => {
    const turma = await criarTurma(amb.db);
    await criarAluno(amb.db, turma.id, { login: '2026010' });
    const a = await entrar(amb.app, '2026010');
    const b = await entrar(amb.app, '2026010');
    expect(a.cookie).not.toBe(b.cookie);
    expect(a.csrf).not.toBe(b.csrf);
  });

  it('logout invalida a sessão no servidor', async () => {
    const turma = await criarTurma(amb.db);
    await criarAluno(amb.db, turma.id, { login: '2026011' });
    const s = await entrar(amb.app, '2026011');

    expect((await chamar(amb.app, s, 'POST', '/auth/logout')).statusCode).toBe(204);
    expect((await chamar(amb.app, s, 'GET', '/me')).statusCode).toBe(401);
  });

  it('expira após 30 minutos de inatividade', async () => {
    const turma = await criarTurma(amb.db);
    await criarAluno(amb.db, turma.id, { login: '2026012' });
    const s = await entrar(amb.app, '2026012');
    await amb.db
      .updateTable('sessao')
      .set({ ultimoAcesso: new Date(Date.now() - 31 * 60_000) })
      .where('usuarioId', '=', s.usuarioId)
      .execute();

    expect((await chamar(amb.app, s, 'GET', '/me')).statusCode).toBe(401);
  });

  it('expira no limite absoluto mesmo com uso contínuo', async () => {
    const turma = await criarTurma(amb.db);
    await criarAluno(amb.db, turma.id, { login: '2026013' });
    const s = await entrar(amb.app, '2026013');
    await amb.db.updateTable('sessao').set({ expiraEm: new Date(Date.now() - 1000) }).where('usuarioId', '=', s.usuarioId).execute();

    expect((await chamar(amb.app, s, 'GET', '/me')).statusCode).toBe(401);
  });

  it('o token de sessão não é guardado em texto puro no banco', async () => {
    const turma = await criarTurma(amb.db);
    await criarAluno(amb.db, turma.id, { login: '2026014' });
    const s = await entrar(amb.app, '2026014');
    const token = s.cookie.split('=')[1]!;
    const linhas = await amb.db.selectFrom('sessao').select('idHash').execute();
    expect(linhas.map((l) => l.idHash)).not.toContain(token);
  });
});

describe('CSRF (OWASP A08)', () => {
  it('recusa escrita sem o header X-CSRF-Token', async () => {
    const turma = await criarTurma(amb.db);
    await criarAluno(amb.db, turma.id, { login: '2026020' });
    const s = await entrar(amb.app, '2026020');
    const r = await chamar(amb.app, s, 'POST', '/auth/logout', undefined, { 'x-csrf-token': '' });
    expect(r.statusCode).toBe(403);
    expect(r.json().codigo).toBe('CSRF');
  });

  it('recusa token CSRF de outra sessão', async () => {
    const turma = await criarTurma(amb.db);
    await criarAluno(amb.db, turma.id, { login: '2026021' });
    const a = await entrar(amb.app, '2026021');
    const b = await entrar(amb.app, '2026021');
    const r = await chamar(amb.app, a, 'POST', '/auth/logout', undefined, { 'x-csrf-token': b.csrf });
    expect(r.statusCode).toBe(403);
  });
});

describe('troca de senha', () => {
  it('obriga a trocar a senha provisória antes de usar o app', async () => {
    const turma = await criarTurma(amb.db);
    await criarAluno(amb.db, turma.id, { login: '2026030', trocarSenha: true });
    const s = await entrar(amb.app, '2026030');

    const bloqueado = await chamar(amb.app, s, 'GET', '/me/conta');
    expect(bloqueado.statusCode).toBe(403);
    expect(bloqueado.json().codigo).toBe('TROCA_SENHA_OBRIGATORIA');
    expect((await chamar(amb.app, s, 'GET', '/me')).json().trocarSenha).toBe(true);

    const troca = await chamar(amb.app, s, 'POST', '/auth/trocar-senha', { senhaAtual: SENHA, novaSenha: 'Anel-de-Saturno7' });
    expect(troca.statusCode).toBe(204);
    expect((await chamar(amb.app, s, 'GET', '/me/conta')).statusCode).toBe(200);
    expect((await entrar(amb.app, '2026030', 'Anel-de-Saturno7')).usuarioId).toBe(s.usuarioId);
  });

  it('recusa a troca com senha atual errada ou nova senha fraca', async () => {
    const turma = await criarTurma(amb.db);
    await criarAluno(amb.db, turma.id, { login: '2026031' });
    const s = await entrar(amb.app, '2026031');

    expect((await chamar(amb.app, s, 'POST', '/auth/trocar-senha', { senhaAtual: 'x', novaSenha: 'Anel-de-Saturno7' })).statusCode).toBe(401);
    expect((await chamar(amb.app, s, 'POST', '/auth/trocar-senha', { senhaAtual: SENHA, novaSenha: '12345678' })).statusCode).toBe(422);
  });

  it('encerra as outras sessões do usuário ao trocar a senha', async () => {
    const turma = await criarTurma(amb.db);
    await criarAluno(amb.db, turma.id, { login: '2026032' });
    const celular = await entrar(amb.app, '2026032');
    const computador = await entrar(amb.app, '2026032');

    await chamar(amb.app, computador, 'POST', '/auth/trocar-senha', { senhaAtual: SENHA, novaSenha: 'Anel-de-Saturno7' });

    expect((await chamar(amb.app, celular, 'GET', '/me')).statusCode).toBe(401);
    expect((await chamar(amb.app, computador, 'GET', '/me')).statusCode).toBe(200);
  });
});
