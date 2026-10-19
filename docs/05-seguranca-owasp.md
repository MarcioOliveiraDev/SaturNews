# 5. Segurança — OWASP Top 10

Referência: **OWASP Top 10:2025**, complementada pelo **OWASP ASVS 5.0 nível 2**
e pela **LGPD** (art. 14 — dados de crianças e adolescentes).

Cada controle abaixo terá **pelo menos um teste automatizado** (coluna "Teste"),
escrito antes da implementação, conforme o doc 6.

| # | Categoria | Risco no SaturBank | Controles | Teste |
|---|-----------|--------------------|-----------|-------|
| A01 | **Broken Access Control** | Aluno depositar para si; professor depositar em turma alheia; aluno ver extrato de colega (IDOR) | RBAC por *guards* em todas as rotas (negar por padrão); autorização **por recurso** no service (professor ↔ turma, aluno ↔ própria conta/turma); IDs UUID v7; CORS restrito à origem do app | Matriz papel × rota (todas as combinações); testes de IDOR para cada rota com `:id` |
| A02 | **Security Misconfiguration** | Stack traces expostos, headers ausentes, CORS aberto | Helmet (CSP estrita, HSTS, `X-Content-Type-Options`, `frame-ancestors 'none'`); erros genéricos em produção; config validada na inicialização (falha se faltar segredo); Docker sem root | Teste dos headers de resposta; ZAP baseline no CI |
| A03 | **Software Supply Chain Failures** | Pacote npm malicioso ou vulnerável | Lockfile + `pnpm install --frozen-lockfile`; Dependabot; `pnpm audit` e OSV-Scanner no CI (falha em *high*); poucas dependências; versões fixadas de actions do CI por SHA; SBOM (CycloneDX) | Job de CI que quebra com vulnerabilidade alta |
| A04 | **Cryptographic Failures** | Senhas vazadas, tráfego interceptado | HTTPS obrigatório + HSTS; senhas com **Argon2id**; cookies `Secure`; segredos fora do repositório; TLS no Postgres em produção | Teste que o hash armazenado é Argon2id e nunca retorna na API |
| A05 | **Injection** | SQL injection, XSS na descrição da transação, injeção de fórmula no CSV | Prisma (queries parametrizadas; `$queryRaw` só com template seguro); validação Zod com *allowlist* e tamanho máximo; React escapa saída; CSP sem `unsafe-inline`; exportação CSV neutraliza `= + - @` | Testes com payloads (`' OR 1=1--`, `<script>`, `=HYPERLINK(...)`) |
| A06 | **Insecure Design** | Saldo negativo, gasto duplo, meta ultrapassada, emissão ilimitada | Regras de negócio no domínio com testes; `CHECK (saldo >= 0)`; `SELECT FOR UPDATE`; idempotência; teto de saldo do aluno S$ 100 (RN05) também como `CHECK` no banco; ledger imutável; modelagem de ameaças (STRIDE) por funcionalidade | Testes de concorrência (N contribuições simultâneas); invariante do ledger |
| A07 | **Authentication Failures** | Força bruta em PIN/senha de aluno, sequestro de sessão | Rate limit por IP e por login; bloqueio progressivo após 5 falhas; mensagem genérica "login ou senha inválidos"; senha mínima de 8 caracteres verificada contra lista de senhas comuns; sessão no servidor, regenerada no login, expiração por inatividade (30 min) e absoluta (8 h); logout invalida no servidor; MFA (TOTP) opcional para professores e obrigatório para admin | Testes de bloqueio, expiração, fixação de sessão |
| A08 | **Software or Data Integrity Failures** | Alteração de transações, CSRF forjando depósito, import CSV adulterado | Token CSRF + `SameSite=Strict`; Transacao/Auditoria somente INSERT (GRANT); importação CSV validada linha a linha com pré-visualização antes de aplicar; build reproduzível no CI | Teste: POST sem token CSRF → 403; tentativa de UPDATE em transação falha |
| A09 | **Security Logging & Alerting Failures** | Fraude sem rastro | Auditoria de login (sucesso/falha), depósitos, contribuições, cancelamentos, ações admin; logs estruturados (pino) sem senhas/tokens; alerta para padrões anômalos (muitas falhas de login, depósito no teto) | Teste que cada ação financeira gera registro de auditoria |
| A10 | **Mishandling of Exceptional Conditions** | Erro no meio do lote deixa metade dos alunos com depósito; falha aberta em autorização | Transações SQL atômicas (tudo ou nada); filtro global de exceções que **falha fechado**; timeouts e limites de payload; respostas RFC 9457 sem detalhes internos | Teste que injeta falha no N-ésimo depósito do lote e verifica rollback total |

> **Status:** controles de A01, A02, A04–A10 implementados e cobertos por testes em `apps/api/test`
> (`seguranca`, `auth`, `depositos`, `metas`, `ledger`…). A03: lockfile, `pnpm audit` no CI (já barrou
> versões vulneráveis de `@fastify/static` e `csv-parse` durante o desenvolvimento) e Dependabot.
> Pendente: MFA para administradores e ZAP baseline no CI.
>
> Ajuste feito durante a implementação: o rate limit de login por IP é de **60/min** (configurável),
> porque uma sala inteira sai pelo mesmo IP da escola; a força bruta contra uma conta é barrada pelo
> bloqueio após 5 falhas.

## 5.1 Privacidade (LGPD)

- Minimização: apenas nome, turma, matrícula e credenciais.
- Base legal e consentimento dos responsáveis tratados pela escola; o app exibe aviso de privacidade.
- Retenção: dados de alunos inativos anonimizados após o ano letivo (configurável).
- Exportação/exclusão de dados mediante solicitação do administrador.

## 5.2 Práticas de desenvolvimento

- Revisão de código obrigatória por PR; branch `main` protegida.
- SAST (Semgrep + ESLint security) e busca de segredos (gitleaks) no CI.
- Checklist de segurança no template de PR.
- Testes de segurança fazem parte da suíte normal — não são uma etapa separada.
