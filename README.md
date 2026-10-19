# SaturBank — o banco escolar da $aturCoin$

Aplicação web *mobile-first* que simula um banco digital para uso escolar.
Professores depositam **$aturCoin$** (S$) nas contas dos alunos; os alunos juntam
o saldo com colegas da mesma turma para "comprar" experiências coletivas
(ida à quadra, sessão de filme, laboratório de informática, jogos de tabuleiro).

> **Status:** fase de documentação. Nenhum código foi escrito ainda. A stack
> abaixo é uma **proposta** e precisa ser aprovada antes de começar a codificação
> (ver [Decisões pendentes](#decisões-pendentes)).

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
| — | [Alunos fictícios](docs/dados/alunos-ficticios.csv) | Dados de exemplo (formato para importação dos reais) |

## Resumo da proposta

- **Frontend:** React + TypeScript + Vite, Tailwind CSS, instalável como PWA.
- **Backend:** Node.js + TypeScript com NestJS (API REST).
- **Banco de dados:** PostgreSQL com Prisma; razão contábil (ledger) imutável.
- **Testes (TDD):** Vitest, Supertest, Testcontainers, Playwright.
- **Segurança:** OWASP Top 10:2025 + ASVS nível 2 como referência; LGPD (dados de menores).

## Decisões pendentes

Antes de codificar, preciso que você confirme:

1. **Stack** — aprovar a recomendação (TypeScript ponta a ponta) ou escolher outra opção do doc 2.
2. **Login dos alunos** — matrícula + senha/PIN (proposto) ou outro método (ex.: Google Workspace da escola).
3. **Quem cria as metas da turma** — professor (proposto) ou os alunos sugerem e o professor aprova.
4. **Desistência de contribuição** — o aluno pode retirar o que colocou numa meta aberta? (proposto: não; só o professor cancela a meta e tudo é devolvido).
5. **Limites** — teto de depósito por professor/dia e valor máximo por depósito (proposto: configurável).
6. **Hospedagem** — servidor da escola, nuvem gratuita (Render/Fly/Railway) ou outra.

Detalhes no fim de cada documento.
