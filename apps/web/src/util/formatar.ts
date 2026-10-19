const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

export const formatarMoeda = (valor: number) => `S$ ${numero.format(valor)}`;

const doisDigitos = (n: number) => String(n).padStart(2, '0');
const mesmoDia = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function formatarData(iso: string, agora = new Date()): string {
  const d = new Date(iso);
  const hora = `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;
  if (mesmoDia(d, agora)) return `hoje, ${hora}`;
  const ontem = new Date(agora);
  ontem.setDate(agora.getDate() - 1);
  if (mesmoDia(d, ontem)) return `ontem, ${hora}`;
  return `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}/${d.getFullYear()}`;
}
