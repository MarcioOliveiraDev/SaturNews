# 7. Roadmap

Cada entrega é feita em TDD e termina com CI verde.

| Fase | Entrega | Inclui |
|------|---------|--------|
| 0 | **Fundação** | Monorepo, CI com todas as etapas, Docker Compose, design tokens, seed de alunos fictícios |
| 1 | **Autenticação e papéis** | Login, sessão, troca de senha, rate limit, RBAC, auditoria de login |
| 2 | **Conta e depósitos** | Saldo, extrato, depósito individual e em lote, limites, idempotência |
| 3 | **Metas da turma** | Catálogo, criação de meta, contribuição, progresso "faltam S$ X", meta atingida, resgate, cancelamento com estorno |
| 4 | **Visão do professor** | Lista de alunos com saldo, extrato por aluno, painel da turma |
| 5 | **Administração** | Importação CSV de alunos reais, cadastros, configurações, consulta de auditoria |
| 6 | **Polimento** | PWA instalável, animações, acessibilidade (axe), teste de carga, pentest com ZAP |

O MVP utilizável em sala corresponde às fases 0–4.
