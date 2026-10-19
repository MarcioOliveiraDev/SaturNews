import { type Falha, ehValorValido } from './erros';

export const STATUS_META = ['ABERTA', 'ATINGIDA', 'RESGATADA', 'CANCELADA'] as const;
export type StatusMeta = (typeof STATUS_META)[number];

export interface Meta {
  valorAlvo: number;
  arrecadado: number;
  status: StatusMeta;
}

export const quantoFalta = (meta: Meta): number => Math.max(0, meta.valorAlvo - meta.arrecadado);

export const percentualArrecadado = (meta: Meta): number =>
  Math.min(100, Math.floor((meta.arrecadado / meta.valorAlvo) * 100));

export function aplicarContribuicao(
  meta: Meta,
  saldoAluno: number,
  valor: number,
):
  | { ok: true; arrecadado: number; status: StatusMeta }
  | Falha<'VALOR_INVALIDO' | 'META_FECHADA' | 'SALDO_INSUFICIENTE' | 'EXCEDE_META'> {
  if (!ehValorValido(valor)) return { ok: false, erro: 'VALOR_INVALIDO' };
  if (meta.status !== 'ABERTA') return { ok: false, erro: 'META_FECHADA' };
  if (valor > saldoAluno) return { ok: false, erro: 'SALDO_INSUFICIENTE' };
  const falta = quantoFalta(meta);
  if (valor > falta) return { ok: false, erro: 'EXCEDE_META', maximo: falta };
  const arrecadado = meta.arrecadado + valor;
  return { ok: true, arrecadado, status: arrecadado === meta.valorAlvo ? 'ATINGIDA' : 'ABERTA' };
}

export const podeResgatar = (status: StatusMeta): boolean => status === 'ATINGIDA';
export const podeCancelar = (status: StatusMeta): boolean => status === 'ABERTA';

export function calcularEstornos(contribuicoes: { alunoId: string; valor: number }[]): { alunoId: string; valor: number }[] {
  const porAluno = new Map<string, number>();
  for (const { alunoId, valor } of contribuicoes) porAluno.set(alunoId, (porAluno.get(alunoId) ?? 0) + valor);
  return [...porAluno].map(([alunoId, valor]) => ({ alunoId, valor }));
}
