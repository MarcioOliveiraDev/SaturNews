import { describe, expect, it } from 'vitest';
import { SALDO_MAXIMO, espacoDisponivel, planejarDepositoIndividual, planejarLote } from './saldo';

describe('teto de saldo do aluno', () => {
  it('é de S$ 100', () => {
    expect(SALDO_MAXIMO).toBe(100);
  });

  it('calcula o espaço disponível até o teto', () => {
    expect(espacoDisponivel(0)).toBe(100);
    expect(espacoDisponivel(85)).toBe(15);
    expect(espacoDisponivel(100)).toBe(0);
  });
});

describe('depósito individual', () => {
  it('aceita depósito que cabe no teto', () => {
    expect(planejarDepositoIndividual(40, 60)).toEqual({ ok: true, credito: 60 });
  });

  it('recusa depósito que ultrapassaria o teto e informa quanto cabe', () => {
    expect(planejarDepositoIndividual(85, 20)).toEqual({ ok: false, erro: 'TETO_SALDO', maximo: 15 });
  });

  it.each([0, -5, 2.5, Number.NaN])('recusa valor inválido %s', (valor) => {
    expect(planejarDepositoIndividual(0, valor)).toEqual({ ok: false, erro: 'VALOR_INVALIDO' });
  });
});

describe('depósito em lote', () => {
  it('credita o valor cheio a quem tem espaço, o que couber a quem está perto do teto e pula quem está no teto', () => {
    const plano = planejarLote(
      [
        { alunoId: 'a', saldo: 0 },
        { alunoId: 'b', saldo: 95 },
        { alunoId: 'c', saldo: 100 },
      ],
      10,
    );
    expect(plano).toEqual({
      ok: true,
      itens: [
        { alunoId: 'a', credito: 10 },
        { alunoId: 'b', credito: 5 },
        { alunoId: 'c', credito: 0 },
      ],
      total: 15,
    });
  });

  it('recusa valor inválido', () => {
    expect(planejarLote([{ alunoId: 'a', saldo: 0 }], 0)).toEqual({ ok: false, erro: 'VALOR_INVALIDO' });
  });

  it('recusa lote vazio', () => {
    expect(planejarLote([], 10)).toEqual({ ok: false, erro: 'LOTE_VAZIO' });
  });
});
