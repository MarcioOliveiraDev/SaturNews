import { describe, expect, it } from 'vitest';
import { gerarCsv } from './csv';

describe('gerarCsv', () => {
  it('gera cabeçalho e linhas', () => {
    expect(gerarCsv(['a', 'b'], [['1', '2']])).toBe('a,b\r\n1,2\r\n');
  });

  it('coloca entre aspas valores com vírgula, aspas ou quebra de linha', () => {
    expect(gerarCsv(['x'], [['Souza, Ana'], ['diz "oi"'], ['a\nb']])).toBe('x\r\n"Souza, Ana"\r\n"diz ""oi"""\r\n"a\nb"\r\n');
  });

  it('neutraliza fórmulas de planilha (CSV injection, OWASP A05)', () => {
    const csv = gerarCsv(['x'], [['=HYPERLINK("http://mal")'], ['+1'], ['-2'], ['@SUM(A1)']]);
    expect(csv).toBe(`x\r\n"'=HYPERLINK(""http://mal"")"\r\n'+1\r\n'-2\r\n'@SUM(A1)\r\n`);
  });
});
