import { useId } from 'react';

/** "Satu", o mascote: um planetinha Saturno cujo anel é uma moeda $aturCoin$. */
export function Satu({ tamanho = 96, className = '' }: { tamanho?: number; className?: string }) {
  const id = useId();
  const corpo = `${id}-corpo`;
  const anel = `${id}-anel`;
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 120 120" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={corpo} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffd6ec" />
          <stop offset="45%" stopColor="#ff2e9a" />
          <stop offset="100%" stopColor="#8b3dff" />
        </radialGradient>
        <linearGradient id={anel} x1="0" x2="1">
          <stop offset="0%" stopColor="#5cff2e" />
          <stop offset="100%" stopColor="#22e5d4" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="66" rx="56" ry="15" fill="none" stroke={`url(#${anel})`} strokeWidth="7" transform="rotate(-14 60 66)" opacity="0.55" />
      <circle cx="60" cy="58" r="36" fill={`url(#${corpo})`} />
      {/* rosto de brinquedo, como as máscaras das peças */}
      <ellipse cx="47" cy="50" rx="6" ry="7.5" fill="#050505" />
      <ellipse cx="73" cy="50" rx="6" ry="7.5" fill="#050505" />
      <circle cx="49" cy="47.5" r="2" fill="#fff" />
      <circle cx="75" cy="47.5" r="2" fill="#fff" />
      <path d="M44 66c4 9 28 9 32 0" fill="#e01b24" stroke="#050505" strokeWidth="3" strokeLinejoin="round" />
      <path d="M50 67.5v3.5M56 68.5v4M62 68.5v4M68 67.5v3.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M8 80c30-8 74-22 104-36" fill="none" stroke={`url(#${anel})`} strokeWidth="7" strokeLinecap="round" transform="rotate(-2 60 66)" />
      <text x="96" y="40" fontFamily="Unbounded Variable, sans-serif" fontWeight="800" fontSize="16" fill="#5cff2e" transform="rotate(-14 96 40)">S$</text>
    </svg>
  );
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Satu tamanho={40} />
      <span className="titulo-display text-xl leading-none">
        <span className="text-rosa">Satur</span>
        <span className="text-neon">Bank</span>
      </span>
    </div>
  );
}
