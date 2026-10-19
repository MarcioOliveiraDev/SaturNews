import { describe, expect, it } from 'vitest';
import { previaLote } from './lote';

describe('previaLote', () => {
  const alunos = [
    { id: 'a', nome: 'Ana', matricula: '1', saldo: 0 },
    { id: 'b', nome: 'Bia', matricula: '2', saldo: 95 },
    { id: 'c', nome: 'Caio', matricula: '3', saldo: 100 },
    { id: 'd', nome: 'Davi', matricula: '4', saldo: 10 },
  ];

  it('calcula o total que será creditado respeitando o teto de cada aluno', () => {
    expect(previaLote(alunos, new Set(['a', 'b', 'c']), 10)).toEqual({ quantidade: 3, total: 15, parciais: ['Bia'], noTeto: ['Caio'] });
  });

  it('com valor inválido o total é zero', () => {
    expect(previaLote(alunos, new Set(['a']), 0)).toEqual({ quantidade: 1, total: 0, parciais: [], noTeto: [] });
  });
});
