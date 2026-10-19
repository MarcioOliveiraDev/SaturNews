import { useExtrato } from '../paginas/aluno/consultas';
import { AvisoErro, Carregando, Vazio } from './Aviso';
import { ItemTransacao } from './ItemTransacao';

export function ListaExtrato({ url, limite }: { url: string; limite?: number }) {
  const q = useExtrato(url);
  if (q.isPending) return <Carregando />;
  if (q.isError) return <AvisoErro erro={q.error} />;
  const itens = q.data.pages.flatMap((p) => p.itens);
  if (!itens.length) return <Vazio>Nenhuma movimentação ainda.</Vazio>;
  const visiveis = limite ? itens.slice(0, limite) : itens;
  return (
    <div className="cartao px-4 sm:px-5">
      <ul className="divide-y divide-borda">
        {visiveis.map((t) => (
          <ItemTransacao key={t.id} transacao={t} />
        ))}
      </ul>
      {!limite && q.hasNextPage && (
        <div className="py-4 text-center">
          <button type="button" className="botao-fantasma" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>
            {q.isFetchingNextPage ? 'Carregando…' : 'Carregar mais'}
          </button>
        </div>
      )}
    </div>
  );
}
