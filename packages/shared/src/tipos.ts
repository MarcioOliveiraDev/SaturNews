import type { StatusMeta } from './dominio/meta';

export type Papel = 'ALUNO' | 'PROFESSOR' | 'ADMIN';
export type TipoTransacao = 'DEPOSITO' | 'CONTRIBUICAO' | 'ESTORNO' | 'ZERAMENTO';

export interface UsuarioLogado {
  id: string;
  nome: string;
  papel: Papel;
  turma: { id: string; nome: string } | null;
  trocarSenha: boolean;
  csrfToken: string;
}

export interface TransacaoDTO {
  id: string;
  tipo: TipoTransacao;
  valor: number;
  descricao: string;
  autor: string;
  meta: string | null;
  criadaEm: string;
}

export interface MetaDTO {
  id: string;
  titulo: string;
  icone: string;
  valorAlvo: number;
  arrecadado: number;
  falta: number;
  percentual: number;
  status: StatusMeta;
  criadaEm: string;
}

export interface AlunoResumoDTO {
  id: string;
  nome: string;
  matricula: string;
  saldo: number;
}

export interface TurmaDTO {
  id: string;
  nome: string;
  totalAlunos: number;
  metasAbertas: number;
}

export interface ItemCatalogoDTO {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  precoSugerido: number;
}

export interface SugestaoDTO {
  id: string;
  aluno: string;
  item: string | null;
  texto: string | null;
  status: 'PENDENTE' | 'APROVADA' | 'RECUSADA';
  criadaEm: string;
}

export interface ResultadoLoteDTO {
  loteId: string;
  total: number;
  itens: { alunoId: string; nome: string; credito: number }[];
}

export interface Pagina<T> {
  itens: T[];
  proximoCursor: string | null;
}
