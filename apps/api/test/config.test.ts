import { describe, expect, it } from 'vitest';
import { carregarConfig } from '../src/config';

const base = { DATABASE_URL: 'postgres://u:p@localhost:5432/x' };

describe('configuração (OWASP A02)', () => {
  it('falha na inicialização sem DATABASE_URL', () => {
    expect(() => carregarConfig({})).toThrow(/DATABASE_URL/);
  });

  it('cookie seguro em produção', () => {
    expect(carregarConfig({ ...base, NODE_ENV: 'production' }).cookieSeguro).toBe(true);
    expect(carregarConfig({ ...base, NODE_ENV: 'development' }).cookieSeguro).toBe(false);
  });

  it('limite de login por IP comporta uma sala inteira atrás do mesmo IP', () => {
    expect(carregarConfig(base).limiteRequisicoesLogin).toBeGreaterThanOrEqual(40);
    expect(carregarConfig({ ...base, LIMITE_LOGIN_POR_MINUTO: '120' }).limiteRequisicoesLogin).toBe(120);
  });
});
