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
| Integração (API + banco) | Vitest + Supertest + Testcontainers (Postgres real) | Rotas, autorização, transações SQL, concorrência, constraints | ~20% |
| Componentes (UI) | Vitest + Testing Library + axe | Cartão de saldo, barra de progresso, seletor de alunos, acessibilidade | — |
| E2E | Playwright (viewports iPhone SE, Pixel 7, desktop) | Jornadas completas aluno e professor | ~10%, só caminhos críticos |

**Cobertura mínima no CI:** 90% de linhas no domínio, 80% no geral. Cobertura é
piso, não objetivo — os casos de borda abaixo importam mais.

## 6.3 Backlog inicial de testes (escritos antes do código)

### Domínio — Meta
- [ ] `quantoFalta` = alvo − arrecadado.
- [ ] Contribuição com valor ≤ 0 é rejeitada.
- [ ] Contribuição maior que o saldo do aluno é rejeitada.
- [ ] Contribuição maior que o que falta é rejeitada (RN07).
- [ ] Contribuição que completa o alvo muda status para `ATINGIDA`.
- [ ] Meta `ATINGIDA`, `RESGATADA` ou `CANCELADA` não aceita contribuição.
- [ ] Cancelar meta gera um estorno por aluno com o valor exato contribuído.
- [ ] Só meta `ATINGIDA` pode ser resgatada.

### Domínio — Depósito
- [ ] Valor não inteiro, ≤ 0 ou acima do limite por depósito é rejeitado.
- [ ] Depósito que ultrapassa o teto diário do professor é rejeitado.
- [ ] Lote calcula total = valor × quantidade e respeita o teto diário.

### Integração — API
- [ ] Aluno chamando `POST /depositos` → 403.
- [ ] Professor depositando para aluno de turma não vinculada → 403.
- [ ] Lote com um `alunoId` de outra turma → 422 e **nenhum** depósito criado.
- [ ] Lote com "todos" deposita para todos os alunos ativos da turma.
- [ ] Falha simulada no meio do lote → rollback total.
- [ ] Mesma `Idempotency-Key` duas vezes → um único depósito.
- [ ] Aluno lendo `/alunos/:id/transacoes` de colega → 403 (IDOR).
- [ ] 20 contribuições simultâneas não ultrapassam o alvo nem deixam saldo negativo.
- [ ] Invariante: saldo de toda conta = soma do ledger.
- [ ] Ação financeira gera registro de auditoria.
- [ ] Requisição de escrita sem token CSRF → 403.
- [ ] 6ª tentativa de login errada → bloqueio temporário; mensagem genérica.
- [ ] Respostas contêm headers de segurança (CSP, HSTS, etc.).
- [ ] Payloads de injeção na descrição são armazenados como texto e não executados.

### E2E
- [ ] Professor faz login, seleciona todos do 7º A, deposita S$ 10; saldos atualizados.
- [ ] Aluno faz login, vê saldo, contribui para "Filme" e vê "faltam" diminuir.
- [ ] Último aluno completa a meta → tela de meta atingida; professor resgata.
- [ ] Layout sem rolagem horizontal em 320px.

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
