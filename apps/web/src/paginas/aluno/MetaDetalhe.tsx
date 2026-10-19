import { Link, useParams } from 'react-router';
import { AvisoErro, Carregando } from '../../componentes/Aviso';
import { BarraProgresso } from '../../componentes/BarraProgresso';
import { Titulo } from '../../componentes/Casca';
import { IconeItem, IconeSeta } from '../../componentes/Icones';
import { formatarMoeda } from '../../util/formatar';
import { useConta, useMeta } from './consultas';
import { FormContribuir } from './FormContribuir';

export function Voltar({ para }: { para: string }) {
  return (
    <Link to={para} className="grid size-11 shrink-0 place-items-center rounded-full border border-borda" aria-label="Voltar">
      <IconeSeta />
    </Link>
  );
}

export function MetaDetalhe() {
  const { id = '' } = useParams();
  const meta = useMeta(id);
  const conta = useConta();
  if (meta.isPending) return <Carregando />;
  if (meta.isError) return <AvisoErro erro={meta.error} />;
  const m = meta.data;

  return (
    <>
      <Titulo voltar={<Voltar para="/metas" />}>{m.titulo}</Titulo>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="cartao granulado p-6">
          <div className="bolha bolha-verde -right-16 -bottom-16 size-56" />
          <div className="relative">
            <div className="mb-4 grid size-16 place-items-center rounded-3xl bg-rosa/15 text-rosa">
              <IconeItem nome={m.icone} width={32} height={32} />
            </div>
            <p className="font-marker text-4xl leading-tight text-neon">
              {m.status === 'ABERTA' ? `Faltam ${formatarMoeda(m.falta)}` : m.status === 'ATINGIDA' ? 'Meta atingida! 🎉' : m.status === 'RESGATADA' ? 'Conquistada!' : 'Cancelada'}
            </p>
            <p className="mt-1 text-sm text-suave">
              {formatarMoeda(m.arrecadado)} de {formatarMoeda(m.valorAlvo)} · {m.percentual}%
            </p>
            <div className="mt-5">
              <BarraProgresso percentual={m.percentual} rotulo={`Progresso: ${m.titulo}`} grande />
            </div>
            {!!m.minhaContribuicao && (
              <p className="mt-4 text-sm">
                Você já colocou <strong className="text-neon">{formatarMoeda(m.minhaContribuicao)}</strong> nesta meta.
              </p>
            )}
          </div>
        </section>
        {conta.data && <FormContribuir meta={m} saldo={conta.data.saldo} />}
      </div>
    </>
  );
}
