# Saturn Rush 🪐

Jogo de plataforma 2D estilo speedrun (inspirado em Super Mario) com o Saturno de
óculos neon como herói, num cenário de galáxia.

## Como rodar

É uma página estática, sem dependências. Sirva a pasta `game/` com qualquer servidor:

```bash
cd game && python3 -m http.server 8080
# abra http://localhost:8080
```

## O que tem

- **Tela inicial** com menu (jogar fase, speedrun completo, como jogar, som).
- **3 dificuldades:** Fácil (5 vidas, inimigos lentos), Normal (3 vidas) e Difícil
  (2 vidas, inimigos rápidos, buracos maiores, sem checkpoint).
- **5 fases** de dificuldade crescente: Cinturão de Asteroides, Nebulosa Rosa,
  Anéis de Saturno, Horizonte de Eventos e Supernova. Cada fase destrava a próxima.
- **Inimigos:** alien verde, alien saltador e disco voador — derrotados com um pulo na
  cabeça (combo ao pisar vários sem tocar o chão). O meteoro com espinhos não pode ser pisado.
- **Speedrun:** cronômetro com centésimos, recorde por fase e por dificuldade, medalhas
  ouro/prata/bronze, modo "speedrun completo" (5 fases seguidas com tempos parciais)
  e reset instantâneo com `R`. Recordes ficam salvos no navegador (localStorage).
- Blocos `?` com estrelas, blocos quebráveis, plataformas móveis, espinhos e checkpoint.
- Controles de toque no celular (na horizontal) e efeitos sonoros sintetizados.

## Controles

| Tecla | Ação |
|-------|------|
| ← → / A D | Mover |
| Espaço / ↑ / W / Z | Pular (segure para ir mais alto) |
| Shift / X | Correr |
| R | Reiniciar |
| Esc / P | Pausar |
| M | Som liga/desliga |
