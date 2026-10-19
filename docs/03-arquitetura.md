# 3. Arquitetura

> Baseada na Opção A (doc 2), com Fastify + Kysely ([T1–T2](08-decisoes.md#decisões-técnicas)). Se outra stack for escolhida, o modelo de dados,
> a API e os fluxos continuam válidos.

## 3.1 Visão de componentes

```
 ┌──────────────────────┐   HTTPS (cookie de sessão)   ┌─────────────────────────┐
 │  PWA React (web)     │ ───────────────────────────► │  API NestJS              │
 │  - telas aluno/prof. │ ◄─────────────────────────── │  - Auth / RBAC (guards)  │
 │  - cache leitura     │          JSON                │  - Domínio: Ledger,      │
 └──────────────────────┘                              │    Metas, Turmas         │
                                                       │  - Auditoria             │
                                                       └───────────┬─────────────┘
                                                                   │ Prisma (SQL parametrizado)
                                                       ┌───────────▼─────────────┐
                                                       │  PostgreSQL              │
                                                       │  ledger imutável +       │
                                                       │  constraints (saldo ≥ 0) │
                                                       └─────────────────────────┘
```

Camadas no backend: **Controller** (HTTP, validação de entrada) → **Service /
casos de uso** (regras de negócio, autorização por recurso) → **Repository**
(Prisma). As regras de negócio ficam em funções puras de domínio, testáveis sem
banco.

## 3.2 Modelo de dados

```
Turma (id, nome "7º A", anoLetivo, turno, ativa)
Usuario (id, nome, login, senhaHash, papel[ALUNO|PROFESSOR|ADMIN],
         turmaId?, ativo, trocarSenha, tentativasFalhas, bloqueadoAte, criadoEm)
ProfessorTurma (professorId, turmaId)                      -- N:N
Conta (id, tipo[ALUNO|META], usuarioId?, metaId?, saldo INT CHECK (saldo >= 0), versao)
ItemCatalogo (id, nome, descricao, icone, precoSugerido, ativo)
Meta (id, turmaId, itemId, titulo, valorAlvo INT > 0, status[ABERTA|ATINGIDA|RESGATADA|CANCELADA],
      criadaPorId, criadaEm, atingidaEm?, resgatadaEm?, canceladaEm?)
LoteDeposito (id, professorId, turmaId, valorUnitario, quantidade, descricao, criadoEm)
Transacao (id, tipo[DEPOSITO|CONTRIBUICAO|ESTORNO], valor INT > 0,
           contaOrigemId?, contaDestinoId, autorId, descricao, loteId?,
           chaveIdempotencia UNIQUE, criadaEm)               -- somente INSERT
Configuracao (chave, valor)                                  -- limites RN05
Auditoria (id, usuarioId?, acao, alvo, ip, userAgent, resultado, detalhes JSON, criadaEm)
Sessao (id, usuarioId, criadaEm, expiraEm, ultimoAcesso)
```

### Decisões importantes

- **Ledger:** `Transacao` é a fonte da verdade; `Conta.saldo` é um valor
  materializado atualizado **na mesma transação SQL**. Um teste de integração
  garante que `saldo = Σ entradas − Σ saídas` para toda conta.
- **Depósito** não tem conta de origem (é emissão de moeda pelo professor);
  o `autorId` identifica quem emitiu.
- **Contribuição:** origem = conta do aluno, destino = conta da meta.
- **Estorno:** origem = conta da meta, destino = conta do aluno.
- **Imutabilidade:** o usuário do banco usado pela API não tem permissão de
  `UPDATE`/`DELETE` em `Transacao` e `Auditoria` (GRANT restrito).
- **Concorrência:** contribuições usam `SELECT ... FOR UPDATE` nas contas do
  aluno e da meta, impedindo que dois alunos ultrapassem o alvo ao mesmo tempo.
- **Idempotência:** o cliente envia `Idempotency-Key` em operações financeiras;
  um duplo clique não gera depósito duplicado.

## 3.3 API REST (v1)

Todas as rotas sob `/api/v1`, JSON, autenticação por cookie de sessão + token CSRF.

| Método | Rota | Papel | Descrição |
|--------|------|-------|-----------|
| POST | `/auth/login` | público | Login (rate limit) |
| POST | `/auth/logout` | autenticado | Encerra sessão |
| POST | `/auth/trocar-senha` | autenticado | Troca de senha |
| GET | `/me` | autenticado | Dados do usuário logado |
| GET | `/me/conta` | aluno | Saldo |
| GET | `/me/transacoes?cursor=` | aluno | Extrato paginado |
| GET | `/me/turma/metas` | aluno | Metas da turma |
| POST | `/metas/:id/contribuicoes` | aluno | `{ valor }` — contribui |
| GET | `/turmas` | professor | Turmas do professor |
| GET | `/turmas/:id/alunos` | professor | Alunos + saldos |
| POST | `/depositos` | professor | `{ alunoId, valor, descricao }` |
| POST | `/depositos/lote` | professor | `{ turmaId, alunoIds[] \| todos:true, valor, descricao }` |
| GET | `/alunos/:id/transacoes` | professor | Extrato de um aluno da sua turma |
| POST | `/turmas/:id/metas` | professor | Cria meta |
| POST | `/metas/:id/resgatar` | professor | Marca como resgatada |
| POST | `/metas/:id/cancelar` | professor | Cancela e estorna |
| POST | `/admin/importacoes/alunos` | admin | CSV |
| CRUD | `/admin/turmas`, `/admin/usuarios`, `/admin/catalogo` | admin | Cadastros |
| GET | `/admin/auditoria` | admin | Log |

Erros seguem RFC 9457 (`application/problem+json`) sem detalhes internos.

## 3.4 Fluxos principais

### Depósito em lote
1. Professor abre a turma, marca "Selecionar todos" (ou alguns), informa valor e descrição.
2. Front exibe confirmação: "Enviar S$ 10 para 32 alunos (total S$ 320)?".
3. API valida: papel, vínculo com a turma, alunos pertencem à turma, valor ≤ limite, total do dia ≤ teto.
4. Numa única transação SQL: cria `LoteDeposito`, N `Transacao` e atualiza N saldos.
5. Registra auditoria; responde com o resumo.

### Contribuição para meta
1. Aluno abre a meta "Filme — faltam S$ 120", escolhe o valor (atalhos: 10, 25, tudo que falta, todo meu saldo).
2. API bloqueia conta do aluno e conta da meta (`FOR UPDATE`), valida RN06–RN08.
3. Cria `Transacao`, atualiza saldos; se arrecadado = alvo → status `ATINGIDA`.
4. Front mostra animação de progresso e "Meta atingida! 🎉" quando for o caso.

## 3.5 Ambientes

| Ambiente | Uso |
|----------|-----|
| local | Docker Compose (Postgres) + seed com alunos fictícios |
| CI | GitHub Actions: lint → typecheck → testes (Postgres como serviço) → `pnpm audit` → E2E → gitleaks → Semgrep |
| produção | Container único (`Dockerfile`) + PostgreSQL gerenciado; HTTPS obrigatório (TLS no provedor), `TRUST_PROXY=true` atrás do load balancer, segredos em variáveis de ambiente, backups diários do Postgres |

### Deploy em nuvem (passo a passo)

1. Criar um PostgreSQL 16 gerenciado (preferir região no Brasil).
2. Publicar o container do `Dockerfile` com `DATABASE_URL`, `NODE_ENV=production` e `TRUST_PROXY=true`.
   As migrações rodam automaticamente ao subir.
3. Criar o primeiro administrador: `node dist/criar-admin.js coordenacao "Nome"` (mostra uma senha provisória).
4. Pela tela da coordenação, importar o CSV com os alunos reais.
5. Em produção, o usuário do banco usado pela API não deve ter permissão de `TRUNCATE`/`DROP`.
