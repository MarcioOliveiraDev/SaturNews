import type { ColumnType, Generated } from 'kysely';
import type { Papel, StatusMeta, TipoTransacao } from '@saturbank/shared';

type Criado = ColumnType<Date, Date | undefined, never>;

export interface Database {
  turma: { id: Generated<string>; nome: string; anoLetivo: number; ativa: Generated<boolean> };
  usuario: {
    id: Generated<string>;
    nome: string;
    login: string;
    senhaHash: string;
    papel: Papel;
    turmaId: string | null;
    saldo: Generated<number>;
    ativo: Generated<boolean>;
    trocarSenha: Generated<boolean>;
    tentativasFalhas: Generated<number>;
    bloqueadoAte: Date | null;
    criadoEm: Criado;
  };
  professorTurma: { professorId: string; turmaId: string };
  itemCatalogo: {
    id: Generated<string>;
    nome: string;
    descricao: string;
    icone: string;
    precoSugerido: number;
    ativo: Generated<boolean>;
  };
  meta: {
    id: Generated<string>;
    turmaId: string;
    itemId: string;
    titulo: string;
    valorAlvo: number;
    arrecadado: Generated<number>;
    status: Generated<StatusMeta>;
    criadaPorId: string;
    criadaEm: Criado;
    atingidaEm: Date | null;
    resgatadaEm: Date | null;
    canceladaEm: Date | null;
  };
  loteDeposito: {
    id: Generated<string>;
    professorId: string;
    turmaId: string;
    valorUnitario: number;
    descricao: string;
    criadoEm: Criado;
  };
  transacao: {
    id: Generated<string>;
    tipo: TipoTransacao;
    valor: number;
    alunoId: string;
    metaId: string | null;
    autorId: string;
    descricao: string;
    loteId: string | null;
    criadaEm: Criado;
  };
  sugestao: {
    id: Generated<string>;
    turmaId: string;
    alunoId: string;
    itemId: string | null;
    texto: string | null;
    status: Generated<'PENDENTE' | 'APROVADA' | 'RECUSADA'>;
    criadaEm: Criado;
    decididaPorId: string | null;
    decididaEm: Date | null;
  };
  idempotencia: {
    usuarioId: string;
    chave: string;
    resposta: unknown;
    criadaEm: Criado;
  };
  auditoria: {
    id: Generated<string>;
    usuarioId: string | null;
    acao: string;
    alvo: string | null;
    ip: string | null;
    resultado: 'SUCESSO' | 'FALHA' | 'NEGADO';
    detalhes: unknown;
    criadaEm: Criado;
  };
  sessao: {
    idHash: string;
    usuarioId: string;
    csrfToken: string;
    criadaEm: Criado;
    ultimoAcesso: Date;
    expiraEm: Date;
  };
  encerramentoAno: { ano: number; executadoPorId: string; executadoEm: Criado };
}
