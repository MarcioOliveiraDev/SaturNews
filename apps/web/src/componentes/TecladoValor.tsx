import { useId } from 'react';
import { formatarMoeda } from '../util/formatar';

interface Props {
  valor: number;
  aoMudar: (v: number) => void;
  atalhos: number[];
  maximo?: number;
  rotulo: string;
}

export function TecladoValor({ valor, aoMudar, atalhos, maximo, rotulo }: Props) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="rotulo">
        {rotulo}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-display text-suave">S$</span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          className="campo titulo-display pl-12 text-2xl"
          value={valor > 0 ? String(valor) : ''}
          placeholder="0"
          onChange={(e) => aoMudar(Number(e.target.value.replace(/\D/g, '').slice(0, 6)) || 0)}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {atalhos.map((a) => (
          <button key={a} type="button" className="botao-fantasma min-h-10 px-4" onClick={() => aoMudar(a)}>
            {formatarMoeda(a)}
          </button>
        ))}
        {maximo !== undefined && maximo > 0 && (
          <button type="button" className="botao-fantasma min-h-10 px-4 text-neon" onClick={() => aoMudar(maximo)}>
            Máximo ({formatarMoeda(maximo)})
          </button>
        )}
      </div>
    </div>
  );
}
