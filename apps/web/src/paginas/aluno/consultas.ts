import type { ItemCatalogoDTO, MetaDTO, Pagina, TransacaoDTO } from '@saturbank/shared';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '../../api/cliente';

export const useConta = () =>
  useQuery({ queryKey: ['conta'], queryFn: () => api.get<{ saldo: number; teto: number; espaco: number }>('/me/conta') });

export const useMetasDaTurma = () => useQuery({ queryKey: ['minhas-metas'], queryFn: () => api.get<MetaDTO[]>('/me/turma/metas') });

export const useMeta = (id: string) =>
  useQuery({ queryKey: ['meta', id], queryFn: () => api.get<MetaDTO & { minhaContribuicao?: number }>(`/metas/${id}`) });

export const useCatalogo = () =>
  useQuery({ queryKey: ['catalogo'], queryFn: () => api.get<ItemCatalogoDTO[]>('/catalogo'), staleTime: 5 * 60_000 });

/** Extrato paginado por cursor; `url` é '/me/transacoes' ou '/alunos/:id/transacoes'. */
export const useExtrato = (url: string) =>
  useInfiniteQuery({
    queryKey: ['extrato', url],
    queryFn: ({ pageParam }) =>
      api.get<Pagina<TransacaoDTO>>(pageParam ? `${url}?cursor=${encodeURIComponent(pageParam)}` : url),
    initialPageParam: '',
    getNextPageParam: (p) => p.proximoCursor ?? undefined,
  });
