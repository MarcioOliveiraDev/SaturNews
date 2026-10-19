import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...p,
});

export const IconeCasa = (p: P) => (
  <svg {...base(p)}><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>
);
export const IconeAlvo = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></svg>
);
export const IconeExtrato = (p: P) => (
  <svg {...base(p)}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>
);
export const IconeSair = (p: P) => (
  <svg {...base(p)}><path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4" /><path d="M6 12h10" /></svg>
);
export const IconeOlho = (p: P) => (
  <svg {...base(p)}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
);
export const IconeOlhoFechado = (p: P) => (
  <svg {...base(p)}><path d="M3 3l18 18" /><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.7 8.5 2 12 2 12s3.5 7 10 7a9.8 9.8 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
);
export const IconeSeta = (p: P) => (
  <svg {...base(p)}><path d="M15 18l-6-6 6-6" /></svg>
);
export const IconeMais = (p: P) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconeEntrada = (p: P) => (
  <svg {...base(p)}><path d="M12 4v13" /><path d="M6 11l6 6 6-6" /><path d="M5 20h14" /></svg>
);
export const IconeSaida = (p: P) => (
  <svg {...base(p)}><path d="M12 20V7" /><path d="M6 13l6-6 6 6" /><path d="M5 4h14" /></svg>
);
export const IconeEstorno = (p: P) => (
  <svg {...base(p)}><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></svg>
);
export const IconeZerar = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></svg>
);
export const IconeUsuarios = (p: P) => (
  <svg {...base(p)}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" /></svg>
);
export const IconeLampada = (p: P) => (
  <svg {...base(p)}><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.6 10.8c.8.6 1.1 1.4 1.1 2.2h5c0-.8.3-1.6 1.1-2.2A6 6 0 0 0 12 3z" /></svg>
);
export const IconeEscudo = (p: P) => (
  <svg {...base(p)}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="m9 12 2 2 4-4" /></svg>
);
export const IconeCheck = (p: P) => (
  <svg {...base(p)}><path d="m5 12 5 5 9-10" /></svg>
);

// Ícones dos itens do catálogo
const ICONES_ITEM: Record<string, (p: P) => React.JSX.Element> = {
  quadra: (p) => (
    <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
  ),
  filme: (p) => (
    <svg {...base(p)}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4" /></svg>
  ),
  laboratorio: (p) => (
    <svg {...base(p)}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /><path d="m9 9 2 2-2 2M13 13h2" /></svg>
  ),
  tabuleiro: (p) => (
    <svg {...base(p)}><rect x="4" y="4" width="16" height="16" rx="3" /><circle cx="9" cy="9" r="1.2" fill="currentColor" /><circle cx="15" cy="15" r="1.2" fill="currentColor" /><circle cx="15" cy="9" r="1.2" fill="currentColor" /><circle cx="9" cy="15" r="1.2" fill="currentColor" /></svg>
  ),
};

export function IconeItem({ nome, ...p }: P & { nome: string }) {
  const Icone =
    ICONES_ITEM[nome] ??
    ((q: P) => (
      <svg {...base(q)}><path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z" /></svg>
    ));
  return <Icone {...p} />;
}
