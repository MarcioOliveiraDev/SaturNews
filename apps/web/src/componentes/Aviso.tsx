import type { ReactNode } from 'react';
import { ErroApi } from '../api/cliente';

export function Aviso({ tipo = 'erro', children }: { tipo?: 'erro' | 'sucesso' | 'info'; children: ReactNode }) {
  const cor = { erro: 'border-perigo/50 bg-perigo/10 text-red-200', sucesso: 'border-neon/40 bg-neon/10 text-neon', info: 'border-ciano/40 bg-ciano/10 text-ciano' }[tipo];
  return (
    <div role={tipo === 'erro' ? 'alert' : 'status'} className={`rounded-2xl border px-4 py-3 text-sm ${cor}`}>
      {children}
    </div>
  );
}

export function AvisoErro({ erro }: { erro: unknown }) {
  if (!erro) return null;
  const e = erro instanceof ErroApi ? erro : null;
  return (
    <Aviso>
      {e?.message ?? 'Algo deu errado. Tente novamente.'}
      {e?.detalhes.map((d) => (
        <span key={d} className="block">
          {d}
        </span>
      ))}
    </Aviso>
  );
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-12 text-suave">
      <span className="size-5 animate-spin rounded-full border-2 border-neon border-t-transparent" aria-hidden="true" />
      {texto}
    </div>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="cartao reticula p-6 text-center text-sm text-suave">{children}</p>;
}
