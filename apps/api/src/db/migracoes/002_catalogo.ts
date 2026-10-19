import { type Kysely, sql } from 'kysely';

/** Catálogo inicial de experiências que as turmas podem conquistar. */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    INSERT INTO item_catalogo (nome, descricao, icone, preco_sugerido) VALUES
      ('Ida para a quadra', 'Uma aula livre na quadra com a turma toda', 'quadra', 300),
      ('Sessão de filme', 'Filme com pipoca escolhido pela turma', 'filme', 400),
      ('Laboratório de informática', 'Uma aula no laboratório com jogos educativos', 'laboratorio', 350),
      ('Jogos de tabuleiro', 'Tarde de jogos de tabuleiro em grupos', 'tabuleiro', 250)
    ON CONFLICT (nome) DO NOTHING;
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DELETE FROM item_catalogo WHERE nome IN ('Ida para a quadra', 'Sessão de filme', 'Laboratório de informática', 'Jogos de tabuleiro')`.execute(db);
}
