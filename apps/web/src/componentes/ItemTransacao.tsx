import type { TipoTransacao, TransacaoDTO } from '@saturbank/shared';
import { formatarData, formatarMoeda } from '../util/formatar';
import { IconeEntrada, IconeEstorno, IconeSaida, IconeZerar } from './Icones';

const ESTILO: Record<TipoTransacao, { rotulo: string; sinal: '+' | '−'; cor: string; Icone: typeof IconeEntrada }> = {
  DEPOSITO: { rotulo: 'Depósito', sinal: '+', cor: 'text-neon bg-neon/10', Icone: IconeEntrada },
  CONTRIBUICAO: { rotulo: 'Contribuição', sinal: '−', cor: 'text-rosa bg-rosa/10', Icone: IconeSaida },
  ESTORNO: { rotulo: 'Estorno', sinal: '+', cor: 'text-ciano bg-ciano/10', Icone: IconeEstorno },
  ZERAMENTO: { rotulo: 'Fim do ano letivo', sinal: '−', cor: 'text-suave bg-white/5', Icone: IconeZerar },
};

export function ItemTransacao({ transacao: t }: { transacao: TransacaoDTO }) {
  const e = ESTILO[t.tipo];
  return (
    <li className="flex items-center gap-3 py-3">
      <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${e.cor}`}>
        <e.Icone width={20} height={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{t.descricao}</p>
        <p className="truncate text-xs text-suave">
          {e.rotulo}
          {t.tipo === 'DEPOSITO' ? ` · ${t.autor}` : ''} · {formatarData(t.criadaEm)}
        </p>
      </div>
      <span className={`font-display text-sm font-semibold tabular-nums ${e.sinal === '+' ? 'text-neon' : 'text-texto'}`}>
        {e.sinal}
        {formatarMoeda(t.valor)}
      </span>
    </li>
  );
}
