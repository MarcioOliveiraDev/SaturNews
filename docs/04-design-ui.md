# 4. Design e UI

## 4.1 Direção de arte

Inspirada nas peças enviadas (festival Rec'n'Play 2025): **fundo preto
profundo**, **formas orgânicas "líquidas"** com gradientes vibrantes,
**textura de retícula/granulado** (halftone), tipografia display brincalhona e
mascotes 3D com cara de brinquedo (o caranguejo-robô remete ao manguebeat de Recife).

> Usamos a linguagem visual como inspiração. **Não** usaremos logotipos,
> mascotes ou marcas do Rec'n'Play, Porto Digital, Ampla ou Sebrae.
> Proposta de mascote próprio: **"Satu"**, um planetinha Saturno cujo anel é
> uma moeda — combinando com o nome $aturCoin$.

## 4.2 Paleta (tokens)

| Token | Hex | Uso |
|-------|-----|-----|
| `--bg` | `#050505` | Fundo principal |
| `--surface` | `#141414` | Cartões |
| `--surface-2` | `#1F1F1F` | Inputs, listas |
| `--neon-green` | `#5CFF2E` | Ação primária, valores positivos, títulos display |
| `--neon-pink` | `#FF2E9A` | Destaques, logo, badges |
| `--cyan` | `#22E5D4` | Gradientes, links, informação |
| `--yellow` | `#FFC81A` | Alertas, "quase lá" |
| `--purple` | `#8B3DFF` | Gradientes |
| `--text` | `#F5F5F5` | Texto principal |
| `--text-muted` | `#A3A3A3` | Texto secundário |
| `--danger` | `#FF4D4D` | Erros |

Gradiente das bolhas: `conic/radial` entre `--neon-pink`, `--purple`,
`--cyan` e `--neon-green`, com ruído granulado por cima (SVG `feTurbulence` ou PNG leve).

**Contraste:** verde e rosa neon sobre preto passam AA para texto grande.
Texto corrido usa `--text`. Não usar texto preto sobre gradiente sem verificar.

**Modo claro:** opcional na v2; o produto nasce escuro (identidade).

## 4.3 Tipografia (Google Fonts)

| Uso | Fonte | Observação |
|-----|-------|------------|
| Display / títulos | **Unbounded** | Geométrica arredondada, lembra o logotipo das peças |
| Chamadas "marcador" ("FALTAM S$ 120") | **Permanent Marker** | Só em destaques curtos |
| Texto e números | **Sora** ou **Inter** | Legível; números tabulares no saldo/extrato |

## 4.4 Componentes-chave

- **Cartão de saldo** — grande, com bolha de gradiente animada atrás, saldo em `Unbounded`, botão "olho" para ocultar valor.
- **Barra de progresso da meta** — trilho escuro, preenchimento em gradiente verde→ciano, texto "faltam S$ X" em *marker*; ao atingir 100%, confete.
- **Lista de transações** — ícone por tipo (⬇ depósito verde, ⬆ contribuição rosa, ↩ estorno ciano), descrição, autor, data relativa, valor alinhado à direita.
- **Seletor de alunos** — lista com checkbox, "Selecionar todos", busca por nome, contador fixo no rodapé ("32 selecionados · total S$ 320").
- **Teclado de valor** — botões de atalho (5, 10, 25, 50) + campo numérico.
- **Bottom navigation** (celular) → **sidebar** (≥ 1024px).

## 4.5 Telas

### Comum
1. **Splash / Login** — fundo preto com bolhas, logo SaturBank, campos login/senha.
2. **Trocar senha** (primeiro acesso).

### Aluno
3. **Início** — saudação ("Oi, Ana · 7º A"), cartão de saldo, metas da turma (carrossel), últimas transações.
4. **Metas da turma** — lista com progresso e "faltam S$ X".
5. **Detalhe da meta** — progresso grande, contribuidores, botão **Contribuir**.
6. **Contribuir** — teclado de valor, resumo, confirmar.
7. **Extrato** — filtros por tipo e período.

### Professor
8. **Início** — cartões das turmas (nº de alunos, metas abertas), atalho "Depositar".
9. **Turma** — lista de alunos com saldo; modo seleção para depósito em lote.
10. **Depositar** — individual ou lote, valor, descrição (obrigatória), confirmação.
11. **Aluno** — saldo e extrato do aluno.
12. **Metas da turma** — criar (a partir do catálogo), resgatar, cancelar.

### Administrador
13. Turmas, usuários, importação CSV, catálogo, configurações, auditoria (layout desktop).

## 4.6 Responsividade

| Breakpoint | Layout |
|------------|--------|
| < 480px | 1 coluna, bottom nav, cartões em largura total |
| 480–1023px | 1–2 colunas, bottom nav |
| ≥ 1024px | Sidebar + conteúdo em grade (2–3 colunas); bom para projetar em sala |

Áreas de toque ≥ 44×44px; respeitar `prefers-reduced-motion` (desliga bolhas
animadas e confete); safe areas do iOS.
