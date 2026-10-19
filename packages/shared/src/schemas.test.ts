import { describe, expect, it } from 'vitest';
import { contribuicaoSchema, depositoLoteSchema, depositoSchema, loginSchema, sugestaoSchema, trocarSenhaSchema } from './schemas';

const uuid = '0f8fad5b-d9cb-469f-a165-70867728950e';

describe('schemas de entrada', () => {
  it('login exige login e senha não vazios e limita o tamanho', () => {
    expect(loginSchema.safeParse({ login: '2026001', senha: 'x' }).success).toBe(true);
    expect(loginSchema.safeParse({ login: '', senha: 'x' }).success).toBe(false);
    expect(loginSchema.safeParse({ login: 'a'.repeat(65), senha: 'x' }).success).toBe(false);
    expect(loginSchema.safeParse({ login: 'a', senha: 'x'.repeat(129) }).success).toBe(false);
  });

  it('nova senha exige 8+ caracteres e recusa senhas comuns', () => {
    expect(trocarSenhaSchema.safeParse({ senhaAtual: 'a', novaSenha: 'curta' }).success).toBe(false);
    expect(trocarSenhaSchema.safeParse({ senhaAtual: 'a', novaSenha: '12345678' }).success).toBe(false);
    expect(trocarSenhaSchema.safeParse({ senhaAtual: 'a', novaSenha: 'senha123' }).success).toBe(false);
    expect(trocarSenhaSchema.safeParse({ senhaAtual: 'a', novaSenha: 'Anel-de-Saturno7' }).success).toBe(true);
  });

  it('depósito exige aluno uuid, valor inteiro de 1 a 100 e descrição', () => {
    const ok = { alunoId: uuid, valor: 10, descricao: 'Feira de ciências' };
    expect(depositoSchema.safeParse(ok).success).toBe(true);
    expect(depositoSchema.safeParse({ ...ok, alunoId: '1 OR 1=1' }).success).toBe(false);
    expect(depositoSchema.safeParse({ ...ok, valor: 101 }).success).toBe(false);
    expect(depositoSchema.safeParse({ ...ok, valor: '10' }).success).toBe(false);
    expect(depositoSchema.safeParse({ ...ok, descricao: '  ' }).success).toBe(false);
    expect(depositoSchema.safeParse({ ...ok, descricao: 'x'.repeat(121) }).success).toBe(false);
  });

  it('depósito em lote aceita lista de alunos ou "todos", mas não ambos nem nenhum', () => {
    const base = { turmaId: uuid, valor: 5, descricao: 'Participação' };
    expect(depositoLoteSchema.safeParse({ ...base, alunoIds: [uuid] }).success).toBe(true);
    expect(depositoLoteSchema.safeParse({ ...base, todos: true }).success).toBe(true);
    expect(depositoLoteSchema.safeParse({ ...base }).success).toBe(false);
    expect(depositoLoteSchema.safeParse({ ...base, todos: true, alunoIds: [uuid] }).success).toBe(false);
    expect(depositoLoteSchema.safeParse({ ...base, alunoIds: [] }).success).toBe(false);
  });

  it('rejeita campos desconhecidos (mass assignment)', () => {
    expect(contribuicaoSchema.safeParse({ valor: 5, alunoId: uuid }).success).toBe(false);
  });

  it('sugestão exige item do catálogo ou texto curto', () => {
    expect(sugestaoSchema.safeParse({ itemId: uuid }).success).toBe(true);
    expect(sugestaoSchema.safeParse({ texto: 'Piquenique no pátio' }).success).toBe(true);
    expect(sugestaoSchema.safeParse({}).success).toBe(false);
    expect(sugestaoSchema.safeParse({ texto: 'x'.repeat(141) }).success).toBe(false);
  });
});
