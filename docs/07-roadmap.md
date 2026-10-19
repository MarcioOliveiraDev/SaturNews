# 7. Roadmap

Cada entrega é feita em TDD e termina com CI verde.

| Fase | Entrega | Status |
|------|---------|--------|
| 0 | **Fundação** — monorepo, CI, Docker, design tokens, seed fictício | ✅ |
| 1 | **Autenticação e papéis** — login, sessão, troca de senha, rate limit, RBAC, auditoria | ✅ |
| 2 | **Conta e depósitos** — saldo, extrato, depósito individual e em lote, teto S$ 100, idempotência | ✅ |
| 3 | **Metas da turma** — catálogo, metas, contribuição, "faltam S$ X", resgate, cancelamento com estorno, sugestões | ✅ |
| 4 | **Visão do professor** — alunos com saldo, extrato por aluno | ✅ |
| 5 | **Administração** — importação CSV, redefinição de senha, encerramento do ano, auditoria | ✅ (parcial, ver abaixo) |
| 6 | **Polimento** — PWA offline, animações, testes de carga, pentest | ⏳ |

## Pendências conhecidas

- **Cadastro de professores pela interface**: hoje professores vêm do seed ou do banco. Próximo passo: importação CSV de professores e vínculo com turmas.
- **CRUD do catálogo** pela coordenação (hoje: 4 itens via migração).
- **MFA (TOTP)** para administradores (previsto no doc 5, A07).
- **Service worker** para leitura offline (o app já tem manifesto e é instalável como atalho).
- **Política de retenção LGPD** automatizada (anonimizar alunos inativos).
