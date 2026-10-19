import { describe, expect, it } from 'vitest';
import { formatarData, formatarMoeda } from './formatar';

describe('formatarMoeda', () => {
  it('formata valores em $aturCoin$ com separador de milhar', () => {
    expect(formatarMoeda(0)).toBe('S$ 0');
    expect(formatarMoeda(75)).toBe('S$ 75');
    expect(formatarMoeda(1250)).toBe('S$ 1.250');
  });
});

describe('formatarData', () => {
  const agora = new Date('2026-10-19T15:00:00');

  it('mostra "hoje" e "ontem" com horário', () => {
    expect(formatarData(new Date('2026-10-19T09:05:00').toISOString(), agora)).toBe('hoje, 09:05');
    expect(formatarData(new Date('2026-10-18T22:30:00').toISOString(), agora)).toBe('ontem, 22:30');
  });

  it('mostra a data para dias anteriores', () => {
    expect(formatarData(new Date('2026-10-02T10:00:00').toISOString(), agora)).toBe('02/10/2026');
  });
});
