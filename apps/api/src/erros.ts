/** Erro de negócio/autorização com status HTTP e código estável para o frontend. */
export class ErroApp extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly codigo: string,
    public readonly extras: Record<string, unknown> = {},
  ) {
    super(codigo);
  }
}

export const naoEncontrado = () => new ErroApp(404, 'NAO_ENCONTRADO');
export const proibido = () => new ErroApp(403, 'PROIBIDO');
export const estadoInvalido = () => new ErroApp(409, 'ESTADO_INVALIDO');
export const entradaInvalida = (extras: Record<string, unknown> = {}) => new ErroApp(422, 'ENTRADA_INVALIDA', extras);
