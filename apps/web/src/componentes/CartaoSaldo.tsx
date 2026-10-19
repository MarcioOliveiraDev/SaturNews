import { useState } from 'react';
import { formatarMoeda } from '../util/formatar';
import { IconeOlho, IconeOlhoFechado } from './Icones';

export function CartaoSaldo({ saldo, teto }: { saldo: number; teto: number }) {
  const [oculto, setOculto] = useState(false);
  const espaco = Math.max(0, teto - saldo);
  const percentual = Math.min(100, Math.round((saldo / teto) * 100));

  return (
    <section aria-label="Saldo" className="cartao granulado p-6">
      <div className="bolha -top-16 -right-10 size-48 opacity-80" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-sm text-suave">Seu saldo</p>
          <button
            type="button"
            onClick={() => setOculto((o) => !o)}
            className="grid size-11 place-items-center rounded-full bg-black/30 text-texto"
            aria-label={oculto ? 'Mostrar saldo' : 'Ocultar saldo'}
          >
            {oculto ? <IconeOlhoFechado /> : <IconeOlho />}
          </button>
        </div>
        <p className="titulo-display mt-1 text-5xl text-neon tabular-nums sm:text-6xl" aria-live="polite">
          {oculto ? '••••' : formatarMoeda(saldo)}
        </p>
        <div className="mt-5">
          <div className="h-2 overflow-hidden rounded-full bg-black/40" aria-hidden="true">
            <div className="h-full rounded-full bg-gradient-to-r from-neon to-ciano" style={{ width: `${percentual}%` }} />
          </div>
          <p className="mt-2 text-xs text-suave">
            {espaco === 0
              ? `Saldo no limite de ${formatarMoeda(teto)} — contribua com uma meta para liberar espaço!`
              : `Pode receber até ${formatarMoeda(espaco)} · limite ${formatarMoeda(teto)}`}
          </p>
        </div>
      </div>
    </section>
  );
}
