import { describe, expect, it } from 'vitest';
import {
  type Meta,
  aplicarContribuicao,
  calcularEstornos,
  percentualArrecadado,
  podeCancelar,
  podeResgatar,
  quantoFalta,
} from './meta';

const meta = (parcial: Partial<Meta> = {}): Meta => ({ valorAlvo: 200, arrecadado: 50, status: 'ABERTA', ...parcial });

describe('progresso da meta', () => {
  it('calcula quanto falta', () => {
    expect(quantoFalta(meta())).toBe(150);
    expect(quantoFalta(meta({ arrecadado: 200, status: 'ATINGIDA' }))).toBe(0);
  });

  it('calcula o percentual arrecadado arredondado para baixo', () => {
    expect(percentualArrecadado(meta({ valorAlvo: 300, arrecadado: 100 }))).toBe(33);
    expect(percentualArrecadado(meta({ arrecadado: 200 }))).toBe(100);
  });
});

describe('contribuição', () => {
  it('aceita contribuição dentro do saldo e do que falta', () => {
    expect(aplicarContribuicao(meta(), 30, 40)).toEqual({ ok: true, arrecadado: 90, status: 'ABERTA' });
  });

  it('muda o status para ATINGIDA quando completa o alvo', () => {
    expect(aplicarContribuicao(meta({ arrecadado: 180 }), 50, 20)).toEqual({
      ok: true,
      arrecadado: 200,
      status: 'ATINGIDA',
    });
  });

  it.each([0, -1, 1.5])('recusa valor inválido %s', (valor) => {
    expect(aplicarContribuicao(meta(), 50, valor)).toEqual({ ok: false, erro: 'VALOR_INVALIDO' });
  });

  it('recusa contribuição maior que o saldo do aluno', () => {
    expect(aplicarContribuicao(meta(), 10, 20)).toEqual({ ok: false, erro: 'SALDO_INSUFICIENTE' });
  });

  it('recusa contribuição maior que o que falta e informa o máximo', () => {
    expect(aplicarContribuicao(meta({ arrecadado: 190 }), 50, 20)).toEqual({
      ok: false,
      erro: 'EXCEDE_META',
      maximo: 10,
    });
  });

  it.each(['ATINGIDA', 'RESGATADA', 'CANCELADA'] as const)('recusa contribuição em meta %s', (status) => {
    expect(aplicarContribuicao(meta({ status }), 50, 10)).toEqual({ ok: false, erro: 'META_FECHADA' });
  });
});

describe('ciclo de vida', () => {
  it('só meta ATINGIDA pode ser resgatada', () => {
    expect(podeResgatar('ATINGIDA')).toBe(true);
    expect(podeResgatar('ABERTA')).toBe(false);
    expect(podeResgatar('RESGATADA')).toBe(false);
  });

  it('só meta ABERTA pode ser cancelada', () => {
    expect(podeCancelar('ABERTA')).toBe(true);
    expect(podeCancelar('ATINGIDA')).toBe(false);
    expect(podeCancelar('CANCELADA')).toBe(false);
  });

  it('calcula um estorno por aluno com a soma exata do que ele contribuiu', () => {
    expect(
      calcularEstornos([
        { alunoId: 'a', valor: 10 },
        { alunoId: 'b', valor: 5 },
        { alunoId: 'a', valor: 7 },
      ]),
    ).toEqual([
      { alunoId: 'a', valor: 17 },
      { alunoId: 'b', valor: 5 },
    ]);
  });
});
