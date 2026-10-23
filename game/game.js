/* Saturn Rush — speedrun de plataforma 2D no espaço. Sem dependências. */
(() => {
  'use strict';

  // ---------- Constantes ----------
  const T = 32;
  const ROWS = 17;
  const W = 960;
  const H = 544;
  const STEP = 1 / 120;
  const GRAV = 2100;
  const MAX_FALL = 900;
  const WALK = 230;
  const RUN = 340;
  const JUMP = 760;
  const H_MIN = 8;
  const H_MAX = 14;
  const PW = 30;
  const PH = 34;
  const DW = 72;
  const DH = Math.round((DW * 181) / 320);
  const SOLID = new Set(['#', 'B', 'Q', 'U', 'T', '=']);
  const FONT = '"Press Start 2P", monospace';
  const NEON = ['#39e5ff', '#ff4fd8', '#ffd23f', '#9d7bff'];

  const LEVELS = [
    {
      name: 'Cinturão de Asteroides', seed: 11, len: 150, gapMax: 3, enemy: 0.8,
      types: ['alien'],
      chunks: { flat: 5, gap: 3, stairs: 2, pillars: 2, platforms: 1 },
      pal: { top: '#070420', bot: '#2a1252', neb: ['rgba(90,60,220,0.30)', 'rgba(0,170,255,0.20)'], accent: '#39e5ff', accent2: '#ff4fd8', rock: ['#1f1240', '#47297a'], planet: ['#ffb36b', '#9a3412'] },
    },
    {
      name: 'Nebulosa Rosa', seed: 23, len: 180, gapMax: 3, enemy: 1,
      types: ['alien', 'ufo'],
      chunks: { flat: 4, gap: 3, stairs: 2, pillars: 2, platforms: 2, spikes: 1 },
      pal: { top: '#12031d', bot: '#4a0d4a', neb: ['rgba(255,60,200,0.28)', 'rgba(140,60,255,0.25)'], accent: '#ff5fd2', accent2: '#ffd23f', rock: ['#2d0e33', '#6a2a6a'], planet: ['#8be9ff', '#1d4ed8'] },
    },
    {
      name: 'Anéis de Saturno', seed: 37, len: 210, gapMax: 4, enemy: 1.15,
      types: ['alien', 'ufo', 'jumper'],
      chunks: { flat: 4, gap: 3, stairs: 1, pillars: 2, platforms: 2, spikes: 2, moving: 2 },
      pal: { top: '#0b0a24', bot: '#3b1f2b', neb: ['rgba(255,150,60,0.24)', 'rgba(120,60,255,0.24)'], accent: '#ffb347', accent2: '#39e5ff', rock: ['#2b1a14', '#6b4026'], planet: ['#ffe0a3', '#b45309'] },
    },
    {
      name: 'Horizonte de Eventos', seed: 51, len: 230, gapMax: 4, enemy: 1.3,
      types: ['alien', 'ufo', 'jumper', 'spiky'],
      chunks: { flat: 3, gap: 4, stairs: 1, pillars: 2, platforms: 3, spikes: 2, moving: 2 },
      pal: { top: '#020208', bot: '#1a0f3a', neb: ['rgba(160,110,255,0.26)', 'rgba(40,255,160,0.12)'], accent: '#a77bff', accent2: '#39ff9c', rock: ['#120e24', '#33285a'], planet: ['#1a1a1a', '#000000'] },
    },
    {
      name: 'Supernova', seed: 73, len: 260, gapMax: 4, enemy: 1.5,
      types: ['alien', 'ufo', 'jumper', 'spiky'],
      chunks: { flat: 3, gap: 4, stairs: 1, pillars: 2, platforms: 3, spikes: 3, moving: 3 },
      pal: { top: '#1a0505', bot: '#4a1208', neb: ['rgba(255,90,40,0.30)', 'rgba(255,220,80,0.18)'], accent: '#ff6a3d', accent2: '#ffe14f', rock: ['#2a0c0c', '#5a1f17'], planet: ['#fff6c2', '#f97316'] },
    },
  ];
  LEVELS.forEach((L) => { L.par = Math.round((L.len * T) / 290 + 3); });

  const DIFFS = {
    facil: { label: 'Fácil', lives: 5, speed: 0.75, density: 0.7, gapDelta: -1, checkpoints: true },
    normal: { label: 'Normal', lives: 3, speed: 1, density: 1, gapDelta: 0, checkpoints: true },
    dificil: { label: 'Difícil', lives: 2, speed: 1.35, density: 1.35, gapDelta: 1, checkpoints: false },
  };
  const DIFF_KEYS = Object.keys(DIFFS);

  const ENEMY = {
    alien: { w: 28, h: 26, speed: 60, stomp: true },
    jumper: { w: 26, h: 26, speed: 70, stomp: true },
    spiky: { w: 28, h: 26, speed: 45, stomp: false },
    ufo: { w: 40, h: 20, speed: 70, stomp: true },
  };

  // ---------- Utilidades ----------
  function mulberry32(a) {
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const overlap = (a, b, m = 0) =>
    a.x + m < b.x + b.w && a.x + a.w - m > b.x && a.y + m < b.y + b.h && a.y + a.h - m > b.y;
  function fmtTime(s) {
    if (s === undefined || s === null || !isFinite(s)) return '--:--.--';
    const m = Math.floor(s / 60);
    return String(m).padStart(2, '0') + ':' + (s - m * 60).toFixed(2).padStart(5, '0');
  }
  // A fonte pixelada não tem maiúsculas acentuadas.
  const plain = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  function medalFor(idx, t) {
    const par = LEVELS[idx].par;
    if (t <= par) return { icon: '🥇', name: 'Ouro' };
    if (t <= par * 1.35) return { icon: '🥈', name: 'Prata' };
    if (t <= par * 1.8) return { icon: '🥉', name: 'Bronze' };
    return null;
  }

  // ---------- Recordes (só neste navegador) ----------
  const STORE_KEY = 'saturn-rush-v1';
  let save = { unlocked: 1, best: {}, runBest: {}, muted: false };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) save = Object.assign(save, JSON.parse(raw));
  } catch {
    /* sem armazenamento: recordes valem só nesta sessão */
  }
  function persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(save));
    } catch {
      /* ignora */
    }
  }

  // ---------- Som (sintetizado) ----------
  let actx = null;
  let muted = !!save.muted;
  function ensureAudio() {
    if (!actx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        actx = AC ? new AC() : null;
      } catch {
        actx = null;
      }
    }
    if (actx && actx.state === 'suspended') actx.resume();
  }
  function tone(freq, dur, type = 'square', vol = 0.06, slideTo = 0, delay = 0) {
    if (!actx || muted) return;
    const t0 = actx.currentTime + delay;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(actx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }
  const sfx = {
    jump: () => tone(300, 0.16, 'square', 0.05, 620),
    stomp: () => { tone(220, 0.1, 'square', 0.07, 90); tone(660, 0.12, 'triangle', 0.06, 1200, 0.05); },
    coin: () => { tone(988, 0.07, 'square', 0.04); tone(1319, 0.16, 'square', 0.04, 0, 0.06); },
    bump: () => tone(140, 0.08, 'triangle', 0.08, 90),
    brick: () => { tone(180, 0.12, 'sawtooth', 0.05, 60); tone(90, 0.12, 'square', 0.04, 50, 0.03); },
    die: () => { tone(700, 0.18, 'square', 0.06, 300); tone(300, 0.45, 'square', 0.06, 60, 0.18); },
    count: () => tone(440, 0.1, 'square', 0.05),
    go: () => tone(880, 0.3, 'square', 0.06),
    checkpoint: () => [523, 784, 1047].forEach((f, i) => tone(f, 0.12, 'triangle', 0.06, 0, i * 0.08)),
    clear: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, 'square', 0.05, 0, i * 0.09)),
    click: () => tone(660, 0.05, 'square', 0.03),
  };

  // ---------- Imagem do herói ----------
  const hero = new Image();
  hero.src = 'assets/saturno.png';

  // ---------- Geração das fases ----------
  function buildLevel(idx, diffKey) {
    const L = LEVELS[idx];
    const D = DIFFS[diffKey];
    const rng = mulberry32(L.seed * 1013 + DIFF_KEYS.indexOf(diffKey) * 7);
    const cap = L.len + 90;
    const grid = Array.from({ length: ROWS }, () => new Array(cap).fill('.'));
    const coins = [];
    const enemies = [];
    const movers = [];
    const safe = [];
    const gapMax = clamp(L.gapMax + D.gapDelta, 2, 5);
    const walkers = L.types.filter((t) => t !== 'ufo');
    const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
    let x = 0;
    let h = 13;
    let lastEnemy = -10;

    const set = (c, r, t) => {
      if (c >= 0 && c < cap && r >= 0 && r < ROWS) grid[r][c] = t;
    };
    const ground = (c, top) => {
      for (let r = top; r < ROWS; r++) set(c, r, '#');
    };
    const coin = (c, r) => coins.push({ x: c * T + T / 2, y: r * T + T / 2, id: coins.length });
    const land = (n) => {
      for (let i = 0; i < n; i++) {
        ground(x, h);
        safe.push({ c: x, h });
        x++;
      }
    };
    const walker = (c, top) => {
      enemies.push({ type: walkers[Math.floor(rng() * walkers.length)], c, top });
      lastEnemy = c;
    };
    const maybeEnemy = (c, top) => {
      if (c < 16 || c - lastEnemy < 4) return;
      if (rng() < 0.26 * L.enemy * D.density) walker(c, top);
    };
    const maybeUfo = (c, top) => {
      if (c < 16 || !L.types.includes('ufo')) return;
      if (rng() < 0.35 * L.enemy * D.density) enemies.push({ type: 'ufo', c, top });
    };

    const chunks = {
      flat() {
        const len = ri(5, 10);
        const x0 = x;
        land(len);
        if (len >= 7 && rng() < 0.6) {
          const bx = x0 + ri(1, len - 4);
          for (let i = 0; i < 3; i++) set(bx + i, h - 4, rng() < 0.4 ? 'Q' : 'B');
          if (rng() < 0.5) for (let i = 0; i < 3; i++) coin(bx + i, h - 5);
        } else if (rng() < 0.5) {
          for (let i = 1; i < len - 1; i++) coin(x0 + i, h - 2);
        }
        for (let i = 2; i < len - 1; i++) maybeEnemy(x0 + i, h);
        maybeUfo(x0 + Math.floor(len / 2), h);
      },
      gap() {
        const w = ri(2, gapMax);
        for (let i = 0; i < w; i++) coin(x + i, h - 3 - (i > 0 && i < w - 1 ? 1 : 0));
        x += w;
        h = clamp(h + ri(-1, 1), H_MIN, H_MAX);
        land(2);
      },
      stairs() {
        const up = h - 3 >= H_MIN && (h >= H_MAX - 1 || rng() < 0.55);
        const steps = ri(2, 3);
        for (let s = 0; s < steps; s++) {
          h = clamp(h + (up ? -1 : 1), H_MIN, H_MAX);
          land(2);
        }
        if (rng() < 0.5) coin(x - 1, h - 2);
        land(1);
      },
      pillars() {
        land(2);
        const pillar = () => {
          const ph = ri(2, 3);
          for (let i = 0; i < 2; i++) {
            ground(x + i, h);
            for (let r = h - ph; r < h; r++) set(x + i, r, 'T');
            coin(x + i, h - ph - 1);
          }
          x += 2;
        };
        pillar();
        const len = ri(4, 6);
        const x0 = x;
        land(len);
        if (x0 >= 16 && rng() < 0.75 * Math.min(1, D.density)) walker(x0 + Math.floor(len / 2), h);
        pillar();
        land(2);
      },
      platforms() {
        let pr = h - ri(1, 2);
        const n = ri(2, 3);
        for (let k = 0; k < n; k++) {
          x += ri(2, Math.min(3, gapMax));
          if (k > 0) pr = clamp(pr + ri(-1, 1), h - 3, h - 1);
          for (let i = 0; i < 3; i++) set(x + i, pr, '=');
          coin(x + 1, pr - 1);
          if (k === 1) maybeUfo(x + 1, pr);
          x += 3;
        }
        x += ri(2, Math.min(3, gapMax));
        h = clamp(pr + ri(0, 2), H_MIN, H_MAX);
        land(2);
      },
      spikes() {
        land(2);
        const w = ri(2, 3);
        const withCoins = rng() < 0.5;
        for (let i = 0; i < w; i++) {
          ground(x, h);
          set(x, h - 1, '^');
          if (withCoins) coin(x, h - 4);
          x++;
        }
        land(2);
      },
      moving() {
        const w = ri(8, 11);
        movers.push({ c: x, w, top: h });
        for (let i = 2; i < w - 1; i += 2) coin(x + i, h - 2);
        x += w;
        land(3);
      },
    };

    const names = Object.keys(L.chunks);
    const total = names.reduce((s, n) => s + L.chunks[n], 0);
    const pick = () => {
      let r = rng() * total;
      for (const n of names) {
        r -= L.chunks[n];
        if (r < 0) return n;
      }
      return 'flat';
    };

    land(12);
    let prev = '';
    while (x < L.len - 30) {
      let n = pick();
      if (n === prev && n !== 'flat') n = 'flat';
      chunks[n]();
      prev = n;
    }
    // Escadaria final até o portal.
    land(3);
    const stepsUp = Math.min(4, h - H_MIN);
    for (let s = 0; s < stepsUp; s++) {
      h--;
      land(2);
    }
    land(14);
    const cols = x;

    const mid = cols / 2;
    let cp = null;
    for (const s of safe) {
      if (grid[s.h - 1][s.c] !== '.' || grid[s.h - 2][s.c] !== '.') continue;
      if (!cp || Math.abs(s.c - mid) < Math.abs(cp.c - mid)) cp = s;
    }

    return {
      idx,
      def: L,
      cols,
      worldW: cols * T,
      grid: grid.map((row) => row.slice(0, cols)),
      coins,
      enemyTpl: enemies,
      moverTpl: movers,
      start: { x: 3 * T, y: 13 * T - PH },
      checkpoint: cp ? { x: cp.c * T, y: cp.h * T } : null,
      goal: { x: (cols - 8) * T, y: h * T },
    };
  }

  // ---------- Arte pré-renderizada ----------
  function makeTiles(L) {
    const P = L.pal;
    const rng = mulberry32(L.seed + 3);
    const rock = (top) => {
      const c = makeCanvas(T, T);
      const g = c.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 0, T);
      gr.addColorStop(0, P.rock[1]);
      gr.addColorStop(1, P.rock[0]);
      g.fillStyle = gr;
      g.fillRect(0, 0, T, T);
      for (let i = 0; i < 8; i++) {
        g.fillStyle = rng() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.22)';
        g.beginPath();
        g.arc(rng() * T, rng() * T, 1 + rng() * 3, 0, Math.PI * 2);
        g.fill();
      }
      g.strokeStyle = 'rgba(0,0,0,0.25)';
      g.strokeRect(0.5, 0.5, T - 1, T - 1);
      if (top) {
        const tg = g.createLinearGradient(0, 0, 0, 12);
        tg.addColorStop(0, P.accent);
        tg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = tg;
        g.fillRect(0, 0, T, 12);
        g.fillStyle = 'rgba(255,255,255,0.85)';
        g.fillRect(0, 0, T, 2);
      }
      return c;
    };
    const brick = makeCanvas(T, T);
    {
      const g = brick.getContext('2d');
      g.fillStyle = '#2a1b52';
      g.fillRect(0, 0, T, T);
      g.fillStyle = 'rgba(255,255,255,0.15)';
      g.fillRect(0, 0, T, 3);
      g.fillRect(0, 0, 3, T);
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(0, T - 3, T, 3);
      g.fillRect(T - 3, 0, 3, T);
      g.strokeStyle = P.accent2;
      g.globalAlpha = 0.7;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(3, 16); g.lineTo(T - 3, 16);
      g.moveTo(16, 3); g.lineTo(16, 16);
      g.moveTo(9, 16); g.lineTo(9, T - 3);
      g.moveTo(24, 16); g.lineTo(24, T - 3);
      g.stroke();
    }
    const used = makeCanvas(T, T);
    {
      const g = used.getContext('2d');
      g.fillStyle = '#3a3150';
      g.fillRect(0, 0, T, T);
      g.strokeStyle = '#211a33';
      g.lineWidth = 3;
      g.strokeRect(1.5, 1.5, T - 3, T - 3);
      g.fillStyle = '#5c5078';
      [[6, 6], [T - 8, 6], [6, T - 8], [T - 8, T - 8]].forEach(([a, b]) => g.fillRect(a, b, 3, 3));
    }
    const pipe = (top) => {
      const c = makeCanvas(T, T);
      const g = c.getContext('2d');
      const gr = g.createLinearGradient(0, 0, T, 0);
      gr.addColorStop(0, '#120a2a');
      gr.addColorStop(0.45, P.accent);
      gr.addColorStop(1, '#120a2a');
      g.fillStyle = gr;
      g.fillRect(2, 0, T - 4, T);
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fillRect(10, 0, 3, T);
      if (top) {
        g.fillStyle = '#1b1040';
        g.fillRect(0, 0, T, 8);
        g.fillStyle = P.accent;
        g.fillRect(0, 0, T, 3);
      }
      return c;
    };
    const plat = makeCanvas(T, T);
    {
      const g = plat.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 0, T);
      gr.addColorStop(0, '#59679a');
      gr.addColorStop(1, '#1d2444');
      g.fillStyle = gr;
      g.fillRect(0, 0, T, T);
      g.fillStyle = P.accent;
      g.fillRect(0, 0, T, 3);
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.fillRect(T - 2, 0, 2, T);
      g.fillStyle = P.accent2;
      g.fillRect(14, 18, 4, 4);
    }
    return { rockTop: rock(true), rock: rock(false), rock2: rock(false), brick, used, pipe: pipe(false), pipeTop: pipe(true), plat };
  }

  function makeBackdrop(L) {
    const c = makeCanvas(W * 2, H);
    const g = c.getContext('2d');
    const rng = mulberry32(L.seed + 5);
    for (let i = 0; i < 10; i++) {
      const x = rng() * W * 2;
      const y = rng() * H * 0.85;
      const r = 120 + rng() * 260;
      for (const ox of [-W * 2, 0, W * 2]) {
        const gr = g.createRadialGradient(x + ox, y, 0, x + ox, y, r);
        gr.addColorStop(0, L.pal.neb[i % 2]);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr;
        g.fillRect(x + ox - r, y - r, r * 2, r * 2);
      }
    }
    return c;
  }
  const backdrops = new Map();
  const backdrop = (L) => {
    if (!backdrops.has(L)) backdrops.set(L, makeBackdrop(L));
    return backdrops.get(L);
  };

  const stars = [];
  {
    const r = mulberry32(99);
    const sizes = [0.8, 1.3, 2];
    const speeds = [0.06, 0.15, 0.32];
    for (let l = 0; l < 3; l++) {
      for (let i = 0; i < 110; i++) stars.push({ x: r() * W * 2, y: r() * H, s: sizes[l], f: speeds[l], tw: r() * 6.28 });
    }
  }

  // ---------- Estado do jogo ----------
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let state = 'menu'; // menu | countdown | play | dying | clear | paused | results | over
  let prevState = 'play';
  let mode = 'single'; // single | run
  let diffKey = 'normal';
  let levelIdx = 0;
  let level = null;
  let tiles = null;
  let player = null;
  let enemies = [];
  let movers = [];
  let parts = [];
  let shooting = [];
  let collected = new Set();
  let checkpointOn = false;
  let camX = 0;
  let menuCam = 0;
  let clock = 0;
  let levelTime = 0;
  let finalTime = 0;
  let runTime = 0;
  let splits = [];
  let lives = 3;
  let stomps = 0;
  let combo = 0;
  let countdown = 0;
  let lastCount = 0;
  let goFlash = 0;
  let deathT = 0;
  let clearT = 0;
  let shake = 0;
  const input = { left: false, right: false, jump: false, run: false };

  function clearInput() {
    input.left = input.right = input.jump = input.run = false;
    document.querySelectorAll('#touch button').forEach((b) => b.classList.remove('act'));
  }

  function makeEnemy(t, i) {
    const d = ENEMY[t.type];
    const sp = d.speed * DIFFS[diffKey].speed * (1 + levelIdx * 0.06);
    const e = {
      type: t.type, w: d.w, h: d.h, stomp: d.stomp,
      x: t.c * T + (T - d.w) / 2, y: t.top * T - d.h,
      vx: -sp, vy: 0, onGround: false, active: false,
      dead: false, deadT: 0, knocked: false, gone: false, t: i * 0.7, hop: 0.6 + (i % 3) * 0.3,
    };
    if (t.type === 'ufo') {
      e.y = (t.top - 3) * T - 6;
      e.x0 = e.x;
      e.y0 = e.y;
      e.range = 60 + (i % 3) * 20;
      e.spd = sp / 70;
    }
    return e;
  }

  function resetActors() {
    const useCp = checkpointOn && level.checkpoint && DIFFS[diffKey].checkpoints;
    const sp = useCp ? { x: level.checkpoint.x, y: level.checkpoint.y - PH } : level.start;
    player = {
      x: sp.x, y: sp.y, w: PW, h: PH, vx: 0, vy: 0, face: 1, onGround: false,
      coyote: 0, jumpBuf: 0, dead: false, squash: 0, riding: null, invul: useCp ? 1.2 : 0,
      spin: 0, scale: 1, prevBottom: sp.y + PH, trail: 0,
    };
    enemies = level.enemyTpl.map(makeEnemy);
    movers = level.moverTpl.map((m) => ({
      x: m.c * T, y: m.top * T, w: 3 * T, h: 14, x0: m.c * T, x1: (m.c + m.w - 3) * T, dir: 1, dx: 0,
      speed: (70 + levelIdx * 12) * Math.min(1.2, DIFFS[diffKey].speed),
    }));
    combo = 0;
    camX = clamp(player.x - W * 0.35, 0, level.worldW - W);
  }

  function startLevel(idx) {
    levelIdx = idx;
    level = buildLevel(idx, diffKey);
    tiles = makeTiles(level.def);
    collected = new Set();
    checkpointOn = false;
    levelTime = 0;
    stomps = 0;
    parts = [];
    resetActors();
    state = 'countdown';
    countdown = 1.2;
    lastCount = 0;
    hideUI();
    clearInput();
  }
  function startSingle(idx) {
    mode = 'single';
    lives = DIFFS[diffKey].lives;
    runTime = 0;
    splits = [];
    startLevel(idx);
  }
  function startRun() {
    mode = 'run';
    lives = DIFFS[diffKey].lives;
    runTime = 0;
    splits = [];
    startLevel(0);
  }
  function retry() {
    if (mode === 'run') startRun();
    else startSingle(levelIdx);
  }
  function nextLevel() {
    if (levelIdx + 1 >= LEVELS.length) return;
    if (mode === 'single') lives = DIFFS[diffKey].lives;
    startLevel(levelIdx + 1);
  }

  // ---------- Física ----------
  function solidAt(c, r) {
    if (c < 0 || c >= level.cols) return true;
    if (r < 0 || r >= ROWS) return false;
    return SOLID.has(level.grid[r][c]);
  }
  function moveX(o, dx) {
    o.x += dx;
    const top = Math.floor(o.y / T);
    const bot = Math.floor((o.y + o.h - 0.01) / T);
    if (dx > 0) {
      const c = Math.floor((o.x + o.w - 0.01) / T);
      for (let r = top; r <= bot; r++) if (solidAt(c, r)) { o.x = c * T - o.w; return true; }
    } else if (dx < 0) {
      const c = Math.floor(o.x / T);
      for (let r = top; r <= bot; r++) if (solidAt(c, r)) { o.x = (c + 1) * T; return true; }
    }
    return false;
  }
  function moveY(o, dy) {
    o.y += dy;
    const l = Math.floor(o.x / T);
    const rr = Math.floor((o.x + o.w - 0.01) / T);
    if (dy > 0) {
      const r = Math.floor((o.y + o.h - 0.01) / T);
      for (let c = l; c <= rr; c++) if (solidAt(c, r)) { o.y = r * T - o.h; return { hit: 1 }; }
    } else if (dy < 0) {
      const r = Math.floor(o.y / T);
      const mc = Math.floor((o.x + o.w / 2) / T);
      const order = mc === l ? [l, rr] : [rr, l];
      for (const c of order) if (solidAt(c, r)) { o.y = (r + 1) * T; return { hit: -1, c, r }; }
    }
    return { hit: 0 };
  }

  // ---------- Partículas ----------
  function burst(x, y, n, colors, speed = 220, life = 0.6, size = 3) {
    for (let i = 0; i < n && parts.length < 500; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life, max: life, color: colors[i % colors.length], size, g: 600 });
    }
  }
  function floatText(x, y, text, color) {
    parts.push({ x, y, vx: 0, vy: -70, life: 0.9, max: 0.9, text, color, g: 0 });
  }
  function updateParticles(dt) {
    for (const p of parts) {
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    parts = parts.filter((p) => p.life > 0);
    if (Math.random() < 0.006) shooting.push({ x: W * (0.3 + Math.random()), y: Math.random() * H * 0.4, life: 0.9 });
    for (const s of shooting) {
      s.x -= 620 * dt;
      s.y += 260 * dt;
      s.life -= dt;
    }
    shooting = shooting.filter((s) => s.life > 0);
  }

  // ---------- Atualização ----------
  function update(dt) {
    clock += dt;
    if (state === 'menu') {
      menuCam += dt * 50;
      updateParticles(dt);
      return;
    }
    if (state === 'paused' || state === 'results' || state === 'over' || !level) return;
    if (state === 'countdown') {
      countdown -= dt;
      const n = Math.ceil(countdown / 0.4);
      if (n !== lastCount && n > 0) { lastCount = n; sfx.count(); }
      if (countdown <= 0) { state = 'play'; goFlash = 0.8; sfx.go(); }
      updateParticles(dt);
      return;
    }
    if (state === 'play' || state === 'dying') levelTime += dt;
    goFlash -= dt;
    shake = Math.max(0, shake - dt * 40);
    updateMovers(dt);
    if (state === 'play') updatePlayer(dt);
    else if (state === 'dying') updateDying(dt);
    else if (state === 'clear') updateClear(dt);
    updateEnemies(dt);
    updateParticles(dt);
    if (state !== 'dying') updateCamera(dt);
  }

  function updateMovers(dt) {
    for (const m of movers) {
      const ox = m.x;
      m.x += m.dir * m.speed * dt;
      if (m.x >= m.x1) { m.x = m.x1; m.dir = -1; }
      if (m.x <= m.x0) { m.x = m.x0; m.dir = 1; }
      m.dx = m.x - ox;
      if (player && player.riding === m && !player.dead) moveX(player, m.dx);
    }
  }

  function updatePlayer(dt) {
    const p = player;
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const maxV = input.run ? RUN : WALK;
    p.prevBottom = p.y + p.h;
    p.invul = Math.max(0, p.invul - dt);

    if (dir) {
      const acc = p.onGround ? 1900 : 1300;
      const turning = p.vx * dir < 0;
      p.vx += dir * acc * (turning ? 1.8 : 1) * dt;
      p.face = dir;
      if (Math.abs(p.vx) > maxV) p.vx = Math.sign(p.vx) * Math.max(maxV, Math.abs(p.vx) - 900 * dt);
    } else {
      const fr = (p.onGround ? 2200 : 500) * dt;
      p.vx = Math.abs(p.vx) <= fr ? 0 : p.vx - Math.sign(p.vx) * fr;
    }

    p.coyote = p.onGround ? 0.09 : p.coyote - dt;
    p.jumpBuf -= dt;
    if (p.jumpBuf > 0 && p.coyote > 0) {
      p.vy = -(JUMP + Math.abs(p.vx) * 0.12);
      p.onGround = false;
      p.coyote = 0;
      p.jumpBuf = 0;
      p.squash = -0.3;
      p.riding = null;
      sfx.jump();
    }
    const gMul = p.vy < 0 && !input.jump ? 2.6 : p.vy > 0 ? 1.15 : 1;
    p.vy = Math.min(p.vy + GRAV * gMul * dt, MAX_FALL);

    if (moveX(p, p.vx * dt)) p.vx = 0;
    p.x = clamp(p.x, 0, level.worldW - p.w);

    const wasGround = p.onGround;
    p.onGround = false;
    p.riding = null;
    const res = moveY(p, p.vy * dt);
    if (res.hit === 1) {
      p.vy = 0;
      p.onGround = true;
    } else if (res.hit === -1) {
      p.vy = 40;
      hitBlock(res.c, res.r);
    }
    if (!p.onGround && p.vy >= 0) {
      for (const m of movers) {
        if (p.x + p.w > m.x + 2 && p.x < m.x + m.w - 2 && p.prevBottom <= m.y + 2 && p.y + p.h >= m.y) {
          p.y = m.y - p.h;
          p.vy = 0;
          p.onGround = true;
          p.riding = m;
          break;
        }
      }
    }
    if (p.onGround && !wasGround) {
      p.squash = 0.3;
      combo = 0;
      burst(p.x + p.w / 2, p.y + p.h, 5, ['rgba(255,255,255,0.6)'], 90, 0.3, 2);
    }
    p.squash += (0 - p.squash) * Math.min(1, dt * 12);

    // Rastro neon ao correr.
    p.trail -= dt;
    if (Math.abs(p.vx) > WALK + 30 && p.trail <= 0) {
      p.trail = 0.025;
      parts.push({ x: p.x + p.w / 2 - p.face * 26, y: p.y + p.h * 0.55 + (Math.random() - 0.5) * 8, vx: -p.face * 40, vy: 0, life: 0.35, max: 0.35, color: NEON[Math.floor(clock * 20) % NEON.length], size: 4, g: 0 });
    }

    // Espinhos.
    const c0 = Math.floor(p.x / T);
    const c1 = Math.floor((p.x + p.w - 0.01) / T);
    const r0 = Math.floor(p.y / T);
    const r1 = Math.floor((p.y + p.h - 0.01) / T);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (r >= 0 && r < ROWS && c >= 0 && c < level.cols && level.grid[r][c] === '^' &&
          overlap(p, { x: c * T + 5, y: r * T + 14, w: T - 10, h: T - 14 })) {
          die(true);
          return;
        }
      }
    }
    if (p.y > H + 40) { die(true); return; }

    // Estrelas (moedas).
    const pcx = p.x + p.w / 2;
    const pcy = p.y + p.h / 2;
    for (const cn of level.coins) {
      if (collected.has(cn.id) || Math.abs(cn.x - pcx) > 26 || Math.abs(cn.y - pcy) > 28) continue;
      collected.add(cn.id);
      sfx.coin();
      burst(cn.x, cn.y, 6, ['#ffd23f', '#fff3b0'], 120, 0.4, 2);
    }

    // Checkpoint.
    const cp = level.checkpoint;
    if (cp && DIFFS[diffKey].checkpoints && !checkpointOn && p.x > cp.x) {
      checkpointOn = true;
      sfx.checkpoint();
      burst(cp.x + 16, cp.y - 60, 20, NEON, 200, 0.7, 3);
      floatText(cp.x + 16, cp.y - 80, 'CHECKPOINT', '#39ff9c');
    }

    // Portal de chegada.
    if (p.x + p.w > level.goal.x + 14) {
      state = 'clear';
      clearT = 0;
      finalTime = levelTime;
      p.vx = 0;
      sfx.clear();
      burst(level.goal.x + 24, level.goal.y - 56, 40, NEON, 320, 0.9, 4);
    }
  }

  function hitBlock(c, r) {
    const t = level.grid[r][c];
    const bx = c * T + T / 2;
    const by = r * T;
    if (t === 'Q') {
      level.grid[r][c] = 'U';
      sfx.coin();
      parts.push({ x: bx, y: by - 10, vx: 0, vy: -440, life: 0.5, max: 0.5, star: true, g: 1500 });
      floatText(bx, by - 20, '+1', '#ffd23f');
      level.bonus = (level.bonus || 0) + 1;
    } else if (t === 'B') {
      level.grid[r][c] = '.';
      sfx.brick();
      for (let i = 0; i < 4; i++) {
        parts.push({ x: bx + (i % 2 ? 8 : -8), y: by + (i < 2 ? 8 : 24), vx: (i % 2 ? 1 : -1) * (80 + Math.random() * 60), vy: -420 + (i < 2 ? -80 : 60), life: 0.9, max: 0.9, color: level.def.pal.accent2, size: 8, g: 1800 });
      }
    } else {
      sfx.bump();
    }
    // Inimigos em cima do bloco são derrubados.
    for (const e of enemies) {
      if (!e.dead && !e.knocked && e.type !== 'ufo' && Math.abs(e.y + e.h - by) < 4 && e.x + e.w > c * T && e.x < (c + 1) * T) knock(e);
    }
  }

  function knock(e) {
    e.knocked = true;
    e.vy = -420;
    e.vx = (Math.random() < 0.5 ? -1 : 1) * 80;
    stomps++;
    burst(e.x + e.w / 2, e.y + e.h / 2, 10, NEON, 200, 0.5, 3);
  }

  function die(force) {
    if (state !== 'play') return;
    if (!force && player.invul > 0) return;
    state = 'dying';
    player.dead = true;
    player.vy = -620;
    player.vx = 0;
    player.riding = null;
    deathT = 0;
    lives--;
    shake = 10;
    sfx.die();
    burst(player.x + player.w / 2, player.y + player.h / 2, 18, NEON, 260, 0.7, 3);
  }
  function updateDying(dt) {
    deathT += dt;
    player.vy += GRAV * 0.8 * dt;
    player.y += player.vy * dt;
    player.spin += dt * 9;
    if (deathT > 1.2) {
      if (lives <= 0) {
        state = 'over';
        showOver();
      } else {
        resetActors();
        state = 'play';
        player.invul = 1.2;
      }
    }
  }
  function updateClear(dt) {
    clearT += dt;
    const p = player;
    p.x += (level.goal.x + 24 - p.w / 2 - p.x) * Math.min(1, dt * 5);
    p.y += (level.goal.y - 56 - p.h / 2 - p.y) * Math.min(1, dt * 5);
    p.spin += dt * 12;
    p.scale = Math.max(0, 1 - clearT / 0.9);
    if (Math.random() < 0.4) burst(level.goal.x + 24, level.goal.y - 56, 1, NEON, 160, 0.5, 3);
    if (clearT > 1.4) {
      state = 'results';
      showResults();
    }
  }

  function updateEnemies(dt) {
    const D = DIFFS[diffKey];
    for (const e of enemies) {
      if (e.gone) continue;
      if (!e.active) {
        if (e.x < camX + W + 64) e.active = true;
        else continue;
      }
      e.t += dt;
      if (e.dead) {
        e.deadT -= dt;
        if (e.deadT <= 0) e.gone = true;
        continue;
      }
      if (e.knocked) {
        e.vy += GRAV * dt;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        if (e.y > H + 80) e.gone = true;
        continue;
      }
      if (e.type === 'ufo') {
        e.x = e.x0 + Math.sin(e.t * 0.9 * e.spd) * e.range;
        e.y = e.y0 + Math.sin(e.t * 2.3) * 14;
      } else {
        if (e.type === 'jumper' && e.onGround) {
          e.hop -= dt;
          if (e.hop <= 0) { e.vy = -620 * Math.min(1.1, D.speed); e.hop = 1.1; e.onGround = false; }
        }
        e.vy = Math.min(e.vy + GRAV * dt, MAX_FALL);
        if (moveX(e, e.vx * dt)) e.vx = -e.vx;
        const res = moveY(e, e.vy * dt);
        e.onGround = res.hit === 1;
        if (res.hit !== 0) e.vy = 0;
        if (e.onGround) {
          const fx = e.vx > 0 ? e.x + e.w + 1 : e.x - 1;
          if (!solidAt(Math.floor(fx / T), Math.floor((e.y + e.h + 2) / T))) e.vx = -e.vx;
        }
        if (e.y > H + 80) e.gone = true;
      }
      if (state === 'play' && !player.dead && overlap(player, e, 3)) {
        const fromAbove = player.vy > 0 && player.prevBottom <= e.y + Math.max(10, e.h * 0.5);
        if (fromAbove && e.stomp) stomp(e);
        else if (fromAbove && player.invul > 0) player.vy = -JUMP * 0.5;
        else die(false);
      }
    }
  }

  function stomp(e) {
    combo++;
    stomps++;
    player.vy = input.jump ? -JUMP * 0.95 : -JUMP * 0.6;
    player.y = e.y - player.h;
    sfx.stomp();
    shake = 4;
    burst(e.x + e.w / 2, e.y + e.h / 2, 12, NEON, 230, 0.5, 3);
    floatText(e.x + e.w / 2, e.y - 10, combo > 1 ? 'COMBO x' + combo : 'BOING!', combo > 1 ? '#ffd23f' : '#ffffff');
    if (e.type === 'ufo') {
      e.knocked = true;
      e.vy = -100;
      e.vx = 0;
    } else {
      e.dead = true;
      e.deadT = 0.45;
    }
  }

  function updateCamera(dt) {
    const p = player;
    const target = p.x + p.w / 2 - W * 0.4 + p.face * 60;
    camX += (target - camX) * Math.min(1, dt * 5);
    camX = clamp(camX, 0, level.worldW - W);
  }

  // ---------- Desenho ----------
  function drawPlanet(P, x, y, r) {
    const ring = (from, to) => {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = P.accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.9, r * 0.45, -0.28, from, to);
      ctx.stroke();
      ctx.restore();
    };
    ring(Math.PI, Math.PI * 2);
    const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, P.planet[0]);
    g.addColorStop(1, P.planet[1]);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ring(0, Math.PI);
  }

  function drawSky(L, cam) {
    const P = L.pal;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, P.top);
    g.addColorStop(1, P.bot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const bd = backdrop(L);
    const off = -((cam * 0.05) % (W * 2));
    ctx.drawImage(bd, off, 0);
    ctx.drawImage(bd, off + W * 2, 0);
    const span = W + 500;
    const px = ((((W * 0.78 - cam * 0.025) % span) + span) % span) - 250;
    if (state !== 'menu') drawPlanet(P, px, 130, 64);
    for (const s of stars) {
      const x = (((s.x - cam * s.f) % (W * 2)) + W * 2) % (W * 2);
      if (x > W) continue;
      ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(clock * 2 + s.tw));
      ctx.fillStyle = '#fff';
      ctx.fillRect(x, s.y, s.s, s.s);
    }
    ctx.globalAlpha = 1;
    for (const s of shooting) {
      const gr = ctx.createLinearGradient(s.x, s.y, s.x + 90, s.y - 38);
      gr.addColorStop(0, 'rgba(255,255,255,' + Math.min(1, s.life * 1.5) + ')');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = gr;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + 90, s.y - 38);
      ctx.stroke();
    }
    const abyss = ctx.createLinearGradient(0, H - 70, 0, H);
    abyss.addColorStop(0, 'rgba(0,0,0,0)');
    abyss.addColorStop(1, P.accent2 + '55');
    ctx.fillStyle = abyss;
    ctx.fillRect(0, H - 70, W, 70);
  }

  function drawStar(cx, cy, r, sx) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sx, 1);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawTiles() {
    const P = level.def.pal;
    const c0 = Math.max(0, Math.floor(camX / T));
    const c1 = Math.min(level.cols - 1, c0 + Math.ceil(W / T) + 1);
    for (let r = 0; r < ROWS; r++) {
      for (let c = c0; c <= c1; c++) {
        const t = level.grid[r][c];
        if (t === '.') continue;
        const x = c * T;
        const y = r * T;
        if (t === '#') {
          const above = r > 0 ? level.grid[r - 1][c] : '.';
          ctx.drawImage(above === '#' ? ((c * 7 + r * 3) % 3 === 0 ? tiles.rock2 : tiles.rock) : tiles.rockTop, x, y);
        } else if (t === 'B') {
          ctx.drawImage(tiles.brick, x, y);
        } else if (t === 'U') {
          ctx.drawImage(tiles.used, x, y);
        } else if (t === '=') {
          ctx.drawImage(tiles.plat, x, y);
        } else if (t === 'T') {
          ctx.drawImage(r > 0 && level.grid[r - 1][c] === 'T' ? tiles.pipe : tiles.pipeTop, x, y);
        } else if (t === 'Q') {
          const pulse = 0.5 + 0.5 * Math.sin(clock * 5 + c);
          const g = ctx.createLinearGradient(x, y, x, y + T);
          g.addColorStop(0, '#ffe680');
          g.addColorStop(1, '#e08a00');
          ctx.fillStyle = g;
          ctx.fillRect(x, y, T, T);
          ctx.strokeStyle = '#7a3d00';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, T - 2, T - 2);
          ctx.fillStyle = 'rgba(255,255,255,' + (0.2 + pulse * 0.3) + ')';
          ctx.fillRect(x + 2, y + 2, T - 4, 4);
          ctx.fillStyle = '#5a2600';
          ctx.font = '16px ' + FONT;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('?', x + T / 2 + 1, y + T / 2 + 2 - pulse * 2);
        } else if (t === '^') {
          for (let k = 0; k < 2; k++) {
            const sx = x + k * 16;
            const g = ctx.createLinearGradient(sx, y + 8, sx, y + T);
            g.addColorStop(0, '#ffffff');
            g.addColorStop(0.3, P.accent2);
            g.addColorStop(1, '#2a0030');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(sx + 1, y + T);
            ctx.lineTo(sx + 8, y + 6);
            ctx.lineTo(sx + 15, y + T);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    }
  }

  function drawCoins() {
    ctx.fillStyle = '#ffd23f';
    ctx.strokeStyle = '#fff3b0';
    ctx.lineWidth = 1.5;
    const sx = Math.abs(Math.cos(clock * 3));
    for (const cn of level.coins) {
      if (collected.has(cn.id) || cn.x < camX - 20 || cn.x > camX + W + 20) continue;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(cn.x, cn.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      drawStar(cn.x, cn.y + Math.sin(clock * 3 + cn.id) * 2, 10, Math.max(0.15, sx));
    }
  }

  function drawCheckpoint() {
    const cp = level.checkpoint;
    if (!cp || !DIFFS[diffKey].checkpoints) return;
    const x = cp.x + 16;
    ctx.fillStyle = '#9aa3c7';
    ctx.fillRect(x - 2, cp.y - 70, 4, 70);
    const on = checkpointOn;
    const col = on ? '#39ff9c' : '#6b6f8a';
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x + 2, cp.y - 70);
    ctx.lineTo(x + 30, cp.y - 60);
    ctx.lineTo(x + 2, cp.y - 50);
    ctx.fill();
    ctx.globalAlpha = on ? 0.5 + 0.5 * Math.sin(clock * 6) : 0.4;
    ctx.beginPath();
    ctx.arc(x, cp.y - 74, on ? 8 : 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawGoal() {
    const g = level.goal;
    const cx = g.x + 24;
    const cy = g.y - 60;
    const inner = ctx.createRadialGradient(cx, cy, 2, cx, cy, 52);
    inner.addColorStop(0, 'rgba(255,255,255,0.95)');
    inner.addColorStop(0.35, level.def.pal.accent + 'cc');
    inner.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = inner;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 30, 56, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = 'hsl(' + ((clock * 140 + i * 50) % 360) + ',100%,62%)';
      ctx.lineWidth = 4 - i * 0.6;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 32 - i * 6, 58 - i * 10, Math.sin(clock * 2 + i) * 0.15, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('CHEGADA', cx, cy - 66);
  }

  function drawMovers() {
    for (const m of movers) {
      if (m.x > camX + W || m.x + m.w < camX) continue;
      const g = ctx.createLinearGradient(0, m.y, 0, m.y + m.h);
      g.addColorStop(0, '#8fa2e0');
      g.addColorStop(1, '#2a335e');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(m.x, m.y, m.w, m.h, 5);
      ctx.fill();
      ctx.fillStyle = level.def.pal.accent;
      ctx.fillRect(m.x + 4, m.y, m.w - 8, 3);
      const flick = 0.6 + Math.random() * 0.4;
      for (const ox of [16, m.w - 16]) {
        const fg = ctx.createLinearGradient(0, m.y + m.h, 0, m.y + m.h + 18 * flick);
        fg.addColorStop(0, 'rgba(255,200,80,0.9)');
        fg.addColorStop(1, 'rgba(255,80,40,0)');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(m.x + ox - 6, m.y + m.h);
        ctx.lineTo(m.x + ox + 6, m.y + m.h);
        ctx.lineTo(m.x + ox, m.y + m.h + 18 * flick);
        ctx.fill();
      }
    }
  }

  function eye(x, y, r, look) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#120820';
    ctx.beginPath();
    ctx.arc(x + look * r * 0.35, y + 1, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + look * r * 0.35 - 1, y - 2, 2, 2);
  }

  function drawEnemy(e) {
    const cx = e.x + e.w / 2;
    const by = e.y + e.h;
    const dir = e.vx > 0 ? 1 : -1;
    ctx.save();
    ctx.translate(cx, by);
    if (e.dead) ctx.scale(1.35, 0.3);
    if (e.knocked) {
      ctx.translate(0, -e.h / 2);
      ctx.rotate(Math.PI + e.t * 4);
      ctx.translate(0, e.h / 2);
    }
    if (e.type === 'alien') {
      const st = Math.sin(e.t * 14);
      ctx.fillStyle = '#1d7a3a';
      ctx.fillRect(-10, -5 - (st > 0 ? 2 : 0), 7, 5);
      ctx.fillRect(3, -5 - (st < 0 ? 2 : 0), 7, 5);
      const g = ctx.createRadialGradient(-4, -18, 2, 0, -13, 16);
      g.addColorStop(0, '#c8ff9a');
      g.addColorStop(1, '#2fbf55');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, -14, 14, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2fbf55';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -24);
      ctx.lineTo(dir * 3, -31);
      ctx.stroke();
      ctx.fillStyle = '#ffef5a';
      ctx.beginPath();
      ctx.arc(dir * 3, -32, 3, 0, Math.PI * 2);
      ctx.fill();
      eye(dir * 2, -15, 6.5, dir);
      ctx.strokeStyle = '#0d4a22';
      ctx.beginPath();
      ctx.arc(dir * 2, -8, 3, 0.2, Math.PI - 0.2);
      ctx.stroke();
    } else if (e.type === 'jumper') {
      const air = !e.onGround;
      ctx.strokeStyle = '#d8b4fe';
      ctx.lineWidth = 2;
      for (const lx of [-6, 6]) {
        ctx.beginPath();
        ctx.moveTo(lx, -8);
        const len = air ? 9 : 5;
        for (let i = 1; i <= 4; i++) ctx.lineTo(lx + (i % 2 ? 3 : -3), -8 + (len * i) / 4);
        ctx.stroke();
      }
      const g = ctx.createRadialGradient(-4, -20, 2, 0, -15, 15);
      g.addColorStop(0, '#f0abfc');
      g.addColorStop(1, '#9333ea');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, -16 - (air ? 4 : 0), 13, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      eye(-5 + dir * 2, -18 - (air ? 4 : 0), 4.5, dir);
      eye(5 + dir * 2, -18 - (air ? 4 : 0), 4.5, dir);
    } else if (e.type === 'spiky') {
      ctx.save();
      ctx.translate(0, -13);
      ctx.rotate(e.x * 0.05);
      ctx.fillStyle = '#ffd0a0';
      for (let i = 0; i < 8; i++) {
        ctx.rotate(Math.PI / 4);
        ctx.beginPath();
        ctx.moveTo(-4, -10);
        ctx.lineTo(0, -19);
        ctx.lineTo(4, -10);
        ctx.fill();
      }
      const g = ctx.createRadialGradient(-3, -3, 1, 0, 0, 13);
      g.addColorStop(0, '#ffb070');
      g.addColorStop(1, '#b91c1c');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      eye(-4 + dir * 2, -14, 3.5, dir);
      eye(4 + dir * 2, -14, 3.5, dir);
      ctx.strokeStyle = '#3b0000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8 + dir * 2, -20);
      ctx.lineTo(-2 + dir * 2, -17);
      ctx.moveTo(8 + dir * 2, -20);
      ctx.lineTo(2 + dir * 2, -17);
      ctx.stroke();
    } else if (e.type === 'ufo') {
      ctx.translate(0, -10);
      const beam = ctx.createLinearGradient(0, 4, 0, 60);
      beam.addColorStop(0, 'rgba(160,255,200,0.3)');
      beam.addColorStop(1, 'rgba(160,255,200,0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(-8, 4);
      ctx.lineTo(8, 4);
      ctx.lineTo(20, 60);
      ctx.lineTo(-20, 60);
      ctx.fill();
      ctx.fillStyle = 'rgba(150,230,255,0.55)';
      ctx.beginPath();
      ctx.ellipse(0, -5, 11, 10, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5ee37f';
      ctx.beginPath();
      ctx.arc(0, -6, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.fillRect(-3, -8, 2, 2);
      ctx.fillRect(1, -8, 2, 2);
      const g = ctx.createLinearGradient(0, -6, 0, 7);
      g.addColorStop(0, '#e5e7f5');
      g.addColorStop(1, '#5b6283');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, 20, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = NEON[(i + Math.floor(clock * 8)) % NEON.length];
        ctx.beginPath();
        ctx.arc(-14 + i * 7, 1, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawPlayer() {
    const p = player;
    if (!p || p.scale <= 0.01) return;
    if (p.invul > 0 && !p.dead && Math.floor(clock * 20) % 2 === 0) return;
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h + 3 - DH / 2;
    ctx.save();
    ctx.translate(cx, cy);
    const spinning = p.dead || state === 'clear';
    ctx.rotate(spinning ? p.spin : clamp(p.vx / RUN, -1, 1) * 0.12);
    const sq = p.squash;
    ctx.scale(p.face * (1 + sq * 0.6) * p.scale, (1 - sq * 0.6) * p.scale);
    if (hero.complete && hero.naturalWidth) {
      ctx.drawImage(hero, -DW / 2, -DH / 2, DW, DH);
    } else {
      ctx.fillStyle = '#ff9f43';
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawParticles() {
    for (const p of parts) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      if (p.text) {
        ctx.fillStyle = p.color;
        ctx.font = '10px ' + FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.text, p.x, p.y);
      } else if (p.star) {
        ctx.fillStyle = '#ffd23f';
        ctx.strokeStyle = '#fff3b0';
        drawStar(p.x, p.y, 10, Math.abs(Math.cos(clock * 12)) + 0.1);
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawHUD() {
    const L = level.def;
    ctx.fillStyle = 'rgba(5,3,20,0.6)';
    ctx.fillRect(0, 0, W, 50);
    ctx.fillStyle = L.pal.accent;
    ctx.fillRect(0, 50, W, 2);
    ctx.textBaseline = 'middle';

    ctx.textAlign = 'left';
    ctx.fillStyle = L.pal.accent;
    ctx.font = '12px ' + FONT;
    ctx.fillText('FASE ' + (levelIdx + 1), 16, 18);
    ctx.fillStyle = '#cfc3f5';
    ctx.font = '8px ' + FONT;
    ctx.fillText(plain(L.name + ' · ' + DIFFS[diffKey].label), 16, 36);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px ' + FONT;
    ctx.fillText(fmtTime(state === 'clear' || state === 'results' ? finalTime : levelTime), W / 2, 20);
    ctx.font = '8px ' + FONT;
    ctx.fillStyle = '#ffd23f';
    const best = save.best[diffKey + ':' + levelIdx];
    const extra = mode === 'run' ? '   TOTAL ' + fmtTime(runTime + (state === 'clear' || state === 'results' ? finalTime : levelTime)) : '';
    ctx.fillText('RECORDE ' + fmtTime(best) + extra, W / 2, 40);

    ctx.textAlign = 'right';
    ctx.font = '12px ' + FONT;
    ctx.fillStyle = '#ffd23f';
    ctx.fillText('x' + String(collected.size + (level.bonus || 0)).padStart(2, '0'), W - 16, 18);
    ctx.strokeStyle = '#fff3b0';
    ctx.lineWidth = 1;
    drawStar(W - 70, 17, 8, 1);
    const lw = 30;
    const lh = Math.round((lw * 181) / 320);
    const shown = Math.min(lives, 5);
    for (let i = 0; i < shown; i++) {
      if (hero.complete && hero.naturalWidth) ctx.drawImage(hero, W - 16 - lw * (i + 1) - i * 2, 30, lw, lh);
    }
  }

  function render() {
    const inGame = level && state !== 'menu';
    const L = inGame ? level.def : LEVELS[Math.floor(clock / 10) % LEVELS.length];
    drawSky(L, inGame ? camX : menuCam);
    if (!inGame) return;
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    ctx.translate(-Math.round(camX), 0);
    drawTiles();
    drawGoal();
    drawCheckpoint();
    drawCoins();
    drawMovers();
    for (const e of enemies) {
      if (!e.gone && e.x > camX - 80 && e.x < camX + W + 80) drawEnemy(e);
    }
    drawPlayer();
    drawParticles();
    ctx.restore();
    drawHUD();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (state === 'countdown') {
      const n = Math.max(1, Math.ceil(countdown / 0.4));
      const f = (countdown % 0.4) / 0.4;
      ctx.font = Math.round(48 + f * 30) + 'px ' + FONT;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = level.def.pal.accent2;
      ctx.shadowBlur = 20;
      ctx.fillText(String(n), W / 2, H / 2 - 20);
      ctx.shadowBlur = 0;
    } else if (goFlash > 0) {
      ctx.globalAlpha = Math.min(1, goFlash * 2);
      ctx.font = '56px ' + FONT;
      ctx.fillStyle = '#ffd23f';
      ctx.shadowColor = '#ff4fd8';
      ctx.shadowBlur = 24;
      ctx.fillText('VAI!', W / 2, H / 2 - 20);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  // ---------- Loop ----------
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    acc += Math.min(0.1, (now - last) / 1000);
    last = now;
    while (acc >= STEP) {
      update(STEP);
      acc -= STEP;
    }
    render();
    requestAnimationFrame(frame);
  }

  // ---------- Interface (menus) ----------
  const ui = document.getElementById('ui');
  const touchEl = document.getElementById('touch');
  const pauseBtn = document.getElementById('pauseBtn');
  const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  const BACK = { diff: 'title', levels: 'diff', howto: 'title' };
  let screen = 'title';

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function show(name) {
    screen = name;
    document.querySelectorAll('.screen').forEach((s) => { s.hidden = s.dataset.screen !== name; });
    ui.hidden = false;
    ui.classList.toggle('dim', state !== 'menu');
    touchEl.classList.remove('on');
    pauseBtn.classList.remove('on');
    const first = document.querySelector('.screen:not([hidden]) button:not([disabled])');
    if (first) first.focus({ preventScroll: true });
  }
  function hideUI() {
    ui.hidden = true;
    screen = '';
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    touchEl.classList.toggle('on', isTouch);
    pauseBtn.classList.toggle('on', isTouch);
  }
  const uiVisible = () => !ui.hidden;

  function refreshTitle() {
    const parts2 = DIFF_KEYS.filter((k) => save.runBest[k] !== undefined).map((k) => DIFFS[k].label + ' ' + fmtTime(save.runBest[k]));
    document.getElementById('titleBest').textContent = parts2.length ? 'Recordes do speedrun completo — ' + parts2.join(' · ') : 'Pule na cabeça dos aliens e chegue ao portal o mais rápido possível!';
    document.getElementById('soundBtn').textContent = 'Som: ' + (muted ? 'desligado' : 'ligado');
  }
  function goMenu() {
    state = 'menu';
    level = null;
    refreshTitle();
    show('title');
  }
  function buildLevelGrid() {
    const grid = document.getElementById('levelGrid');
    grid.replaceChildren();
    LEVELS.forEach((L, i) => {
      const b = el('button', 'card');
      b.dataset.action = 'level';
      b.dataset.level = String(i);
      const locked = i >= save.unlocked;
      b.disabled = locked;
      const best = save.best[diffKey + ':' + i];
      const medal = best !== undefined ? medalFor(i, best) : null;
      b.append(
        el('span', 'num', locked ? '🔒' : String(i + 1)),
        el('span', 'name', L.name),
        el('span', 'stars', '★'.repeat(i + 1)),
        el('span', 'best', best !== undefined ? fmtTime(best) + (medal ? ' ' + medal.icon : '') : 'ouro ' + fmtTime(L.par)),
      );
      grid.append(b);
    });
    document.getElementById('levelsDiff').textContent = DIFFS[diffKey].label;
  }
  function stat(container, label, value, rec) {
    container.append(el('span', '', label), el('span', 'v' + (rec ? ' rec' : ''), value));
  }
  function showResults() {
    const key = diffKey + ':' + levelIdx;
    const prevBest = save.best[key];
    const rec = prevBest === undefined || finalTime < prevBest;
    if (rec) save.best[key] = finalTime;
    save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, levelIdx + 2));
    if (mode === 'run') {
      splits.push(finalTime);
      runTime += finalTime;
    }
    const last = levelIdx === LEVELS.length - 1;
    if (mode === 'run' && last) {
      persist();
      showRunEnd();
      return;
    }
    persist();
    const medal = medalFor(levelIdx, finalTime);
    document.getElementById('resTitle').textContent = 'Fase ' + (levelIdx + 1) + ' concluída!';
    document.getElementById('resTime').textContent = fmtTime(finalTime) + (medal ? ' ' + medal.icon : '');
    const st = document.getElementById('resStats');
    st.replaceChildren();
    stat(st, 'Recorde', rec ? fmtTime(finalTime) + ' NOVO!' : fmtTime(prevBest), rec);
    stat(st, 'Medalha', medal ? medal.name : '—');
    stat(st, 'Ouro / Prata / Bronze', fmtTime(level.def.par) + ' / ' + fmtTime(level.def.par * 1.35) + ' / ' + fmtTime(level.def.par * 1.8));
    stat(st, 'Estrelas', String(collected.size + (level.bonus || 0)));
    stat(st, 'Inimigos derrotados', String(stomps));
    if (mode === 'run') stat(st, 'Tempo total', fmtTime(runTime));
    const next = document.getElementById('resNext');
    next.hidden = last;
    document.getElementById('resRetry').textContent = mode === 'run' ? 'Reiniciar run' : 'Tentar de novo';
    show('results');
  }
  function showRunEnd() {
    const prev = save.runBest[diffKey];
    const rec = prev === undefined || runTime < prev;
    if (rec) save.runBest[diffKey] = runTime;
    persist();
    document.getElementById('runTotal').textContent = fmtTime(runTime);
    const st = document.getElementById('runStats');
    st.replaceChildren();
    stat(st, 'Dificuldade', DIFFS[diffKey].label);
    stat(st, 'Recorde', rec ? fmtTime(runTime) + ' NOVO!' : fmtTime(prev), rec);
    splits.forEach((t, i) => {
      const m = medalFor(i, t);
      stat(st, 'Fase ' + (i + 1) + ' · ' + LEVELS[i].name, fmtTime(t) + (m ? ' ' + m.icon : ''));
    });
    show('runend');
  }
  function showOver() {
    document.getElementById('overText').textContent = mode === 'run'
      ? 'Você chegou até a fase ' + (levelIdx + 1) + '. O speedrun recomeça da fase 1.'
      : 'Suas vidas acabaram na fase ' + (levelIdx + 1) + '.';
    show('over');
  }
  function pause() {
    if (state !== 'play' && state !== 'countdown' && state !== 'dying') return;
    prevState = state;
    state = 'paused';
    clearInput();
    show('pause');
  }
  function resume() {
    if (state !== 'paused') return;
    state = prevState;
    hideUI();
    clearInput();
  }
  function toggleMute() {
    muted = !muted;
    save.muted = muted;
    persist();
    refreshTitle();
  }

  ui.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-action]');
    if (!b || b.disabled) return;
    ensureAudio();
    sfx.click();
    switch (b.dataset.action) {
      case 'single': mode = 'single'; show('diff'); break;
      case 'run': mode = 'run'; show('diff'); break;
      case 'howto': show('howto'); break;
      case 'sound': toggleMute(); break;
      case 'diff':
        diffKey = b.dataset.diff;
        if (mode === 'run') startRun();
        else { buildLevelGrid(); show('levels'); }
        break;
      case 'level': startSingle(Number(b.dataset.level)); break;
      case 'back': show(BACK[screen] || 'title'); break;
      case 'resume': resume(); break;
      case 'restart': retry(); break;
      case 'retry': retry(); break;
      case 'next': nextLevel(); break;
      case 'menu': goMenu(); break;
      default: break;
    }
  });

  // ---------- Teclado ----------
  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', KeyZ: 'jump', KeyK: 'jump',
    ShiftLeft: 'run', ShiftRight: 'run', KeyX: 'run', KeyJ: 'run',
  };
  function pressJump() {
    if (state === 'play' && player) player.jumpBuf = 0.12;
  }
  function menuKey(e) {
    if (e.code === 'KeyM') { toggleMute(); return; }
    const btns = [...document.querySelectorAll('.screen:not([hidden]) button:not([disabled]):not([hidden])')];
    if (!btns.length) return;
    const i = btns.indexOf(document.activeElement);
    if (['ArrowDown', 'ArrowRight', 'KeyS', 'KeyD'].includes(e.code)) {
      e.preventDefault();
      btns[(i + 1) % btns.length].focus();
    } else if (['ArrowUp', 'ArrowLeft', 'KeyW', 'KeyA'].includes(e.code)) {
      e.preventDefault();
      btns[(i - 1 + btns.length) % btns.length].focus();
    } else if (e.code === 'Escape' || e.code === 'KeyP') {
      e.preventDefault();
      if (screen === 'pause') resume();
      else {
        const back = document.querySelector('.screen:not([hidden]) [data-action="back"]');
        if (back) back.click();
      }
    } else if (e.code === 'KeyR' && (screen === 'pause' || screen === 'results' || screen === 'over' || screen === 'runend')) {
      retry();
    }
  }
  window.addEventListener('keydown', (e) => {
    ensureAudio();
    if (uiVisible()) { menuKey(e); return; }
    const a = KEYMAP[e.code];
    if (a) {
      e.preventDefault();
      if (a === 'jump' && !input.jump && !e.repeat) pressJump();
      input[a] = true;
      return;
    }
    if (e.code === 'Escape' || e.code === 'KeyP') pause();
    else if (e.code === 'KeyR') retry();
    else if (e.code === 'KeyM') toggleMute();
  });
  window.addEventListener('keyup', (e) => {
    const a = KEYMAP[e.code];
    if (a) input[a] = false;
  });
  window.addEventListener('blur', () => { if (!uiVisible()) pause(); });

  // ---------- Toque ----------
  touchEl.querySelectorAll('button[data-k]').forEach((b) => {
    const k = b.dataset.k;
    const down = (e) => {
      e.preventDefault();
      ensureAudio();
      if (k === 'jump' && !input.jump) pressJump();
      input[k] = true;
      b.classList.add('act');
    };
    const up = (e) => {
      e.preventDefault();
      input[k] = false;
      b.classList.remove('act');
    };
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('pointerleave', up);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  });
  pauseBtn.addEventListener('click', pause);

  refreshTitle();
  show('title');
  requestAnimationFrame(frame);

  // Exposto só para testes automatizados.
  window.__saturnRush = { buildLevel, LEVELS, DIFFS, get state() { return state; }, get player() { return player; }, get level() { return level; }, get enemies() { return enemies; } };
})();
