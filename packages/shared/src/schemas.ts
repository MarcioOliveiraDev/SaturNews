import { z } from 'zod';
import { SALDO_MAXIMO } from './dominio/saldo';

const SENHAS_COMUNS = new Set([
  '12345678', '123456789', '1234567890', '87654321', '11111111', '00000000',
  'password', 'senha123', 'senha1234', 'qwerty123', 'abc12345', 'escola123', 'saturbank',
]);

const texto = (max: number) => z.string().trim().min(1).max(max);

export const loginSchema = z.object({ login: texto(64), senha: z.string().min(1).max(128) }).strict();

export const novaSenhaSchema = z
  .string()
  .min(8, 'A senha precisa ter pelo menos 8 caracteres')
  .max(128)
  .refine((s) => !SENHAS_COMUNS.has(s.toLowerCase()), 'Senha muito comum, escolha outra');

export const trocarSenhaSchema = z
  .object({ senhaAtual: z.string().min(1).max(128), novaSenha: novaSenhaSchema })
  .strict();

export const valorSchema = z.number().int().positive().max(SALDO_MAXIMO);
export const descricaoSchema = texto(120);
export const idSchema = z.string().uuid();

export const depositoSchema = z
  .object({ alunoId: idSchema, valor: valorSchema, descricao: descricaoSchema })
  .strict();

export const depositoLoteSchema = z
  .object({
    turmaId: idSchema,
    alunoIds: z.array(idSchema).min(1).max(200).optional(),
    todos: z.literal(true).optional(),
    valor: valorSchema,
    descricao: descricaoSchema,
  })
  .strict()
  .refine((d) => (d.todos === true) !== (d.alunoIds !== undefined), {
    message: 'Informe a lista de alunos ou "todos", não ambos',
  });

export const contribuicaoSchema = z.object({ valor: valorSchema }).strict();

export const criarMetaSchema = z
  .object({
    itemId: idSchema,
    titulo: texto(60).optional(),
    valorAlvo: z.number().int().positive().max(100_000),
    sugestaoId: idSchema.optional(),
  })
  .strict();

export const sugestaoSchema = z
  .object({ itemId: idSchema.optional(), texto: texto(140).optional() })
  .strict()
  .refine((s) => s.itemId !== undefined || s.texto !== undefined, { message: 'Escolha um item ou escreva uma ideia' });

export const encerrarAnoSchema = z.object({ confirmacao: z.string().max(32) }).strict();

export type LoginEntrada = z.infer<typeof loginSchema>;
export type DepositoEntrada = z.infer<typeof depositoSchema>;
export type DepositoLoteEntrada = z.infer<typeof depositoLoteSchema>;
export type CriarMetaEntrada = z.infer<typeof criarMetaSchema>;
export type SugestaoEntrada = z.infer<typeof sugestaoSchema>;
