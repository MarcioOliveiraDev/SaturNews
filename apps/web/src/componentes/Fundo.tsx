/** Fundo com bolhas líquidas e granulado. Puramente decorativo. */
export function Fundo() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="bolha animate-flutuar -top-24 -right-24 size-72 md:size-[28rem]" />
      <div className="bolha bolha-verde animate-flutuar -bottom-32 -left-24 size-80 [animation-delay:-6s] md:size-[30rem]" />
      <div className="reticula absolute top-0 left-0 h-40 w-full opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
    </div>
  );
}
