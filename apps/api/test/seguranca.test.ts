import { describe, expect, it } from 'vitest';
import { construirApp } from '../src/app';
import { chamar, configTeste, criarAluno, criarProfessor, criarTurma, entrar, usarAmbiente } from './helpers';

const amb = usarAmbiente(
  {},
  {
    aoRegistrar: (app) => {
      app.get('/api/v1/teste/explode', { config: { publico: true } }, async () => {
        throw new Error('detalhe interno: senha do banco é hunter2');
      });
    },
  },
);

describe('headers de segurança (OWASP A02)', () => {
  it('envia CSP restritiva, HSTS, nosniff e bloqueio de frames', async () => {
    const r = await amb.app.inject({ method: 'GET', url: '/api/v1/saude' });
    expect(r.statusCode).toBe(200);
    const csp = r.headers['content-security-policy'] as string;
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain('unsafe-inline');
    expect(r.headers['strict-transport-security']).toMatch(/max-age=\d+/);
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['x-powered-by']).toBeUndefined();
    expect(r.headers['referrer-policy']).toBe('no-referrer');
  });

  it('respostas da API não são guardadas em cache', async () => {
    const r = await amb.app.inject({ method: 'GET', url: '/api/v1/saude' });
    expect(r.headers['cache-control']).toBe('no-store');
  });
});

describe('tratamento de erros (OWASP A10)', () => {
  it('erro inesperado vira 500 genérico sem vazar detalhes', async () => {
    const r = await amb.app.inject({ method: 'GET', url: '/api/v1/teste/explode' });
    expect(r.statusCode).toBe(500);
    expect(r.headers['content-type']).toContain('application/problem+json');
    expect(r.json()).toMatchObject({ status: 500, codigo: 'ERRO_INTERNO' });
    expect(r.body).not.toContain('hunter2');
    expect(r.body).not.toContain('stack');
  });

  it('rota inexistente da API responde 404 em problem+json', async () => {
    const r = await amb.app.inject({ method: 'GET', url: '/api/v1/nao-existe' });
    expect(r.statusCode).toBe(404);
    expect(r.json().codigo).toBe('NAO_ENCONTRADO');
  });

  it('JSON malformado responde 400', async () => {
    const r = await amb.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: '{"login":',
    });
    expect(r.statusCode).toBe(400);
    expect(r.json().codigo).toBe('ENTRADA_INVALIDA');
  });

  it('recusa payload com __proto__ (prototype pollution)', async () => {
    const r = await amb.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: '{"login":"a","senha":"b","__proto__":{"admin":true}}',
    });
    expect(r.statusCode).toBe(400);
  });

  it('recusa corpo grande demais', async () => {
    const r = await amb.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { login: 'a', senha: 'x'.repeat(200_000) },
    });
    expect(r.statusCode).toBe(413);
  });

  it('validação de entrada responde 422 com os campos, sem ecoar os valores', async () => {
    const r = await amb.app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { login: '', senha: 'segredo' } });
    expect(r.statusCode).toBe(422);
    expect(r.json().campos).toContain('login');
    expect(r.body).not.toContain('segredo');
  });
});

describe('controle de acesso negado por padrão (OWASP A01)', () => {
  it('a app não inicia se alguma rota da API não declarar quem pode acessá-la', async () => {
    await expect(
      construirApp({
        config: configTeste(),
        db: amb.db,
        aoRegistrar: (app) => {
          app.get('/api/v1/esquecida', async () => 'ok');
        },
      }),
    ).rejects.toThrow(/esquecida/);
  });

  it('registra tentativas de acesso negado na auditoria', async () => {
    const turma = await criarTurma(amb.db);
    await criarAluno(amb.db, turma.id, { login: '2026001' });
    const s = await entrar(amb.app, '2026001');

    await chamar(amb.app, s, 'GET', '/turmas');

    const negado = await amb.db.selectFrom('auditoria').selectAll().where('resultado', '=', 'NEGADO').executeTakeFirst();
    expect(negado).toMatchObject({ usuarioId: s.usuarioId, acao: 'ACESSO_NEGADO', alvo: 'GET /api/v1/turmas' });
  });
});

describe('injeção (OWASP A05)', () => {
  it('armazena payloads de SQL e XSS como texto literal', async () => {
    const turma = await criarTurma(amb.db);
    const aluno = await criarAluno(amb.db, turma.id);
    await criarProfessor(amb.db, [turma.id], { login: 'prof.x' });
    const s = await entrar(amb.app, 'prof.x');
    const malicioso = `<script>alert(1)</script>'); DROP TABLE usuario;--`;

    const r = await chamar(amb.app, s, 'POST', '/depositos', { alunoId: aluno.id, valor: 1, descricao: malicioso });

    expect(r.statusCode).toBe(201);
    expect(r.headers['content-type']).toContain('application/json');
    const extrato = await chamar(amb.app, s, 'GET', `/alunos/${aluno.id}/transacoes`);
    expect(extrato.json().itens[0].descricao).toBe(malicioso);
    expect(await amb.db.selectFrom('usuario').select('id').execute()).toHaveLength(2);
  });

  it('parâmetro de rota que não é uuid responde 404 sem tocar no banco', async () => {
    await criarProfessor(amb.db, [], { login: 'prof.y' });
    const s = await entrar(amb.app, 'prof.y');
    const r = await chamar(amb.app, s, 'GET', `/alunos/${encodeURIComponent("1' OR '1'='1")}/transacoes`);
    expect(r.statusCode).toBe(404);
  });
});
