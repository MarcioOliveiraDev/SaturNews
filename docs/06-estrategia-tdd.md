# 6. Estratégia de TDD

## 6.1 Ciclo

Toda funcionalidade começa por um teste que falha:

1. **Red** — escrever o teste da próxima regra/comportamento; rodar e ver falhar pelo motivo certo.
2. **Green** — escrever o código mínimo para passar.
3. **Refactor** — melhorar o design com todos os testes verdes.

Commits seguem o ciclo (ex.: `test: contribuição não pode exceder o que falta` →
`feat: valida limite da contribuição`). PR sem teste para o comportamento novo não é aceito.

## 6.2 Pirâmide de testes

| Nível | Ferramenta | O que cobre | Meta |
|-------|------------|-------------|------|
| Unitário (domínio) | Vitest | Regras puras: cálculo do que falta, validação de limites, transições de status da meta | ~70% dos testes, < 5 s |
| Integração (API + banco) | Vitest + `app.inject()` do Fastify + PostgreSQL real | Rotas, autorização, transações SQL, concorrência, constraints | ~20% |
| Componentes (UI) | Vitest + Testing Library + axe | Cartão de saldo, barra de progresso, seletor de alunos, acessibilidade | — |
| E2E | Playwright (viewports iPhone SE, Pixel 7, desktop) | Jornadas completas aluno e professor | ~10%, só caminhos críticos |

**Cobertura mínima no CI:** 90% de linhas no domínio, 80% no geral. Cobertura é
piso, não objetivo — os casos de borda abaixo importam mais.

## 6.3 Backlog inicial de testes (escritos antes do código)

### Domínio — Meta
- [x] `quantoFalta` = alvo − arrecadado.
- [x] Contribuição com valor ≤ 0 é rejeitada.
- [x] Contribuição maior que o saldo do aluno é rejeitada.
- [x] Contribuição maior que o que falta é rejeitada (RN07).
- [x] Contribuição que completa o alvo muda status para `ATINGIDA`.
- [x] Meta `ATINGIDA`, `RESGATADA` ou `CANCELADA` não aceita contribuição.
- [x] Cancelar meta gera um estorno por aluno com o valor exato contribuído.
- [x] Só meta `ATINGIDA` pode ser resgatada.

### Domínio — Depósito
- [x] Valor não inteiro ou ≤ 0 é rejeitado.
- [x] Depósito individual que ultrapassa o teto de saldo (S$ 100) é rejeitado informando quanto cabe.
- [x] Lote credita a cada aluno o que couber até o teto e pula quem está no teto.

### Integração — API
- [x] Aluno chamando `POST /depositos` → 403.
- [x] Professor depositando para aluno de turma não vinculada → 403.
- [x] Lote com um `alunoId` de outra turma → 422 e **nenhum** depósito criado.
- [x] Lote com "todos" deposita para todos os alunos ativos da turma.
- [x] Falha simulada no meio do lote → rollback total.
- [x] Mesma `Idempotency-Key` duas vezes → um único depósito.
- [x] Aluno lendo `/alunos/:id/transacoes` de colega → 403 (IDOR).
- [x] 20 contribuições simultâneas não ultrapassam o alvo nem deixam saldo negativo.
- [x] Invariante: saldo de toda conta = soma do ledger.
- [x] Ação financeira gera registro de auditoria.
- [x] Requisição de escrita sem token CSRF → 403.
- [x] 6ª tentativa de login errada → bloqueio temporário; mensagem genérica.
- [x] Respostas contêm headers de segurança (CSP, HSTS, etc.).
- [x] Payloads de injeção na descrição são armazenados como texto e não executados.

### E2E
- [x] Professor faz login, seleciona todos do 7º A, deposita S$ 10; saldos atualizados.
- [x] Aluno faz login, vê saldo, contribui para "Filme" e vê "faltam" diminuir.
- [x] Último aluno completa a meta → tela de meta atingida; professor resgata.
- [x] Layout sem rolagem horizontal em 320px.

> Todos os itens acima estão implementados como testes automatizados
> (`packages/shared`, `apps/api/test`, `apps/web/src/**/*.test.tsx` e `apps/web/e2e`).
> Total atual: 32 de domínio, 98 de API/integração, 39 de componentes/páginas e 9 E2E (3 jornadas × 3 viewports).

## 6.4 Dados de teste

- *Factories* para turmas, usuários, metas.
- Seed de desenvolvimento a partir de [`dados/alunos-ficticios.csv`](dados/alunos-ficticios.csv).
- Cada teste de integração roda em transação revertida ou banco isolado.

## 6.5 Pipeline de CI

```
lint + typecheck → unit → integração (Testcontainers) → componentes → E2E
                 → SAST (Semgrep) → SCA (audit/OSV) → gitleaks → ZAP baseline
```

Qualquer etapa vermelha bloqueia o merge.
