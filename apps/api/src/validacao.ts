import type { ZodType, ZodTypeDef } from 'zod';
import { ErroApp, naoEncontrado } from './erros';

export function validar<T>(schema: ZodType<T, ZodTypeDef, unknown>, dados: unknown): T {
  const r = schema.safeParse(dados);
  if (r.success) return r.data;
  // Só os nomes dos campos: nunca ecoar os valores recebidos (podem ser senhas).
  const campos = [...new Set(r.error.issues.map((i) => i.path.join('.')).filter(Boolean))];
  const mensagens = [...new Set(r.error.issues.map((i) => i.message))];
  throw new ErroApp(422, 'ENTRADA_INVALIDA', { campos, mensagens });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ids de rota inválidos são tratados como "não encontrado", sem consultar o banco. */
export function idDaRota(params: unknown, nome = 'id'): string {
  const valor = (params as Record<string, unknown>)[nome];
  if (typeof valor !== 'string' || !UUID.test(valor)) throw naoEncontrado();
  return valor;
}

const CHAVE_IDEMPOTENCIA = /^[A-Za-z0-9_-]{8,64}$/;

export function chaveIdempotencia(headers: Record<string, unknown>): string | undefined {
  const valor = headers['idempotency-key'];
  if (valor === undefined) return undefined;
  if (typeof valor !== 'string' || !CHAVE_IDEMPOTENCIA.test(valor)) {
    throw new ErroApp(422, 'ENTRADA_INVALIDA', { campos: ['Idempotency-Key'] });
  }
  return valor;
}
