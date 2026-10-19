import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErroApi, api, definirCsrf, definirAoExpirar } from './cliente';

function respostaJson(status: number, corpo: unknown, tipo = 'application/json') {
  return new Response(JSON.stringify(corpo), { status, headers: { 'content-type': tipo } });
}

afterEach(() => {
  vi.restoreAllMocks();
  definirCsrf(null);
});

describe('cliente da API', () => {
  it('GET usa a mesma origem com cookies e sem header CSRF', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaJson(200, { ok: true }));
    expect(await api.get('/me/conta')).toEqual({ ok: true });
    const [url, init] = f.mock.calls[0]!;
    expect(url).toBe('/api/v1/me/conta');
    expect(init?.credentials).toBe('same-origin');
    expect(new Headers(init?.headers).has('x-csrf-token')).toBe(false);
  });

  it('POST envia JSON com o token CSRF', async () => {
    definirCsrf('token-123');
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaJson(201, { id: 1 }));
    await api.post('/depositos', { valor: 5 });
    const init = f.mock.calls[0]![1]!;
    const h = new Headers(init.headers);
    expect(h.get('x-csrf-token')).toBe('token-123');
    expect(h.get('content-type')).toBe('application/json');
    expect(init.body).toBe('{"valor":5}');
  });

  it('operações financeiras enviam Idempotency-Key', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaJson(201, {}));
    await api.post('/depositos', { valor: 5 }, { chaveIdempotencia: 'abc-12345678' });
    expect(new Headers(f.mock.calls[0]![1]!.headers).get('idempotency-key')).toBe('abc-12345678');
  });

  it('converte problem+json em ErroApi com mensagem amigável', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      respostaJson(422, { status: 422, codigo: 'TETO_SALDO', maximo: 15 }, 'application/problem+json'),
    );
    const erro = await api.post('/depositos', {}).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroApi);
    expect(erro).toMatchObject({ status: 422, codigo: 'TETO_SALDO', maximo: 15 });
    expect((erro as ErroApi).message).toMatch(/S\$ 100/);
  });

  it('avisa quando a sessão expira', async () => {
    const aoExpirar = vi.fn();
    definirAoExpirar(aoExpirar);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaJson(401, { status: 401, codigo: 'NAO_AUTENTICADO' }));
    await expect(api.get('/me/conta')).rejects.toBeInstanceOf(ErroApi);
    expect(aoExpirar).toHaveBeenCalled();
  });

  it('falha de rede vira ErroApi com mensagem amigável', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(api.get('/me')).rejects.toMatchObject({ codigo: 'SEM_CONEXAO' });
  });
});
