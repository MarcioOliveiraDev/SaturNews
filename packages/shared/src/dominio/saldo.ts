import { type Falha, ehValorValido } from './erros';

export const SALDO_MAXIMO = 100;

export const espacoDisponivel = (saldo: number): number => Math.max(0, SALDO_MAXIMO - saldo);

export function planejarDepositoIndividual(
  saldo: number,
  valor: number,
): { ok: true; credito: number } | Falha<'VALOR_INVALIDO' | 'TETO_SALDO'> {
  if (!ehValorValido(valor)) return { ok: false, erro: 'VALOR_INVALIDO' };
  const espaco = espacoDisponivel(saldo);
  if (valor > espaco) return { ok: false, erro: 'TETO_SALDO', maximo: espaco };
  return { ok: true, credito: valor };
}

export interface AlunoSaldo {
  alunoId: string;
  saldo: number;
}

export interface ItemLote {
  alunoId: string;
  /** Quanto o aluno efetivamente recebe; 0 quando já está no teto. */
  credito: number;
}

/** No lote, cada aluno recebe o que couber até o teto (decisão D5). */
export function planejarLote(
  alunos: AlunoSaldo[],
  valor: number,
): { ok: true; itens: ItemLote[]; total: number } | Falha<'VALOR_INVALIDO' | 'LOTE_VAZIO'> {
  if (!ehValorValido(valor)) return { ok: false, erro: 'VALOR_INVALIDO' };
  if (alunos.length === 0) return { ok: false, erro: 'LOTE_VAZIO' };
  const itens = alunos.map(({ alunoId, saldo }) => ({ alunoId, credito: Math.min(valor, espacoDisponivel(saldo)) }));
  return { ok: true, itens, total: itens.reduce((soma, i) => soma + i.credito, 0) };
}
