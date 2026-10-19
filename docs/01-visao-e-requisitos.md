# 1. Visão e requisitos

## 1.1 Objetivo

Estimular participação, colaboração e educação financeira na escola. O professor
recompensa alunos com **$aturCoin$ (S$)**; a turma se organiza para juntar moedas
e conquistar uma experiência coletiva. A aplicação se parece com um app de banco
(saldo, extrato, "pix" para a meta), mas **não envolve dinheiro real**.

## 1.2 Personas e papéis

| Papel | Quem é | O que pode fazer |
|-------|--------|------------------|
| **Aluno** | Estudante identificado por **nome + turma** | Ver saldo e extrato próprios; ver metas da sua turma; contribuir com saldo para uma meta da sua turma |
| **Professor** | Docente vinculado a uma ou mais turmas | Depositar S$ individualmente ou para a turma toda; ver saldo e transações dos alunos de suas turmas; criar, acompanhar, resgatar e cancelar metas de suas turmas |
| **Administrador** (coordenação) | Responsável técnico/pedagógico | Cadastrar/importar turmas, alunos e professores; vincular professores a turmas; manter catálogo de itens; configurar limites; consultar auditoria |

> O administrador não deposita S$ (separação de funções). Apenas professores emitem moeda.

## 1.3 Histórias de usuário

### Autenticação
- **US01** — Como usuário, quero entrar com meu login e senha para acessar minha conta.
- **US02** — Como usuário, quero sair (logout) e ter a sessão encerrada automaticamente após inatividade.
- **US03** — Como administrador, quero redefinir a senha de um aluno que a esqueceu (gera senha provisória, troca obrigatória no próximo login).

### Aluno
- **US10** — Como aluno, quero ver meu saldo em destaque na tela inicial.
- **US11** — Como aluno, quero ver meu extrato (depósitos recebidos e contribuições feitas), com data, valor, autor e descrição.
- **US12** — Como aluno, quero ver as metas abertas da minha turma com barra de progresso, valor arrecadado e **quanto falta**.
- **US13** — Como aluno, quero contribuir com parte ou todo o meu saldo para uma meta da minha turma.
- **US15** — Como aluno, quero **sugerir** uma meta para minha turma (item do catálogo ou ideia curta).
- **US14** — Como aluno, quero ver quem da turma já contribuiu para uma meta (ranking de colaboração, opcional/configurável).

### Professor
- **US20** — Como professor, quero ver a lista de alunos de cada turma minha com o saldo de cada um.
- **US21** — Como professor, quero depositar um valor para **um aluno**, com uma descrição (ex.: "Participação na feira de ciências").
- **US22** — Como professor, quero **selecionar vários ou todos os alunos** de uma turma e depositar **o mesmo valor para cada um** em uma única operação.
- **US23** — Como professor, quero ver as transações de qualquer aluno das minhas turmas.
- **US24** — Como professor, quero criar uma meta para a turma a partir do catálogo (ex.: "Filme — S$ 500").
- **US25** — Como professor, quero marcar uma meta atingida como **resgatada** (experiência realizada).
- **US26** — Como professor, quero cancelar uma meta aberta, devolvendo automaticamente as contribuições a cada aluno.
- **US27** — Como professor, quero ver as sugestões de metas da turma e aprová-las (criando a meta) ou recusá-las.

### Administrador
- **US30** — Como administrador, quero importar alunos via CSV (nome, turma, matrícula).
- **US31** — Como administrador, quero manter o catálogo de itens (nome, descrição, ícone, preço sugerido).
- **US32** — Como administrador, quero consultar o log de auditoria.
- **US33** — Como administrador, quero **encerrar o ano letivo**, zerando os saldos (ver [D7](08-decisoes.md)).

## 1.4 Regras de negócio

| ID | Regra |
|----|-------|
| RN01 | Valores de S$ são **inteiros positivos** (sem centavos). |
| RN02 | Somente usuários com papel **Professor** criam moeda (depósito). |
| RN03 | Professor só deposita para alunos de **turmas às quais está vinculado**. |
| RN04 | Depósito em lote: mesmo valor para cada aluno selecionado; a operação é **atômica** (todos ou nenhum). |
| RN05 | Professor **não tem limite** de depósito. O **saldo do aluno tem teto de S$ 100**: depósito individual acima do que cabe é recusado; no lote, cada aluno recebe o que couber até o teto (ver [D5](08-decisoes.md)). |
| RN06 | Aluno só contribui para metas **abertas** da **própria turma**. |
| RN07 | Contribuição ≤ saldo do aluno **e** ≤ valor que falta para a meta (não há "troco"). |
| RN08 | O saldo nunca fica negativo. |
| RN09 | Ao atingir 100%, a meta muda para **Atingida** e deixa de aceitar contribuições. |
| RN10 | Cancelamento de meta aberta devolve a cada aluno exatamente o que ele contribuiu (transações de estorno). |
| RN11 | Transações são **imutáveis**. Correções são feitas por transação de estorno, nunca por edição/exclusão. |
| RN12 | Toda transação registra: tipo, valor, origem, destino, autor, data/hora, descrição e identificador de lote (quando houver). |
| RN13 | Aluno vê apenas os próprios dados e os dados agregados da sua turma. |
| RN15 | Somente o professor cria metas; alunos apenas sugerem. |
| RN16 | Contribuições **não podem ser retiradas** pelo aluno. |
| RN17 | No encerramento do ano letivo, metas abertas são canceladas (com estorno) e todos os saldos são zerados por transação `ZERAMENTO`. |
| RN14 | Um aluno pertence a **uma** turma por ano letivo. Transferência de turma mantém saldo; contribuições em metas da turma antiga permanecem lá. |

### Ciclo de vida da meta

```
ABERTA ──(arrecadado = alvo)──► ATINGIDA ──(professor resgata)──► RESGATADA
   │
   └──(professor cancela)──► CANCELADA (estornos gerados)
```

## 1.5 Requisitos não funcionais

- **Mobile-first e responsivo:** 320px (celular pequeno) até desktop/projetor da sala.
- **PWA:** instalável na tela inicial; funciona com conexão ruim (leitura em cache; operações financeiras exigem conexão).
- **Acessibilidade:** WCAG 2.2 AA (contraste, navegação por teclado, leitores de tela). Atenção ao fundo preto + neon.
- **Desempenho:** primeira carga < 3 s em 4G; depósito em lote de 40 alunos < 1 s.
- **Privacidade (LGPD):** os usuários são majoritariamente menores; coletar o mínimo (nome, turma, matrícula). Sem fotos, CPF, e-mail ou telefone dos alunos.
- **Idioma:** português do Brasil.

## 1.6 Fora do escopo (v1)

- Transferência entre alunos (evita pressão/cobrança entre colegas).
- Dinheiro real ou conversão de moeda.
- App nativo (o PWA atende).

## 1.7 Perguntas respondidas

Todas as perguntas foram respondidas — ver [08-decisoes.md](08-decisoes.md). Ranking de contribuição: desligado na v1.
