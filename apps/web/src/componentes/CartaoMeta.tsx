import type { MetaDTO } from '@saturbank/shared';
import { Link } from 'react-router';
import { formatarMoeda } from '../util/formatar';
import { BarraProgresso } from './BarraProgresso';
import { IconeItem } from './Icones';

const ROTULO_STATUS: Record<MetaDTO['status'], string> = {
  ABERTA: 'Aberta',
  ATINGIDA: 'Meta atingida! 🎉',
  RESGATADA: 'Conquistada ✔',
  CANCELADA: 'Cancelada',
};

export function CartaoMeta({ meta, para }: { meta: MetaDTO; para?: string }) {
  const conteudo = (
    <>
      <div className="flex items-start gap-3">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-rosa/15 text-rosa">
          <IconeItem nome={meta.icone} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="titulo-display truncate text-base">{meta.titulo}</h3>
          <p className="text-xs text-suave">
            {formatarMoeda(meta.arrecadado)} de {formatarMoeda(meta.valorAlvo)}
          </p>
        </div>
        <span className="font-display text-sm text-neon tabular-nums">{meta.percentual}%</span>
      </div>
      <div className="mt-4">
        <BarraProgresso percentual={meta.percentual} rotulo={`Progresso: ${meta.titulo}`} />
      </div>
      <p className={`mt-3 font-marker text-lg ${meta.status === 'ABERTA' ? 'text-neon' : 'text-amarelo'}`}>
        {meta.status === 'ABERTA' ? `Faltam ${formatarMoeda(meta.falta)}` : ROTULO_STATUS[meta.status]}
      </p>
    </>
  );
  const classe = 'cartao block p-5 transition hover:border-rosa/60';
  return para ? (
    <Link to={para} className={classe}>
      {conteudo}
    </Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}
