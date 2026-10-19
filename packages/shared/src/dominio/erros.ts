export type CodigoErro =
  | 'VALOR_INVALIDO'
  | 'TETO_SALDO'
  | 'LOTE_VAZIO'
  | 'SALDO_INSUFICIENTE'
  | 'EXCEDE_META'
  | 'META_FECHADA';

export type Falha<C extends CodigoErro = CodigoErro> = { ok: false; erro: C; maximo?: number };

export const ehValorValido = (valor: number): boolean => Number.isInteger(valor) && valor > 0;
