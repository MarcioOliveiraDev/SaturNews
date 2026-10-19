import type { UsuarioLogado } from '@saturbank/shared';
import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ErroApi, api, definirCsrf } from './cliente';

export const CHAVE_SESSAO = ['me'] as const;

/**
 * Troca o usuário da sessão descartando os dados do anterior. Não usa `clear()`:
 * ele removeria também a consulta ['me'] que o App observa, e a tela não mudaria.
 */
export function trocarUsuario(qc: QueryClient, usuario: UsuarioLogado | null) {
  definirCsrf(usuario?.csrfToken ?? null);
  qc.removeQueries({ predicate: (q) => q.queryKey[0] !== CHAVE_SESSAO[0] });
  qc.setQueryData(CHAVE_SESSAO, usuario);
}

export function useSessao() {
  return useQuery({
    queryKey: CHAVE_SESSAO,
    queryFn: async () => {
      try {
        const u = await api.get<UsuarioLogado>('/me');
        definirCsrf(u.csrfToken);
        return u;
      } catch (e) {
        if (e instanceof ErroApi && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: Infinity,
  });
}

export function useEntrar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: { login: string; senha: string }) => api.post<{ usuario: UsuarioLogado }>('/auth/login', dados),
    onSuccess: ({ usuario }) => trocarUsuario(qc, usuario),
  });
}

export function useSair() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>('/auth/logout'),
    onSettled: () => trocarUsuario(qc, null),
  });
}
