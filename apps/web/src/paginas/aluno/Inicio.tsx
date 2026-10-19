import type { UsuarioLogado } from '@saturbank/shared';
import { Link } from 'react-router';
import { AvisoErro, Carregando, Vazio } from '../../componentes/Aviso';
import { CartaoMeta } from '../../componentes/CartaoMeta';
import { CartaoSaldo } from '../../componentes/CartaoSaldo';
import { ListaExtrato } from '../../componentes/ListaExtrato';
import { useConta, useMetasDaTurma } from './consultas';

export function InicioAluno({ usuario }: { usuario: UsuarioLogado }) {
  const conta = useConta();
  const metas = useMetasDaTurma();
  const abertas = metas.data?.filter((m) => m.status !== 'RESGATADA') ?? [];

  return (
    <div className="space-y-8">
      <div>
        <p className="font-marker text-xl text-rosa">Oi, {usuario.nome.split(' ')[0]}!</p>
        <p className="text-sm text-suave">Turma {usuario.turma?.nome}</p>
      </div>

      {conta.isPending ? <Carregando /> : conta.isError ? <AvisoErro erro={conta.error} /> : <CartaoSaldo saldo={conta.data.saldo} teto={conta.data.teto} />}

      <section aria-labelledby="titulo-metas">
        <div className="mb-3 flex items-end justify-between">
          <h2 id="titulo-metas" className="titulo-display text-lg">Metas da turma</h2>
          <Link to="/metas" className="text-sm text-neon hover:underline">Ver todas</Link>
        </div>
        {metas.isPending ? (
          <Carregando />
        ) : abertas.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {abertas.slice(0, 4).map((m) => (
              <CartaoMeta key={m.id} meta={m} para={`/metas/${m.id}`} />
            ))}
          </div>
        ) : (
          <Vazio>
            Nenhuma meta aberta. <Link to="/sugerir" className="text-neon underline">Sugira uma ao professor!</Link>
          </Vazio>
        )}
      </section>

      <section aria-labelledby="titulo-ultimas">
        <div className="mb-3 flex items-end justify-between">
          <h2 id="titulo-ultimas" className="titulo-display text-lg">Últimas movimentações</h2>
          <Link to="/extrato" className="text-sm text-neon hover:underline">Extrato</Link>
        </div>
        <ListaExtrato url="/me/transacoes" limite={5} />
      </section>
    </div>
  );
}
