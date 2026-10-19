export function BarraProgresso({ percentual, rotulo, grande = false }: { percentual: number; rotulo: string; grande?: boolean }) {
  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentual}
      className={`overflow-hidden rounded-full bg-black/50 ${grande ? 'h-5' : 'h-3'}`}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-neon via-ciano to-rosa transition-[width] duration-700"
        style={{ width: `${Math.max(percentual, percentual > 0 ? 3 : 0)}%` }}
      />
    </div>
  );
}
