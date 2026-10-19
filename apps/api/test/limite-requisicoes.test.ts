import { describe, expect, it } from 'vitest';
import { usarAmbiente } from './helpers';

const amb = usarAmbiente({ limiteRequisicoesLogin: 3 });

describe('rate limit do login (OWASP A07)', () => {
  it('limita tentativas por IP mesmo com logins diferentes', async () => {
    const tentar = (login: string, ip: string) =>
      amb.app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { login, senha: 'x' }, remoteAddress: ip });

    for (let i = 0; i < 3; i++) expect((await tentar(`x${i}`, '10.1.1.1')).statusCode).toBe(401);

    const r = await tentar('outro', '10.1.1.1');
    expect(r.statusCode).toBe(429);
    expect(r.json().codigo).toBe('MUITAS_REQUISICOES');
    expect((await tentar('outro', '10.2.2.2')).statusCode).toBe(401);
  });
});
