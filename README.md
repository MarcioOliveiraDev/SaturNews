# SaturBank — o banco escolar da $aturCoin$

Aplicação web *mobile-first* que simula um banco digital para uso escolar.
Professores depositam **$aturCoin$** (S$) nas contas dos alunos; os alunos juntam
o saldo com colegas da mesma turma para "comprar" experiências coletivas
(ida à quadra, sessão de filme, laboratório de informática, jogos de tabuleiro).

> **Status:** MVP em desenvolvimento (TDD). Decisões registradas em
> [docs/08-decisoes.md](docs/08-decisoes.md).

## Documentação

| # | Documento | Conteúdo |
|---|-----------|----------|
| 1 | [Visão e requisitos](docs/01-visao-e-requisitos.md) | Personas, histórias de usuário, regras de negócio |
| 2 | [Opções de linguagens e stack](docs/02-opcoes-de-stack.md) | Comparativo de 4 stacks e recomendação |
| 3 | [Arquitetura](docs/03-arquitetura.md) | Componentes, modelo de dados, API, fluxos |
| 4 | [Design e UI](docs/04-design-ui.md) | Identidade visual, paleta, telas, responsividade |
| 5 | [Segurança — OWASP Top 10](docs/05-seguranca-owasp.md) | Controles por categoria e como serão testados |
| 6 | [Estratégia de TDD](docs/06-estrategia-tdd.md) | Ciclo, pirâmide de testes, backlog inicial de testes |
| 7 | [Roadmap](docs/07-roadmap.md) | Entregas incrementais |
| 8 | [Decisões (ADR)](docs/08-decisoes.md) | Respostas do responsável e decisões técnicas |
| — | [Alunos fictícios](docs/dados/alunos-ficticios.csv) | Dados de exemplo (formato para importação dos reais) |

## Stack

- **Frontend:** React + TypeScript + Vite, Tailwind CSS, TanStack Query.
- **Backend:** Node.js + TypeScript com Fastify (API REST), Zod para validação.
- **Banco de dados:** PostgreSQL com Kysely; razão contábil (ledger) imutável.
- **Testes (TDD):** Vitest (unitário, integração com Postgres real, componentes) e Playwright (E2E).
- **Segurança:** OWASP Top 10:2025 + ASVS nível 2 como referência; LGPD (dados de menores).

## Regras principais

- Só professores depositam S$ (sem limite de valor); o **saldo do aluno tem teto de S$ 100**.
- Depósito individual ou para vários/todos os alunos da turma de uma vez.
- Alunos contribuem para metas da turma (quadra, filme, laboratório, jogos…) e veem quanto falta.
- Só o professor cria metas; alunos sugerem. Contribuições não podem ser retiradas.
- No fim do ano letivo o administrador encerra o ano e os saldos são zerados.

## Estrutura

```
apps/api        API Fastify (TypeScript) + migrações e testes de integração
apps/web        Frontend React (PWA) + testes de componentes e E2E (Playwright)
packages/shared Regras de domínio puras, schemas Zod e tipos compartilhados
docs/           Documentação do projeto
```

## Como rodar (desenvolvimento)

Pré-requisitos: Node.js 22+, pnpm 10+ e PostgreSQL 16 (local ou `docker compose up -d db`, que já cria os bancos `saturbank_test` e `saturbank_e2e`).

```bash
pnpm install
cp apps/api/.env.example apps/api/.env      # ajuste DATABASE_URL se necessário
pnpm --filter @saturbank/api db:migrate
pnpm --filter @saturbank/api db:seed        # turmas, alunos e professores fictícios
pnpm dev                                    # API em :3000 e web em :5173
```

Contas de exemplo (senha `Saturno2026!` para todas — apenas desenvolvimento):

| Papel | Login |
|-------|-------|
| Aluno (6º A) | `2026001` |
| Professor | `prof.marta` |
| Administrador | `admin` |

## Testes

```bash
pnpm test              # unitários + integração (exige Postgres; ver TEST_DATABASE_URL)
pnpm test:e2e          # Playwright em viewports de celular e desktop
pnpm lint && pnpm typecheck
```

## Deploy em nuvem

`Dockerfile` na raiz gera um único container (API + frontend). Variáveis obrigatórias em
[`apps/api/.env.example`](apps/api/.env.example). Detalhes em [docs/03-arquitetura.md](docs/03-arquitetura.md#35-ambientes).
