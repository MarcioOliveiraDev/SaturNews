# 2. Opções de linguagens e stack

## 2.1 Critérios de avaliação

| Critério | Peso | Por quê |
|----------|------|---------|
| Segurança e maturidade | Alto | Saldo, papéis e dados de menores (OWASP, LGPD) |
| Suporte a TDD | Alto | Exigência do projeto |
| Integridade transacional | Alto | Ledger, depósito em lote atômico, concorrência nas metas |
| UI mobile/PWA moderna | Alto | Visual inspirado no Rec'n'Play, animações, responsivo |
| Curva de aprendizado / manutenção pela escola | Médio | Possível manutenção por professores ou alunos de TI |
| Custo de hospedagem | Médio | Orçamento escolar |

## 2.2 Opções

### Opção A — TypeScript ponta a ponta ⭐ recomendada

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 19 + TypeScript + Vite, Tailwind CSS, TanStack Query, React Router, Framer Motion, vite-plugin-pwa |
| Backend | Node.js 22 LTS + NestJS (TypeScript), Zod para validação |
| Banco | PostgreSQL 16 + Prisma ORM |
| Auth | Sessão no servidor com cookie `HttpOnly`/`Secure`/`SameSite=Strict`, senhas com Argon2id |
| Testes | Vitest (unitário), Supertest + Testcontainers (integração com Postgres real), Testing Library (componentes), Playwright (E2E em viewports móveis) |
| Qualidade | ESLint (+ plugin security), Prettier, `npm audit`, Dependabot, Semgrep, OWASP ZAP no CI |

**Prós:** uma só linguagem no front e no back (tipos compartilhados entre API e telas); ecossistema de UI mais rico para o visual pretendido; NestJS traz *guards* para controle de acesso, *pipes* de validação e módulo de testes nativo; muito material didático em português.
**Contras:** ecossistema npm exige cuidado com cadeia de suprimentos (mitigado com lockfile, `npm ci`, auditoria e poucas dependências).

### Opção B — Python (Django + DRF) com React

| Camada | Tecnologia |
|--------|------------|
| Frontend | React + TypeScript (igual à A) ou Django templates + HTMX |
| Backend | Django 5 + Django REST Framework |
| Banco | PostgreSQL (ORM do Django) |
| Testes | pytest, pytest-django, factory_boy, Playwright |

**Prós:** Django tem segurança forte "de fábrica" (CSRF, ORM parametrizado, admin pronto — útil para a coordenação); Python é a linguagem mais ensinada em escolas.
**Contras:** duas linguagens se o front for React; com HTMX a experiência "app de banco" fica menos fluida.

### Opção C — Java (Spring Boot) com Angular/React

| Camada | Tecnologia |
|--------|------------|
| Backend | Spring Boot 3 + Spring Security + JPA |
| Testes | JUnit 5, Mockito, Testcontainers |

**Prós:** padrão de mercado em bancos reais; Spring Security muito completo.
**Contras:** mais verboso, mais pesado para hospedar (memória), curva maior — exagero para o porte do projeto.

### Opção D — BaaS (Supabase ou Firebase) + React

**Prós:** entrega mais rápida, autenticação e banco prontos, plano gratuito.
**Contras:** regras de negócio críticas (limites, atomicidade, estornos) ficam espalhadas em *Row Level Security*/funções SQL ou *Cloud Functions*, mais difíceis de testar em TDD; dependência de fornecedor; dados de menores em serviço de terceiros exigem análise de LGPD.

## 2.3 Matriz comparativa (1 = fraco, 5 = forte)

| Critério | A (TS) | B (Python) | C (Java) | D (BaaS) |
|----------|:------:|:----------:|:--------:|:--------:|
| Segurança/maturidade | 4 | 5 | 5 | 3 |
| TDD | 5 | 5 | 5 | 2 |
| Integridade transacional | 5 | 5 | 5 | 3 |
| UI mobile/PWA | 5 | 4 | 4 | 5 |
| Curva/manutenção | 4 | 5 | 2 | 4 |
| Custo de hospedagem | 4 | 4 | 3 | 5 |
| **Total** | **27** | **28** | **24** | **22** |

B e A empatam tecnicamente. **Recomendo A** porque o requisito de maior risco
para o sucesso percebido é a **experiência visual de app bancário moderno**, e
ter front e back na mesma linguagem, com tipos compartilhados, reduz erros de
integração e simplifica o TDD de ponta a ponta. Se a escola tiver mais
familiaridade com Python, B é uma alternativa igualmente segura.

> **Atualização:** TypeScript aprovado. Na implementação, NestJS foi trocado por **Fastify** e Prisma por **Kysely** — ver [T1–T3](08-decisoes.md#decisões-técnicas).

## 2.4 Estrutura de repositório proposta (Opção A)

```
saturbank/
├── apps/
│   ├── api/            # NestJS
│   │   ├── src/modules/{auth,usuarios,turmas,contas,transacoes,metas,auditoria}
│   │   ├── prisma/schema.prisma
│   │   └── test/       # integração (Supertest + Testcontainers)
│   └── web/            # React + Vite (PWA)
│       ├── src/{pages,components,features,hooks,api}
│       └── e2e/        # Playwright
├── packages/
│   └── shared/         # tipos e schemas Zod compartilhados
├── docs/
├── docker-compose.yml  # Postgres local
└── .github/workflows/ci.yml
```

Monorepo com **pnpm workspaces**.

## 2.5 Hospedagem (sugestões)

| Opção | Custo | Observação |
|-------|-------|------------|
| VPS / servidor da escola + Docker Compose | Baixo | Controle total; exige alguém para manter atualizações |
| Render / Railway / Fly.io | Grátis a baixo | Deploy simples; verificar região dos dados (LGPD) |
| Supabase só como Postgres gerenciado | Grátis a baixo | Mantém a lógica no nosso backend |
