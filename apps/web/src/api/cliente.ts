import { MENSAGENS_ERRO } from '@saturbank/shared';

export class ErroApi extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
    public readonly dados: Record<string, unknown> = {},
  ) {
    super(MENSAGENS_ERRO[codigo] ?? MENSAGENS_ERRO.ERRO_INTERNO);
  }
  get maximo(): number | undefined {
    return typeof this.dados.maximo === 'number' ? this.dados.maximo : undefined;
  }
  get detalhes(): string[] {
    const m = this.dados.mensagens;
    return Array.isArray(m) ? m.map(String) : [];
  }
}

let csrf: string | null = null;
let aoExpirar: (() => void) | null = null;

export const definirCsrf = (token: string | null) => {
  csrf = token;
};
export const definirAoExpirar = (fn: (() => void) | null) => {
  aoExpirar = fn;
};

export const novaChaveIdempotencia = () => crypto.randomUUID();

async function requisitar<T>(metodo: string, url: string, corpo?: unknown, opcoes: { chaveIdempotencia?: string } = {}): Promise<T> {
  const headers = new Headers({ accept: 'application/json' });
  if (corpo !== undefined) headers.set('content-type', 'application/json');
  if (metodo !== 'GET' && csrf) headers.set('x-csrf-token', csrf);
  if (opcoes.chaveIdempotencia) headers.set('idempotency-key', opcoes.chaveIdempotencia);

  let r: Response;
  try {
    r = await fetch(`/api/v1${url}`, {
      method: metodo,
      credentials: 'same-origin',
      headers,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  } catch {
    throw new ErroApi(0, 'SEM_CONEXAO');
  }
  if (r.status === 204) return undefined as T;
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) {
    const codigo = typeof dados.codigo === 'string' ? dados.codigo : 'ERRO_INTERNO';
    if (r.status === 401 && codigo === 'NAO_AUTENTICADO') aoExpirar?.();
    throw new ErroApi(r.status, codigo, dados);
  }
  return dados as T;
}

export const api = {
  get: <T>(url: string) => requisitar<T>('GET', url),
  post: <T>(url: string, corpo?: unknown, opcoes?: { chaveIdempotencia?: string }) => requisitar<T>('POST', url, corpo, opcoes),
};
