# 8. Registro de decisões (ADR)

## Decisões do produto (respondidas pelo responsável em 19/10/2026)

| # | Pergunta | Decisão |
|---|----------|---------|
| D1 | Linguagem | **TypeScript** ponta a ponta (Opção A) |
| D2 | Login do aluno | **Matrícula + senha** |
| D3 | Quem cria metas | **Só o professor cria**; alunos podem **sugerir** (o professor aprova ou recusa) |
| D4 | Retirar contribuição | **Não permitido** |
| D5 | Limites | Professor **sem limite** de depósito; **saldo do aluno tem teto de S$ 100** |
| D6 | Hospedagem | **Servidor em nuvem** |
| D7 | Fim do ano letivo | **Saldos zerados** |

### Desdobramentos

- **D5 — teto de saldo.** O teto vale para o saldo da conta do aluno, não para o que ele já
  contribuiu. Contribuir para uma meta libera espaço para novos depósitos, o que incentiva a
  colaboração.
  - *Depósito individual* que ultrapassaria o teto é **recusado**, e a mensagem informa
    quanto ainda cabe ("Ana pode receber no máximo S$ 15").
  - *Depósito em lote* credita a cada aluno **o que couber** até o teto; alunos já no teto
    são pulados. A confirmação e a resposta mostram exatamente quanto cada um recebeu.
    Assim, "selecionar todos" nunca é bloqueado por um único aluno.
  - O banco de dados também impõe o teto (`CHECK saldo BETWEEN 0 AND 100`).
- **D3 — sugestões.** O aluno escolhe um item do catálogo ou escreve uma ideia curta
  (até 140 caracteres). O professor aprova (definindo o valor da meta) ou recusa.
- **D7 — encerramento do ano.** Ação do administrador, com confirmação digitada
  (`ENCERRAR 2026`):
  1. metas **abertas** são canceladas e as contribuições devolvidas (estorno);
  2. metas **atingidas** continuam disponíveis para resgate;
  3. cada saldo de aluno é zerado por uma transação `ZERAMENTO` (o histórico é preservado).
- **D6 — nuvem.** A aplicação é empacotada em **um container** (a API serve também o
  frontend, mesma origem → sem CORS) + PostgreSQL gerenciado. Preferir provedor com
  região no Brasil (ex.: AWS/GCP/Azure São Paulo, Fly.io `gru`) por causa da LGPD.

## Decisões técnicas

| # | Decisão | Motivo |
|---|---------|--------|
| T1 | **Fastify** em vez de NestJS | Menos "mágica" (sem decorators/reflexão), testes de rota rápidos com `app.inject()` sem subir porta; RBAC implementado como `preHandler` explícito e testado |
| T2 | **Kysely + SQL migrations** em vez de Prisma | Query builder tipado e parametrizado, controle explícito de `SELECT ... FOR UPDATE` e transações do ledger; sem binários de engine para baixar |
| T3 | Testes de integração contra **PostgreSQL real** (serviço no CI; Docker Compose ou Postgres local no desenvolvimento) em vez de Testcontainers | Mesma garantia (banco real) e funciona em ambientes sem Docker |
| T4 | Saldo materializado em `aluno.saldo` e `meta.arrecadado`, com o ledger `transacao` como fonte da verdade | Leitura rápida; teste de invariante garante consistência |
| T5 | Imutabilidade de `transacao` e `auditoria` por **trigger** que bloqueia UPDATE/DELETE | Vale para qualquer usuário do banco, testável |
| T6 | Sessão no servidor (token aleatório de 256 bits; só o hash SHA-256 é guardado) + token CSRF por sessão no header `X-CSRF-Token` | OWASP A01/A07/A08 |
| T7 | Expiração de sessão: 30 min de inatividade, 8 h absoluta | 15 min se mostrou curto para uso em aula |
| T8 | Fontes auto-hospedadas (@fontsource) em vez do Google Fonts | LGPD (não enviar IP dos alunos a terceiros) e CSP `font-src 'self'` |
| T9 | Estorno de meta cancelada devolve o valor integral, mesmo acima do teto | Não tirar moedas do aluno; acima do teto ele só não recebe novos depósitos |
