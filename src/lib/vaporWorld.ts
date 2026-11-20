// O mundo além da borda do tabuleiro (Vaporwave), desenhado em canvas no estilo das
// referências: céu pastel de azul a rosa, sol listrado, montanha low-poly com malha branca,
// um rio de luz descendo a montanha até um lago espelhado, grade neon ondulando na água,
// palmeira, golfinhos de vidro holográfico saltando e brilhos piscando na superfície.
//
// Duas vistas: "frente" (o lago) e "lado" (O Pensador sentado com você na borda do
// tabuleiro). Antes disso, a caminhada: você atravessa o tabuleiro até a borda e senta.

type C = CanvasRenderingContext2D;

const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export type WorldState = {
  look: number; // 0 = frente (lago), 1 = lado (Pensador)
  walk: number; // 0..1 caminhada até a borda (1 = sentado)
  talk: number; // 0..1 o quanto ele está falando agora (anima a onda e o brilho)
  zoom?: number; // 0..1 modo contemplativo: a câmera chega mais perto do lago
};

// onde a janela do Pensador ficou no papel de parede (pra área clicável acompanhar)
export const thinkerBox = { x: 0, y: 0, w: 0, h: 0 };
// a cena da conversa avisa quando abre, pro papel de parede de baixo parar de desenhar
let paused = false;
export function pauseWallpaper(v: boolean) {
  paused = v;
}

function img(src: string) {
  const i = new Image();
  i.src = src;
  return i;
}

