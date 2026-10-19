import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';

export function renderizar(ui: ReactNode, rota = '/') {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return {
    cliente,
    ...render(
      <QueryClientProvider client={cliente}>
        <MemoryRouter initialEntries={[rota]}>{ui}</MemoryRouter>
      </QueryClientProvider>,
    ),
  };
}

/** Simula a API: cada chave "METODO /rota" devolve [status, corpo]. */
export function simularApi(rotas: Record<string, [number, unknown] | ((corpo: unknown) => [number, unknown])>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    const chave = `${init?.method ?? 'GET'} ${String(url).replace('/api/v1', '')}`;
    const r = rotas[chave];
    if (!r) return new Response(JSON.stringify({ codigo: 'NAO_ENCONTRADO' }), { status: 404 });
    const [status, corpo] = typeof r === 'function' ? r(init?.body ? JSON.parse(String(init.body)) : undefined) : r;
    return new Response(status === 204 ? null : JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } });
  });
}
