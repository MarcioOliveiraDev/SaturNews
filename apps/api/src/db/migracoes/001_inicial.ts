import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE turma (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      nome text NOT NULL CHECK (length(nome) BETWEEN 1 AND 40),
      ano_letivo int NOT NULL,
      ativa boolean NOT NULL DEFAULT true,
      UNIQUE (nome, ano_letivo)
    );

    CREATE TABLE usuario (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      nome text NOT NULL CHECK (length(nome) BETWEEN 1 AND 120),
      login text NOT NULL UNIQUE CHECK (length(login) BETWEEN 1 AND 64),
      senha_hash text NOT NULL,
      papel text NOT NULL CHECK (papel IN ('ALUNO', 'PROFESSOR', 'ADMIN')),
      turma_id uuid REFERENCES turma(id),
      -- O teto de S$ 100 é garantido nos depósitos; estornos podem ultrapassá-lo (D5).
      saldo int NOT NULL DEFAULT 0 CHECK (saldo >= 0),
      ativo boolean NOT NULL DEFAULT true,
      trocar_senha boolean NOT NULL DEFAULT true,
      tentativas_falhas int NOT NULL DEFAULT 0,
      bloqueado_ate timestamptz,
      criado_em timestamptz NOT NULL DEFAULT now(),
      CHECK (papel = 'ALUNO' OR saldo = 0),
      CHECK (papel <> 'ALUNO' OR turma_id IS NOT NULL)
    );
    CREATE INDEX usuario_turma_idx ON usuario (turma_id);

    CREATE TABLE professor_turma (
      professor_id uuid NOT NULL REFERENCES usuario(id),
      turma_id uuid NOT NULL REFERENCES turma(id),
      PRIMARY KEY (professor_id, turma_id)
    );

    CREATE TABLE item_catalogo (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      nome text NOT NULL UNIQUE,
      descricao text NOT NULL,
      icone text NOT NULL,
      preco_sugerido int NOT NULL CHECK (preco_sugerido > 0),
      ativo boolean NOT NULL DEFAULT true
    );

    CREATE TABLE meta (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      turma_id uuid NOT NULL REFERENCES turma(id),
      item_id uuid NOT NULL REFERENCES item_catalogo(id),
      titulo text NOT NULL,
      valor_alvo int NOT NULL CHECK (valor_alvo > 0),
      arrecadado int NOT NULL DEFAULT 0 CHECK (arrecadado >= 0 AND arrecadado <= valor_alvo),
      status text NOT NULL DEFAULT 'ABERTA' CHECK (status IN ('ABERTA', 'ATINGIDA', 'RESGATADA', 'CANCELADA')),
      criada_por_id uuid NOT NULL REFERENCES usuario(id),
      criada_em timestamptz NOT NULL DEFAULT now(),
      atingida_em timestamptz,
      resgatada_em timestamptz,
      cancelada_em timestamptz
    );
    CREATE INDEX meta_turma_idx ON meta (turma_id, status);

    CREATE TABLE lote_deposito (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      professor_id uuid NOT NULL REFERENCES usuario(id),
      turma_id uuid NOT NULL REFERENCES turma(id),
      valor_unitario int NOT NULL CHECK (valor_unitario > 0),
      descricao text NOT NULL,
      criado_em timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE transacao (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tipo text NOT NULL CHECK (tipo IN ('DEPOSITO', 'CONTRIBUICAO', 'ESTORNO', 'ZERAMENTO')),
      valor int NOT NULL CHECK (valor > 0),
      aluno_id uuid NOT NULL REFERENCES usuario(id),
      meta_id uuid REFERENCES meta(id),
      autor_id uuid NOT NULL REFERENCES usuario(id),
      descricao text NOT NULL,
      lote_id uuid REFERENCES lote_deposito(id),
      criada_em timestamptz NOT NULL DEFAULT clock_timestamp(),
      CHECK ((tipo IN ('CONTRIBUICAO', 'ESTORNO')) = (meta_id IS NOT NULL))
    );
    CREATE INDEX transacao_aluno_idx ON transacao (aluno_id, criada_em DESC, id DESC);
    CREATE INDEX transacao_meta_idx ON transacao (meta_id);

    CREATE TABLE sugestao (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      turma_id uuid NOT NULL REFERENCES turma(id),
      aluno_id uuid NOT NULL REFERENCES usuario(id),
      item_id uuid REFERENCES item_catalogo(id),
      texto text CHECK (length(texto) <= 140),
      status text NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'APROVADA', 'RECUSADA')),
      criada_em timestamptz NOT NULL DEFAULT now(),
      decidida_por_id uuid REFERENCES usuario(id),
      decidida_em timestamptz,
      CHECK (item_id IS NOT NULL OR texto IS NOT NULL)
    );

    CREATE TABLE idempotencia (
      usuario_id uuid NOT NULL REFERENCES usuario(id),
      chave text NOT NULL,
      resposta jsonb,
      criada_em timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (usuario_id, chave)
    );

    CREATE TABLE auditoria (
      id bigserial PRIMARY KEY,
      usuario_id uuid REFERENCES usuario(id),
      acao text NOT NULL,
      alvo text,
      ip text,
      resultado text NOT NULL CHECK (resultado IN ('SUCESSO', 'FALHA', 'NEGADO')),
      detalhes jsonb,
      criada_em timestamptz NOT NULL DEFAULT clock_timestamp()
    );

    CREATE TABLE sessao (
      id_hash text PRIMARY KEY,
      usuario_id uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
      csrf_token text NOT NULL,
      criada_em timestamptz NOT NULL DEFAULT now(),
      ultimo_acesso timestamptz NOT NULL,
      expira_em timestamptz NOT NULL
    );
    CREATE INDEX sessao_usuario_idx ON sessao (usuario_id);

    CREATE TABLE encerramento_ano (
      ano int PRIMARY KEY,
      executado_por_id uuid NOT NULL REFERENCES usuario(id),
      executado_em timestamptz NOT NULL DEFAULT now()
    );

    -- Ledger e auditoria são somente inserção (OWASP A08, RN11).
    CREATE FUNCTION somente_insercao() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'A tabela % é somente inserção', TG_TABLE_NAME;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER transacao_imutavel BEFORE UPDATE OR DELETE ON transacao
      FOR EACH ROW EXECUTE FUNCTION somente_insercao();
    CREATE TRIGGER auditoria_imutavel BEFORE UPDATE OR DELETE ON auditoria
      FOR EACH ROW EXECUTE FUNCTION somente_insercao();
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    DROP TABLE IF EXISTS encerramento_ano, sessao, auditoria, idempotencia, sugestao, transacao,
      lote_deposito, meta, item_catalogo, professor_turma, usuario, turma CASCADE;
    DROP FUNCTION IF EXISTS somente_insercao();
  `.execute(db);
}