// mode "talk": a cena na borda do tabuleiro; "wallpaper": o papel de parede da área de trabalho
// (o lago ao fundo, o tabuleiro na frente, a janela do Paint com O Pensador e as mãos)
export function createVaporWorld(canvas: HTMLCanvasElement, get: () => WorldState, mode: "talk" | "wallpaper" = "talk") {
  const c = canvas.getContext("2d")!;
  const dolphin = img("/assets/fx/golfinho.png");
  const statue = img("/assets/fx/pensador.png");
  const win = img("/assets/fx/janela-pensador.png");
  const handTop = img("/assets/fx/mao-cima.png");
  const handBot = img("/assets/fx/mao-baixo.png");
  const ok = (i: HTMLImageElement) => i.complete && i.naturalWidth > 0;
  let glow: HTMLCanvasElement | null = null;
  function glowOf(src: HTMLImageElement) {
    if (glow) return glow;
    const pad = 0.08;
    const w = Math.round(src.naturalWidth * (1 + pad * 2));
    const h = Math.round(src.naturalHeight * (1 + pad * 2));
    glow = document.createElement("canvas");
    glow.width = w;
    glow.height = h;
    const g = glow.getContext("2d")!;
    g.filter = "blur(14px)";
    g.drawImage(src, src.naturalWidth * pad, src.naturalHeight * pad);
    g.filter = "none";
    g.globalCompositeOperation = "source-in";
    g.fillStyle = "rgb(255,190,240)";
    g.fillRect(0, 0, w, h);
    return glow;
  }
  let W = 0;
  let H = 0;
  const up = document.createElement("canvas"); // céu+sol+montanha, pra refletir na água
  const uc = up.getContext("2d")!;
  const sun = document.createElement("canvas");
  const sc = sun.getContext("2d")!;
  let raf = 0;
  let last = performance.now();
  let lastDraw = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, mode === "wallpaper" ? 1 : 1.25);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    up.width = W;
    up.height = H;
  }

  /* ---------- céu ---------- */
  function sky(g: C, hz: number, t: number, shift = 0) {
    const s = g.createLinearGradient(0, 0, 0, hz);
    s.addColorStop(0, "#6fb2d6");
    s.addColorStop(0.42, "#b4c3e6");
    s.addColorStop(0.78, "#f1c7e8");
    s.addColorStop(1, "#ff9bdc");
    g.fillStyle = s;
    g.fillRect(0, 0, W, hz + 1);
    // nuvens pastel compridas, andando devagar
    for (let i = 0; i < 7; i++) {
      const y = hz * (0.12 + hash(i) * 0.55);
      const w = W * (0.18 + hash(i + 3) * 0.22);
      const x = ((((hash(i + 5) * W * 1.6 + t * (6 + hash(i + 7) * 10) + shift) % (W * 1.6)) + W * 1.6) % (W * 1.6)) - W * 0.3;
      const cg = g.createRadialGradient(x, y, 0, x, y, w * 0.5);
      const col = hash(i + 9) < 0.6 ? "255,190,235" : "190,255,225";
      cg.addColorStop(0, `rgba(${col},0.55)`);
      cg.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = cg;
      g.save();
      g.translate(x, y);
      g.scale(1, 0.18);
      g.translate(-x, -y);
      g.beginPath();
      g.arc(x, y, w * 0.5, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }

  /* ---------- sol listrado ---------- */
  function drawSun(g: C, cx: number, cy: number, R: number) {
    const halo = g.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 2.2);
    halo.addColorStop(0, "rgba(255,240,200,0.55)");
    halo.addColorStop(1, "rgba(255,180,230,0)");
    g.fillStyle = halo;
    g.fillRect(cx - R * 2.2, cy - R * 2.2, R * 4.4, R * 4.4);
    const d = Math.ceil(R * 2) + 2;
    sun.width = d;
    sun.height = d;
    const b = sc.createLinearGradient(0, 0, 0, d);
    b.addColorStop(0, "#fff8b8");
    b.addColorStop(0.55, "#ffd2a0");
    b.addColorStop(1, "#ff7ccc");
    sc.fillStyle = b;
    sc.beginPath();
    sc.arc(d / 2, d / 2, R, 0, Math.PI * 2);
    sc.fill();
    // faixas abertas, cada vez mais grossas embaixo
    for (let k = 0; k < 8; k++) {
      const y = d * (0.48 + k * 0.068);
      sc.clearRect(0, y, d, 1.5 + k * 1.3);
    }
    g.drawImage(sun, cx - d / 2, cy - d / 2);
  }

  /* ---------- montanha low-poly com malha branca ---------- */
  function mountain(g: C, hz: number, x0: number, x1: number, peak: number) {
    const cols = 16;
    const rows = 7;
    const P = (i: number, j: number) => {
      const u = i / cols;
      const ridge = Math.pow(Math.sin(Math.PI * u), 1.4) * (0.75 + 0.25 * Math.sin(u * 17)) * peak;
      const v = j / rows; // 0 = base, 1 = crista
      const jitter = (hash(i * 31 + j * 7) - 0.5) * (x1 - x0) * 0.012 * (j > 0 && j < rows ? 1 : 0);
      return [x0 + u * (x1 - x0) + jitter, hz - ridge * v] as const;
    };
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const a = P(i, j);
        const b = P(i + 1, j);
        const cc = P(i + 1, j + 1);
        const d = P(i, j + 1);
        for (const tri of [[a, b, cc], [a, cc, d]] as const) {
          g.beginPath();
          g.moveTo(tri[0][0], tri[0][1]);
          g.lineTo(tri[1][0], tri[1][1]);
          g.lineTo(tri[2][0], tri[2][1]);
          g.closePath();
          const sh = hash(i * 13 + j * 5 + (tri[0] === a && tri[1] === b ? 1 : 2));
          const l = 22 + sh * 18 + (j / rows) * 14;
          g.fillStyle = `hsl(${290 + sh * 18}, ${30 + sh * 12}%, ${l}%)`;
          g.fill();
          g.strokeStyle = "rgba(255,245,255,0.75)";
          g.lineWidth = 1;
          g.stroke();
        }
      }
  }

  /* ---------- palmeira low-poly (o mesmo modelo da montanha: triângulos azul-claros com malha branca) ---------- */
  function tri(g: C, p: (readonly [number, number])[], shade: number, seed: number) {
    g.beginPath();
    g.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]);
    g.closePath();
    const sh = hash(seed);
    // azul claro, com as faces de luz e de sombra (mesma malha branca da montanha)
    g.fillStyle = `hsl(${186 + sh * 14}, ${55 + sh * 15}%, ${shade + 30 + sh * 8}%)`;
    g.fill();
    g.stroke();
  }
  function palm(g: C, bx: number, by: number, h: number, t: number) {
    const sway = Math.sin(t * 0.7) * h * 0.012;
    const top: [number, number] = [bx + h * 0.06 + sway, by - h];
    const at = (u: number): [number, number] => [bx + (top[0] - bx) * Math.pow(u, 1.8), by - h * u];
    const wid = (u: number) => h * (0.04 - u * 0.018);
    g.save();
    g.strokeStyle = "rgba(255,245,255,0.75)";
    g.lineWidth = Math.max(0.6, h * 0.004);
    g.lineJoin = "round";
    // tronco: prisma em gomos, com a face da esquerda clara e a da direita escura (luz do sol)
    const segs = 9;
    for (let i = 0; i < segs; i++) {
      const u0 = i / segs;
      const u1 = (i + 1) / segs;
      const [x0, y0] = at(u0);
      const [x1, y1] = at(u1);
      const w0 = wid(u0);
      const w1 = wid(u1);
      const bulge = h * 0.004; // anel mais largo na emenda de cada gomo
      const L0: [number, number] = [x0 - w0 - bulge, y0];
      const M0: [number, number] = [x0 + w0 * 0.15, y0 + w0 * 0.25];
      const R0: [number, number] = [x0 + w0 + bulge, y0];
      const L1: [number, number] = [x1 - w1, y1];
      const M1: [number, number] = [x1 + w1 * 0.15, y1 + w1 * 0.25];
      const R1: [number, number] = [x1 + w1, y1];
      tri(g, [L0, M0, M1, L1], 40, i * 3 + 1);
      tri(g, [M0, R0, R1, M1], 24, i * 3 + 2);
    }
    // folhas: cada uma é uma tira de triângulos que sai pra cima e cai em arco, afinando na ponta;
    // o lado de cima pega luz, o de baixo fica escuro (como as faces da montanha)
    const fronds = 9;
    const order = Array.from({ length: fronds }, (_, k) => k).sort((a, b) => hash(a + 40) - hash(b + 40));
    for (const k of order) {
      const side = k % 2 ? 1 : -1;
      const spread = 0.25 + (Math.floor(k / 2) / (fronds / 2)) * 1.35;
      const L = h * (0.42 + hash(k + 3) * 0.12);
      const droop = 1.3 + hash(k + 9) * 0.4 + Math.sin(t * 0.9 + k) * 0.03;
      const n = 6;
      const spine: [number, number][] = [[0, 0]];
      let th = -Math.PI / 2 + spread;
      for (let s = 1; s <= n; s++) {
        th += droop / n;
        const [px, py] = spine[s - 1];
        spine.push([px + Math.cos(th) * (L / n), py + Math.sin(th) * (L / n)]);
      }
      const P = (x: number, y: number) => [top[0] + side * x, top[1] + y] as const;
      for (let s = 0; s < n; s++) {
        const [ax, ay] = spine[s];
        const [bx2, by2] = spine[s + 1];
        const ww = (u: number) => L * 0.12 * Math.sin(Math.PI * Math.min(1, 0.15 + u * 0.95));
        const wa = ww(s / n);
        const wb = ww((s + 1) / n);
        // normal da nervura
        const dx = bx2 - ax;
        const dy = by2 - ay;
        const l = Math.hypot(dx, dy) || 1;
        const nx = -dy / l;
        const ny = dx / l;
        const upA = P(ax + nx * wa, ay + ny * wa - wa * 0.4);
        const upB = P(bx2 + nx * wb, by2 + ny * wb - wb * 0.4);
        const dnA = P(ax - nx * wa, ay - ny * wa + wa * 0.5);
        const dnB = P(bx2 - nx * wb, by2 - ny * wb + wb * 0.5);
        const cA = P(ax, ay);
        const cB = P(bx2, by2);
        tri(g, [cA, upA, upB], 50, k * 31 + s * 2);
        tri(g, [cA, upB, cB], 44, k * 31 + s * 2 + 1);
        tri(g, [cA, cB, dnB], 28, k * 37 + s * 2);
        tri(g, [cA, dnB, dnA], 22, k * 37 + s * 2 + 1);
      }
    }
    // cocos: pirâmides pequenas
    for (let k = 0; k < 3; k++) {
      const cx = top[0] + (k - 1) * h * 0.022;
      const cy = top[1] + h * 0.03 + (k % 2) * h * 0.012;
      const r = h * 0.016;
      tri(g, [[cx - r, cy], [cx, cy - r], [cx, cy + r]], 30, 90 + k);
      tri(g, [[cx, cy - r], [cx + r, cy], [cx, cy + r]], 20, 95 + k);
    }
    g.restore();
  }

  /* ---------- golfinhos ---------- */
  const DOL = [
    { x0: 0.5, x1: 0.78, top: 0.26, per: 7.5, ph: 0, s: 1 },
    { x0: 0.86, x1: 0.66, top: 0.18, per: 9.2, ph: 3.1, s: 0.75 },
    { x0: 0.18, x1: 0.34, top: 0.14, per: 11, ph: 6, s: 0.6 },
  ];
  function dolphins(g: C, hz: number, t: number, reflect: boolean) {
    if (!dolphin.complete || !dolphin.naturalWidth) return;
    for (const d of DOL) {
      const u = ((t + d.ph) % d.per) / d.per;
      const jumpU = u / 0.38; // salta durante 38% do ciclo
      const wy = hz + H * 0.06 * d.s;
      if (jumpU > 1.25) continue;
      const k = Math.min(1, jumpU);
      const x = W * (d.x0 + (d.x1 - d.x0) * k);
      const y = wy - Math.sin(Math.PI * k) * H * d.top;
      const dx = (d.x1 - d.x0) * W;
      const dy = -Math.cos(Math.PI * k) * Math.PI * H * d.top;
      let ang = Math.atan2(dy, Math.abs(dx));
      const flip = d.x1 < d.x0;
      const w = W * 0.11 * d.s;
      const h = w * 0.75;
      if (jumpU <= 1) {
        g.save();
        if (reflect) {
          g.translate(x, wy + (wy - y));
          g.scale(1, -1);
          g.globalAlpha = 0.25;
        } else g.translate(x, y);
        if (flip) g.scale(-1, 1);
        g.rotate(ang * 0.9);
        g.drawImage(dolphin, -w / 2, -h / 2, w, h);
        g.restore();
        void ang;
        ang = 0;
      }
      // splash na saída e na volta
      if (!reflect)
        for (const [sx, su] of [[W * d.x0, jumpU], [W * d.x1, jumpU - 1]] as const) {
          if (su < 0 || su > 0.25) continue;
          const p = su / 0.25;
          g.strokeStyle = `rgba(255,255,255,${0.8 * (1 - p)})`;
          g.lineWidth = 2;
          g.beginPath();
          g.ellipse(sx, wy, w * 0.2 + p * w * 0.5, 3 + p * 8, 0, 0, Math.PI * 2);
          g.stroke();
          for (let q = 0; q < 6; q++) {
            const a = Math.PI * (0.15 + q * 0.14);
            g.fillStyle = `rgba(230,255,255,${1 - p})`;
            g.fillRect(sx + Math.cos(a) * p * w * 0.5, wy - Math.sin(a) * p * h * 0.8 + p * p * h * 0.6, 3, 3);
          }
        }
    }
  }

  /* ---------- vista da frente: o lago ---------- */
  // palmeiras pequenas lá no fundo, em ilhotas: x, quanto abaixo do horizonte (mais perto = mais baixo) e altura
  type Palm = [number, number, number];
  type Layout = { sunX: number; mx0: number; mx1: number; peak: number; palms: Palm[] };
  const TALK_LAYOUT: Layout = { sunX: 0.6, mx0: 0.2, mx1: 0.68, peak: 0.3, palms: [[0.06, 0.03, 0.17], [0.1, 0.018, 0.12], [0.135, 0.01, 0.085], [0.82, 0.012, 0.09], [0.86, 0.007, 0.065], [0.89, 0.004, 0.045]] };
  const WALL_LAYOUT: Layout = { sunX: 0.78, mx0: 0.04, mx1: 0.42, peak: 0.24, palms: [[0.66, 0.025, 0.15], [0.7, 0.014, 0.1], [0.725, 0.008, 0.07], [0.94, 0.012, 0.09], [0.965, 0.006, 0.06]] };
  function front(t: number, hz: number, L: Layout = TALK_LAYOUT, ownSky = true) {
    const mx0 = W * L.mx0;
    const mx1 = W * L.mx1;
    const peak = H * L.peak;
    // camada de cima (vai pro reflexo também)
    uc.clearRect(0, 0, W, H);
    if (ownSky) sky(uc, hz, t);
    drawSun(uc, W * L.sunX, hz - H * 0.13, H * 0.19);
    mountain(uc, hz, mx0, mx1, peak);
    c.drawImage(up, 0, 0);
    // água
    const wg = c.createLinearGradient(0, hz, 0, H);
    wg.addColorStop(0, "#ffa8e2");
    wg.addColorStop(0.08, "#e3c9f2");
    wg.addColorStop(0.5, "#c8b6ee");
    wg.addColorStop(1, "#a993e4");
    c.fillStyle = wg;
    c.fillRect(0, hz, W, H - hz);
    // reflexo ondulado (fatias com deslocamento senoidal)
    c.save();
    c.globalAlpha = 0.42;
    const rows = Math.ceil((H - hz) / 6);
    for (let r = 0; r < rows; r++) {
      const y = hz + r * 6;
      const srcY = hz - (y - hz) * 1.0;
      if (srcY < 0) break;
      const off = Math.sin(r * 0.7 + t * 2) * (1 + r * 0.06);
      c.drawImage(up, 0, srcY - 6, W, 6, off, y, W, 6);
    }
    c.restore();
    // faixa de luz do sol e do rio na água
    const sg = c.createLinearGradient(0, hz, 0, H);
    sg.addColorStop(0, "rgba(255,240,200,0.55)");
    sg.addColorStop(1, "rgba(255,240,200,0)");
    c.fillStyle = sg;
    for (let k = 0; k < 14; k++) {
      const y = hz + Math.pow(k / 14, 1.6) * (H - hz);
      const w = W * (0.05 + (k / 14) * 0.12) * (0.8 + 0.2 * Math.sin(t * 3 + k));
      c.fillRect(W * L.sunX - w / 2, y, w, 2 + k * 0.5);
    }
    // linha do horizonte rosa neon
    const hl = c.createLinearGradient(0, hz - 4, 0, hz + 4);
    hl.addColorStop(0, "rgba(255,80,220,0)");
    hl.addColorStop(0.5, "rgba(255,80,220,0.95)");
    hl.addColorStop(1, "rgba(255,80,220,0)");
    c.fillStyle = hl;
    c.fillRect(0, hz - 4, W, 8);
    // grade neon ondulando sobre a água
    c.save();
    c.strokeStyle = "rgba(110,245,255,0.95)";
    c.lineWidth = 1.6;
    const vp = W * L.sunX;
    for (let i = -14; i <= 14; i++) {
      c.beginPath();
      for (let s = 0; s <= 24; s++) {
        const v = s / 24;
        const y = hz + 6 + v * v * (H - hz);
        const x = vp + i * W * 0.05 * (0.06 + v * 1.6) + Math.sin(v * 6 + t * 1.2 + i * 0.3) * W * 0.012 * v;
        if (s) c.lineTo(x, y);
        else c.moveTo(x, y);
      }
      c.globalAlpha = 0.25 + 0.5 * (1 - Math.abs(i) / 14);
      c.stroke();
    }
    c.globalAlpha = 1;
    const sp = (t * 0.25) % 1;
    for (let j = 0; j < 12; j++) {
      const v = Math.pow((j + sp) / 12, 2);
      const y = hz + 6 + v * (H - hz);
      c.globalAlpha = Math.min(1, v * 4) * 0.7;
      c.beginPath();
      for (let s = 0; s <= 30; s++) {
        const x = (s / 30) * W;
        const yy = y + Math.sin(s * 0.5 + t * 1.5 + j) * (2 + v * 8);
        if (s) c.lineTo(x, yy);
        else c.moveTo(x, yy);
      }
      c.stroke();
    }
    c.restore();
    // palmeira na água (com reflexo)
    // ilhotas com palmeiras de linhas, em perspectiva (as mais distantes menores e mais altas)
    for (const [px, dy, ph] of L.palms) {
      const x = W * px;
      const by = hz + H * dy;
      const h = H * ph;
      // ilhota: um montinho low-poly, igual à montanha só que pequeno
      mountain(c, by, x - h * 0.42, x + h * 0.42, h * 0.16);
      c.save();
      c.translate(0, by * 2);
      c.scale(1, -1);
      c.globalAlpha = 0.28;
      palm(c, x, by, h, t + px * 10);
      c.restore();
      palm(c, x, by, h, t + px * 10);
    }
    // golfinhos e seus reflexos
    dolphins(c, hz, t, true);
    dolphins(c, hz, t, false);
    // brilhos piscando na água
    for (let i = 0; i < 40; i++) {
      const tw = Math.sin(t * (2 + hash(i) * 3) + i * 7);
      if (tw < 0.6) continue;
      const x = hash(i + 11) * W;
      const y = hz + 8 + Math.pow(hash(i + 23), 1.5) * (H - hz) * 0.9;
      const s = (tw - 0.6) * 12 * (0.5 + (y - hz) / (H - hz));
      c.fillStyle = "rgba(255,255,255,0.95)";
      c.fillRect(x - s, y - 0.6, s * 2, 1.2);
      c.fillRect(x - 0.6, y - s, 1.2, s * 2);
    }
  }

  /* ---------- o tabuleiro (chão xadrez rosa com grade ciano, como no papel de parede) ---------- */
  function board(yEdge: number, vp: number, hz: number, scroll: number) {
    if (yEdge >= H) return;
    const g = c.createLinearGradient(0, yEdge, 0, H);
    g.addColorStop(0, "#ff7cc8");
    g.addColorStop(1, "#ff4fae");
    c.fillStyle = g;
    c.fillRect(0, yEdge, W, H - yEdge);
    c.save();
    c.beginPath();
    c.rect(0, yEdge, W, H - yEdge);
    c.clip();
    c.strokeStyle = "rgba(110,235,255,0.85)";
    c.lineWidth = 1.2;
    for (let i = -24; i <= 24; i++) {
      c.beginPath();
      c.moveTo(vp + i * 2, hz);
      c.lineTo(vp + i * W * 0.11, H + H * 0.6);
      c.stroke();
    }
    for (let j = 0; j < 18; j++) {
      const z = (j + 1 - (scroll % 1)) * 0.6;
      const y = hz + (H - hz) * (0.45 / z);
      if (y < yEdge || y > H) continue;
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(W, y);
      c.stroke();
    }
    c.restore();
    // borda acesa
    c.fillStyle = "rgba(255,255,255,0.9)";
    c.fillRect(0, yEdge - 1, W, 2);
    c.fillStyle = "rgba(110,235,255,0.6)";
    c.fillRect(0, yEdge + 1, W, 3);
  }

  /* ---------- vista do lado: O Pensador sentado com você na borda ---------- */
  function side(t: number, hz: number, talk: number, ownSky = true) {
    // o cenário é desenhado espelhado (tabuleiro à esquerda, lago à direita) e O Pensador por cima,
    // virado pra direita, como na foto: assim, quando ele levanta a cabeça, olha pra você
    c.save();
    c.translate(W, 0);
    c.scale(-1, 1);
    if (ownSky) sky(c, hz, t + 40);
    // onda sonora ciano no céu, como no papel de parede: cresce quando ele fala
    c.save();
    c.strokeStyle = "rgba(110,235,255,0.55)";
    for (let l = 0; l < 6; l++) {
      c.beginPath();
      for (let x = 0; x <= W; x += 6) {
        const e = Math.sin((x / W) * Math.PI);
        const a = (0.012 + talk * 0.07) * H * e * (1 - l * 0.12);
        const y = hz * 0.42 + Math.sin(x * 0.045 + t * 6 + l) * a * Math.sin(x * 0.008 + t * 2 + l * 0.6);
        if (x) c.lineTo(x, y);
        else c.moveTo(x, y);
      }
      c.lineWidth = 1;
      c.stroke();
    }
    c.restore();
    // lago à esquerda até o horizonte
    const wg = c.createLinearGradient(0, hz, 0, H);
    wg.addColorStop(0, "#ffa8e2");
    wg.addColorStop(0.08, "#e3c9f2");
    wg.addColorStop(0.5, "#c8b6ee");
    wg.addColorStop(1, "#a993e4");
    c.fillStyle = wg;
    c.fillRect(0, hz, W, H - hz);
    c.fillStyle = "rgba(255,80,220,0.9)";
    c.fillRect(0, hz - 1, W, 2);
    // golfinho distante de vez em quando, à esquerda
    c.save();
    c.translate(-W * 0.35, 0);
    dolphins(c, hz, t * 0.9 + 2, false);
    c.restore();
    // tabuleiro à direita: a borda corre da frente pro ponto de fuga
    const vp = W * 0.42;
    const ex = W * 0.06; // onde a borda sai embaixo da tela
    c.beginPath();
    c.moveTo(vp, hz);
    c.lineTo(W, hz);
    c.lineTo(W, H);
    c.lineTo(ex, H);
    c.closePath();
    const bg = c.createLinearGradient(0, hz, 0, H);
    bg.addColorStop(0, "#ff9ad6");
    bg.addColorStop(1, "#ff4fae");
    c.fillStyle = bg;
    c.fill();
    c.save();
    c.clip();
    c.strokeStyle = "rgba(110,235,255,0.85)";
    c.lineWidth = 1.2;
    // linhas paralelas à borda (vão pro ponto de fuga)
    for (let i = 0; i <= 14; i++) {
      const bx = ex + i * W * 0.14;
      c.beginPath();
      c.moveTo(vp, hz);
      c.lineTo(bx, H);
      c.stroke();
    }
    // linhas atravessando
    for (let j = 1; j < 16; j++) {
      const k = 1 / (j * 0.55);
      const y = hz + (H - hz) * Math.min(1, k * 0.55);
      const xl = vp + (ex - vp) * ((y - hz) / (H - hz));
      c.beginPath();
      c.moveTo(xl, y);
      c.lineTo(W, y);
      c.stroke();
    }
    c.restore();
    // espessura do tabuleiro (a lateral que desce pro lago) e a borda acesa
    c.beginPath();
    c.moveTo(vp, hz);
    c.lineTo(ex, H);
    c.lineTo(ex - W * 0.06, H);
    c.lineTo(vp - 2, hz + 2);
    c.closePath();
    c.fillStyle = "#c2307e";
    c.fill();
    c.save();
    c.strokeStyle = "rgba(255,255,255,0.95)";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(vp, hz);
    c.lineTo(ex, H);
    c.stroke();
    c.restore();
    c.restore();
    // O Pensador sentado no tabuleiro, perto da borda, olhando o lago (parado, como estátua)
    if (ok(statue)) {
      const h = H * 0.62;
      const w = (h * statue.naturalWidth) / statue.naturalHeight;
      const bx = W * 0.44;
      const by = H * 0.93;
      c.save();
      c.fillStyle = "rgba(120,20,80,0.35)";
      c.beginPath();
      c.ellipse(bx - w * 0.2, by, w * 0.6, h * 0.05, 0.06, 0, Math.PI * 2);
      c.fill();
      c.restore();
      // brilho rosa em volta: textura borrada feita uma vez só (sombra borrada a cada quadro pesa)
      const gl = glowOf(statue);
      c.save();
      c.globalAlpha = 0.55 + talk * 0.45;
      c.drawImage(gl, bx - w / 2 - w * 0.08, by - h - h * 0.08, w * 1.16, h * 1.16);
      c.restore();
      c.drawImage(statue, bx - w / 2, by - h, w, h);
    }
  }

  /* ---------- papel de parede: o lago ao fundo e o tabuleiro com a janela do Pensador ---------- */
  function wallpaper(t: number) {
    const hz = H * 0.46;
    front(t, hz, WALL_LAYOUT);
    // onda sonora ciano no céu, como no papel de parede original
    c.save();
    c.strokeStyle = "rgba(110,235,255,0.45)";
    c.lineWidth = 1;
    for (let l = 0; l < 5; l++) {
      c.beginPath();
      for (let x = 0; x <= W; x += 6) {
        const a = H * 0.035 * (1 - l * 0.15) * (0.6 + 0.4 * Math.sin(x * 0.004 + t * 0.6));
        const y = hz * 0.42 + Math.sin(x * 0.04 + t * 2.4 + l) * a * Math.sin(x * 0.011 + l);
        if (x) c.lineTo(x, y);
        else c.moveTo(x, y);
      }
      c.stroke();
    }
    c.restore();
    // o tabuleiro: começa no meio da água e vem até você
    const yEdge = H * 0.6;
    board(yEdge, W * 0.5, hz, 0);
    // a janela do Paint em pé no tabuleiro, com O Pensador dentro
    if (ok(win)) {
      const wh = Math.min(H * 0.66, W * 0.38 * (win.naturalHeight / win.naturalWidth));
      const ww = wh * (win.naturalWidth / win.naturalHeight);
      const wx = W / 2 - ww / 2;
      const wy = H * 0.9 - wh;
      c.fillStyle = "rgba(110,20,80,0.35)";
      c.beginPath();
      c.ellipse(W / 2 + ww * 0.08, H * 0.9, ww * 0.62, wh * 0.05, 0, 0, Math.PI * 2);
      c.fill();
      c.save();
      // sombra da janela: retângulo translúcido deslocado (barato)
      c.fillStyle = "rgba(60,10,70,0.25)";
      c.fillRect(wx + 10, wy + 12, ww, wh);
      // pela "tela" da janela aparece o próprio mundo: o lago e o tabuleiro continuam lá dentro,
      // com O Pensador sentado no tabuleiro
      if (ok(statue)) {
        const sx = (v: number) => wx + (v / 720) * ww;
        const sy = (v: number) => wy + (v / 724) * wh;
        c.save();
        c.beginPath();
        c.rect(sx(152), sy(110), sx(699) - sx(152), sy(699) - sy(110));
        c.clip();
        c.fillStyle = "rgba(110,20,80,0.4)";
        c.beginPath();
        c.ellipse(sx(400), sy(655), (ww * 200) / 720, (wh * 22) / 724, 0, 0, Math.PI * 2);
        c.fill();
        c.drawImage(statue, sx(298), sy(234), (ww * 366) / 720, (wh * 428) / 724);
        c.restore();
      }
      c.drawImage(win, wx, wy, ww, wh);
      c.restore();
      // onde O Pensador está dentro da janela (pra área clicável)
      const r = canvas.getBoundingClientRect();
      thinkerBox.x = r.left + wx + ww * 0.41;
      thinkerBox.y = r.top + wy + wh * 0.32;
      thinkerBox.w = ww * 0.5;
      thinkerBox.h = wh * 0.58;
    }
    // as mãos recortadas nos cantos
    if (ok(handTop)) {
      const hw = Math.min(W * 0.16, H * 0.32);
      const hh = hw * (handTop.naturalHeight / handTop.naturalWidth);
      c.drawImage(handTop, W - hw, Math.sin(t * 0.8) * 4, hw, hh);
    }
    if (ok(handBot)) {
      const hw = Math.min(W * 0.17, H * 0.34);
      const hh = hw * (handBot.naturalHeight / handBot.naturalWidth);
      c.drawImage(handBot, Math.sin(t * 0.7 + 1) * 4, H - hh, hw, hh);
    }
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    void dt;
    const t = now / 1000;
    if (!W || !H || document.hidden) return;
    if (mode === "wallpaper") {
      // escondido atrás da conversa com O Pensador: não desenha nada
      if (paused) return;
      // papel de parede: 30 quadros por segundo bastam (a área de trabalho fica leve)
      if (now - lastDraw < 32) return;
      lastDraw = now;
      c.clearRect(0, 0, W, H);
      wallpaper(now / 1000);
      return;
    }
    // monitores de 120/144 Hz: no máximo ~60 quadros por segundo
    if (now - lastDraw < 15) return;
    lastDraw = now;
    const st = get();
    // caminhando: cabeça mais alta e balançando; sentado: horizonte um pouco mais alto na tela
    const walking = st.walk < 1;
    const hz = H * (0.5 + 0.05 * st.walk) + (walking ? Math.sin(t * 9) * 4 : 0);
    c.clearRect(0, 0, W, H);
    // modo contemplativo: a câmera chega perto do lago, devagar
    const z = st.zoom ?? 0;
    c.save();
    if (z > 0.001) {
      const k = 1 + 0.32 * z * z * (3 - 2 * z);
      c.translate(W * 0.5, hz);
      c.scale(k, k);
      c.translate(-W * 0.5, -hz - H * 0.03 * z);
    }
    // um céu só, contínuo, pras duas direções (as nuvens andam junto com a cabeça)
    const off = st.look * W;
    sky(c, hz, t, off * 0.6);
    // O Pensador fica à esquerda do lago: virar pra ele é girar a cabeça pra esquerda
    if (st.look < 0.999) {
      c.save();
      c.translate(off, 0);
      front(t, hz, TALK_LAYOUT, false);
      // tabuleiro passando por baixo até a borda chegar nos seus pés
      // sentado, a borda fica logo abaixo de você (dá pra ver a beirada do tabuleiro)
      const yEdge = hz + 6 + Math.pow(Math.max(0, st.walk), 2.2) * (H * 0.93 - hz - 6);
      board(yEdge, W * 0.6, hz, t * 1.6 * (walking ? 1 : 0));
      c.restore();
    }
    if (st.look > 0.001) {
      c.save();
      c.translate(off - W, 0);
      side(t, hz, st.talk, false);
      c.restore();
    }
    // costura entre as duas direções: uma névoa suave da cor da água esconde a emenda
    if (st.look > 0.01 && st.look < 0.99) {
      const a = Math.sin(Math.PI * st.look);
      const bw = W * 0.22;
      const g = c.createLinearGradient(off - bw, 0, off + bw, 0);
      g.addColorStop(0, "rgba(214,196,240,0)");
      g.addColorStop(0.5, `rgba(214,196,240,${0.9 * a})`);
      g.addColorStop(1, "rgba(214,196,240,0)");
      c.fillStyle = g;
      c.fillRect(off - bw, hz + 2, bw * 2, H - hz);
      const hg = c.createLinearGradient(off - bw, 0, off + bw, 0);
      hg.addColorStop(0, "rgba(255,80,220,0)");
      hg.addColorStop(0.5, `rgba(255,80,220,${0.9 * a})`);
      hg.addColorStop(1, "rgba(255,80,220,0)");
      c.fillStyle = hg;
      c.fillRect(off - bw, hz - 1, bw * 2, 3);
    }
    c.restore();
  }

  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  raf = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
  };
}
