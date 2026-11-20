// Neo-Tóquio: a cidade que margeia a estrada do Synthwave.
//
// A ideia é uma cidade viva feita de pequenos ciclos independentes: cada janela acende e
// apaga no seu próprio tempo, cada letreiro tem o seu ritmo (alguns falhando), spinners
// cruzam o céu em rotas e períodos diferentes, um trem elevado passa de vez em quando,
// um dirigível arrasta um anúncio devagar, holofotes varrem as nuvens, uma carpa holográfica
// nada num outdoor e uma chuva fina cai por cima de tudo. Neon por todo lado, escondendo
// o peso de uma cidade que nunca dorme.
//
// Tudo é desenhado em canvas 2D; os prédios perto da estrada usam a mesma perspectiva da pista.

import { adFrame, billboard, pedestrians, sidewalk, storefront } from "./cityLife";
export { flushLate } from "./cityLife";

type C = CanvasRenderingContext2D;

// aleatório determinístico a partir de um número (a mesma cidade sempre)
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const fract = (x: number) => x - Math.floor(x);

// palavras dos letreiros (verticais, uma letra embaixo da outra)
const WORDS = ["酒場", "ラーメン", "電脳", "東京", "眠らない", "孤独", "夢", "愛", "未来", "夜", "薬", "ホテル", "カラオケ", "希望", "雨"];
const NEON = ["255,61,240", "95,243,255", "255,170,60", "255,80,110", "160,120,255", "120,255,170"];

type Win = { dx: number; dy: number; rate: number; ph: number; duty: number; warm: boolean };
type Tower = { x: number; w: number; h: number; layer: number; wins: Win[]; sign?: Sign; beacon: number; antenna: boolean };
type Sign = { word: string; color: string; mode: number; rate: number; ph: number; side: number };
type Drop = { x: number; y: number; l: number; v: number };

export type City = {
  towers: Tower[];
  rain: Drop[];
};

export function createCity(): City {
  const towers: Tower[] = [];
  // duas camadas de prédios no horizonte (longe e meio), espalhadas numa faixa um pouco mais larga que a tela
  for (let layer = 0; layer < 2; layer++) {
    let x = -0.25;
    let i = 0;
    while (x < 1.25) {
      const s = layer * 1000 + i;
      const w = (layer ? 0.035 : 0.025) + hash(s) * (layer ? 0.05 : 0.035);
      const h = (layer ? 0.09 : 0.06) + Math.pow(hash(s + 7), 2) * (layer ? 0.22 : 0.15);
      const wins: Win[] = [];
      const cols = Math.max(2, Math.floor(w * 90));
      const rows = Math.max(3, Math.floor(h * 70));
      for (let r = 0; r < rows; r++)
        for (let k = 0; k < cols; k++) {
          const ws = s * 97 + r * 13 + k;
          if (hash(ws) < 0.45) continue;
          // cada janela tem o seu ritmo: umas ficam acesas a noite toda, outras piscam devagar
          wins.push({ dx: (k + 0.5) / cols, dy: (r + 0.6) / rows, rate: 0.005 + hash(ws + 1) * 0.05, ph: hash(ws + 2), duty: 0.35 + hash(ws + 3) * 0.6, warm: hash(ws + 4) < 0.35 });
        }
      const tower: Tower = { x, w, h, layer, wins, beacon: 0.6 + hash(s + 9) * 1.6, antenna: hash(s + 11) < 0.3 };
      if (layer === 1 && hash(s + 5) < 0.42) {
        tower.sign = {
          word: WORDS[Math.floor(hash(s + 6) * WORDS.length)],
          color: NEON[Math.floor(hash(s + 8) * NEON.length)],
          mode: Math.floor(hash(s + 10) * 4), // 0 fixo, 1 pisca, 2 falhando, 3 letra por letra
          rate: 0.4 + hash(s + 12) * 1.8,
          ph: hash(s + 13) * 10,
          side: hash(s + 14) < 0.5 ? -1 : 1,
        };
      }
      towers.push(tower);
      x += w * (0.75 + hash(s + 3) * 0.5);
      i++;
    }
  }
  const rain = Array.from({ length: 160 }, (_, i) => ({ x: hash(i * 3.1), y: hash(i * 5.7), l: 0.02 + hash(i * 1.3) * 0.04, v: 0.7 + hash(i * 2.9) * 0.6 }));
  return { towers, rain };
}

// letreiro aceso? (cada modo é um "humor" diferente de neon)
function signLight(sg: Sign, t: number, idx: number, len: number) {
  const tt = t * sg.rate + sg.ph;
  if (sg.mode === 1) return fract(tt) < 0.7 ? 1 : 0.15;
  if (sg.mode === 2) return hash(Math.floor(t * 9 + sg.ph * 13)) < 0.12 ? 0.1 : 1; // neon cansado, falhando
  if (sg.mode === 3) return idx <= Math.floor(fract(tt * 0.5) * (len + 2)) ? 1 : 0.12;
  return 0.85 + Math.sin(tt * 3) * 0.1;
}

/* ---------------- horizonte: prédios, letreiros, céu vivo ---------------- */
export function drawSkyline(c: C, W: number, H: number, hz: number, shift: number, t: number, city: City) {
  // névoa colorida no pé da cidade (a luz da cidade subindo)
  const haze = c.createLinearGradient(0, hz - H * 0.22, 0, hz);
  haze.addColorStop(0, "rgba(255,61,200,0)");
  haze.addColorStop(1, "rgba(255,61,200,0.22)");
  c.fillStyle = haze;
  c.fillRect(0, hz - H * 0.22, W, H * 0.22);

  drawSearchlights(c, W, H, hz, t);
  drawSpinners(c, W, H, hz, t);
  drawBlimp(c, W, H, t);

  for (const layer of [0, 1]) {
    for (const tw of city.towers) {
      if (tw.layer !== layer) continue;
      const x0 = tw.x * W - shift * (layer ? 1 : 0.5);
      const w = tw.w * W;
      // abre espaço no meio pro sol e pra estrada
      const mid = Math.abs(x0 + w / 2 - W / 2) / (W * 0.16);
      const hm = Math.max(0.12, Math.min(1, Math.pow(mid, 1.6)));
      const h = tw.h * H * hm;
      const y0 = hz - h;
      const bg = c.createLinearGradient(0, y0, 0, hz);
      bg.addColorStop(0, layer ? "#2a0f52" : "#3a1a6e");
      bg.addColorStop(1, layer ? "#14062c" : "#22104a");
      c.fillStyle = bg;
      c.fillRect(x0, y0, w, h + 1);
      // contorno de luz no topo
      c.fillStyle = layer ? "rgba(95,243,255,0.35)" : "rgba(160,120,255,0.25)";
      c.fillRect(x0, y0, w, 1);
      // janelas (cada uma no seu ciclo)
      for (const wn of tw.wins) {
        if (wn.dy * h < 3) continue;
        const on = fract(t * wn.rate + wn.ph) < wn.duty;
        if (!on) continue;
        c.fillStyle = wn.warm ? `rgba(255,79,216,${layer ? 0.9 : 0.6})` : `rgba(95,243,255,${layer ? 0.75 : 0.45})`;
        c.fillRect(x0 + wn.dx * w - 1.5, y0 + wn.dy * h - 1.5, layer ? 3.5 : 2.5, layer ? 3 : 2.5);
      }
      // antena e luz vermelha de aviso piscando no próprio ritmo
      if (tw.antenna && hm > 0.6) {
        c.fillStyle = "#0b061c";
        c.fillRect(x0 + w / 2 - 1, y0 - h * 0.18, 2, h * 0.18);
        if (fract(t / tw.beacon) < 0.25) {
          c.save();
          c.fillStyle = "#ff3a4a";
          c.shadowColor = "#ff3a4a";
          c.shadowBlur = 10;
          c.fillRect(x0 + w / 2 - 2, y0 - h * 0.18 - 2, 4, 4);
          c.restore();
        }
      }
      // letreiro vertical em japonês
      if (tw.sign && hm > 0.5) {
        const sg = tw.sign;
        const chars = [...sg.word];
        const fs = Math.max(9, Math.min(18, w * 0.42));
        const sx = sg.side < 0 ? x0 + fs * 0.7 : x0 + w - fs * 0.7;
        const sy = y0 + fs * 1.4;
        c.save();
        c.font = `700 ${fs}px sans-serif`;
        c.textAlign = "center";
        chars.forEach((ch, i) => {
          const a = signLight(sg, t, i, chars.length);
          c.fillStyle = `rgba(${sg.color},${a})`;
          c.shadowColor = `rgba(${sg.color},${a})`;
          c.shadowBlur = 12 * a;
          c.fillText(ch, sx, sy + i * fs * 1.1);
        });
        c.restore();
      }
    }
    if (layer === 0) drawTrain(c, W, H, hz, t);
  }
  drawKoiBillboard(c, W, H, hz, t, shift);
  // telões gigantes no alto dos prédios, trocando de anúncio
  for (const [fx, fy, k] of [[0.2, 0.27, 0], [0.64, 0.2, 3]] as const) {
    const bw = Math.min(W * 0.15, 230);
    const bh = bw / 2;
    const x = W * fx - shift * 0.5;
    const y = hz - H * fy;
    const ad = k + Math.floor(t / 9 + fx * 5);
    const { img, glow } = adFrame(ad, t);
    c.save();
    c.fillStyle = "#0b061c";
    c.fillRect(x + bw * 0.45, y + bh, bw * 0.1, H * fy - bh);
    c.globalAlpha = 0.95;
    c.drawImage(img, x, y, bw, bh);
    c.globalAlpha = 1;
    c.shadowColor = `rgb(${glow})`;
    c.shadowBlur = 16;
    c.strokeStyle = `rgba(${glow},0.9)`;
    c.lineWidth = 1.5;
    c.strokeRect(x, y, bw, bh);
    c.restore();
  }
}

// holofotes varrendo o céu (dois, cada um com o seu período)
function drawSearchlights(c: C, W: number, H: number, hz: number, t: number) {
  c.save();
  c.globalCompositeOperation = "lighter";
  for (const [bx, per, ph, col] of [[0.14, 11, 0, "160,200,255"], [0.9, 14.5, 2, "255,160,230"]] as const) {
    const a = -Math.PI / 2 + Math.sin((t / per) * Math.PI * 2 + ph) * 0.55;
    const len = H * 0.9;
    const x = bx * W;
    const y = hz - H * 0.08;
    const g = c.createLinearGradient(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.addColorStop(0, `rgba(${col},0.18)`);
    g.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(a - 0.05) * len, y + Math.sin(a - 0.05) * len);
    c.lineTo(x + Math.cos(a + 0.05) * len, y + Math.sin(a + 0.05) * len);
    c.closePath();
    c.fill();
  }
  c.restore();
}

// carros voadores cruzando o céu, cada um na sua rota e no seu tempo
function drawSpinners(c: C, W: number, H: number, hz: number, t: number) {
  const routes = [
    { per: 17, y: 0.14, dir: 1, ph: 0, s: 1 },
    { per: 23, y: 0.24, dir: -1, ph: 7, s: 0.7 },
    { per: 31, y: 0.08, dir: 1, ph: 15, s: 0.5 },
    { per: 13, y: 0.3, dir: -1, ph: 4, s: 0.85 },
  ];
  for (const r of routes) {
    const u = fract((t + r.ph) / r.per);
    if (u > 0.55) continue; // passa e some por um tempo
    const k = u / 0.55;
    const x = r.dir > 0 ? -0.1 * W + k * 1.2 * W : 1.1 * W - k * 1.2 * W;
    const y = H * r.y + Math.sin(k * Math.PI * 2 + r.ph) * H * 0.015;
    if (y > hz - 10) continue;
    const s = r.s * Math.min(W, H) * 0.02;
    c.save();
    // rastro de luz
    c.globalCompositeOperation = "lighter";
    const tr = c.createLinearGradient(x, y, x - r.dir * s * 14, y);
    tr.addColorStop(0, "rgba(255,120,200,0.35)");
    tr.addColorStop(1, "rgba(255,120,200,0)");
    c.strokeStyle = tr;
    c.lineWidth = s * 0.25;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x - r.dir * s * 14, y + s * 0.2);
    c.stroke();
    // farol varrendo pra frente
    const fb = c.createLinearGradient(x, y, x + r.dir * s * 9, y + s * 2);
    fb.addColorStop(0, "rgba(230,245,255,0.35)");
    fb.addColorStop(1, "rgba(230,245,255,0)");
    c.fillStyle = fb;
    c.beginPath();
    c.moveTo(x + r.dir * s, y);
    c.lineTo(x + r.dir * s * 9, y - s * 0.6);
    c.lineTo(x + r.dir * s * 9, y + s * 3);
    c.closePath();
    c.fill();
    c.globalCompositeOperation = "source-over";
    // corpo
    c.fillStyle = "#07040f";
    c.beginPath();
    c.moveTo(x - r.dir * s * 1.2, y);
    c.lineTo(x + r.dir * s * 1.3, y - s * 0.1);
    c.lineTo(x + r.dir * s * 0.6, y - s * 0.5);
    c.lineTo(x - r.dir * s * 0.8, y - s * 0.4);
    c.closePath();
    c.fill();
    c.fillStyle = fract(t * 1.3 + r.ph) < 0.3 ? "#ff3a4a" : "#401018";
    c.fillRect(x - r.dir * s * 1.2 - 1, y - s * 0.3, 3, 3);
    c.restore();
  }
}

// dirigível arrastando um anúncio (uma volta a cada dois minutos)
function drawBlimp(c: C, W: number, H: number, t: number) {
  const u = fract(t / 120 + 0.35);
  const x = -0.2 * W + u * 1.4 * W;
  const y = H * 0.2 + Math.sin(t * 0.3) * 4;
  const bw = Math.min(W * 0.14, 200);
  const bh = bw * 0.28;
  c.save();
  c.fillStyle = "#0a0618";
  c.beginPath();
  c.ellipse(x, y, bw / 2, bh / 2, 0, 0, Math.PI * 2);
  c.fill();
  // tela de anúncio com texto rolando
  c.beginPath();
  c.rect(x - bw * 0.32, y - bh * 0.18, bw * 0.64, bh * 0.36);
  c.clip();
  c.fillStyle = "#1a0428";
  c.fillRect(x - bw * 0.32, y - bh * 0.18, bw * 0.64, bh * 0.36);
  c.font = `700 ${Math.round(bh * 0.3)}px sans-serif`;
  c.fillStyle = "#ff4fb8";
  c.shadowColor = "#ff4fb8";
  c.shadowBlur = 8;
  const msg = "眠らない街 · ネオ東京 · 夢を売ります · ";
  const tw = c.measureText(msg).width;
  const off = (t * 30) % tw;
  c.fillText(msg + msg, x - bw * 0.32 - off, y + bh * 0.1);
  c.restore();
  c.fillStyle = fract(t * 0.8) < 0.2 ? "#5ff3ff" : "#123";
  c.fillRect(x + bw / 2 - 3, y - 1, 3, 3);
}

// trem elevado passando ao longe a cada ~40 s
function drawTrain(c: C, W: number, H: number, hz: number, t: number) {
  const by = hz - H * 0.03;
  c.fillStyle = "#0d0722";
  c.fillRect(0, by, W, 3);
  for (let x = (t * 0) % 60; x < W; x += W / 14) c.fillRect(x, by, 3, H * 0.03);
  const u = fract(t / 41);
  if (u > 0.25) return;
  const k = u / 0.25;
  const len = W * 0.38;
  const x0 = -len + k * (W + len);
  c.save();
  c.fillStyle = "#130a2c";
  c.fillRect(x0, by - 9, len, 9);
  c.fillStyle = "rgba(140,230,255,0.85)";
  c.shadowColor = "#5ff3ff";
  c.shadowBlur = 8;
  for (let x = 4; x < len - 4; x += 7) c.fillRect(x0 + x, by - 7, 4, 3);
  c.fillStyle = "#fff";
  c.fillRect(x0 + len - 3, by - 6, 3, 3);
  c.restore();
}

// outdoor holográfico com uma carpa nadando em oito
function drawKoiBillboard(c: C, W: number, H: number, hz: number, t: number, shift: number) {
  const bw = Math.min(W * 0.11, 170);
  const bh = bw * 0.75;
  const cx = W * 0.79 - shift;
  const cy = hz - H * 0.2 - bh / 2;
  c.save();
  c.globalCompositeOperation = "lighter";
  c.strokeStyle = "rgba(95,243,255,0.35)";
  c.lineWidth = 1;
  c.strokeRect(cx - bw / 2, cy - bh / 2, bw, bh);
  c.fillStyle = "rgba(95,243,255,0.05)";
  c.fillRect(cx - bw / 2, cy - bh / 2, bw, bh);
  // a carpa: posição num oito e corpo virado pra onde nada
  const p = (tt: number) => [cx + Math.sin(tt) * bw * 0.32, cy + Math.sin(tt * 2) * bh * 0.22] as const;
  const tt = t * 0.6;
  const [x, y] = p(tt);
  const [x2, y2] = p(tt + 0.05);
  const ang = Math.atan2(y2 - y, x2 - x);
  c.translate(x, y);
  c.rotate(ang);
  const L = bw * 0.22;
  const wig = Math.sin(t * 6) * 0.25;
  c.fillStyle = "rgba(255,150,60,0.75)";
  c.beginPath();
  c.ellipse(0, 0, L * 0.5, L * 0.2, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "rgba(255,240,230,0.7)";
  c.beginPath();
  c.ellipse(L * 0.12, -L * 0.03, L * 0.16, L * 0.1, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "rgba(255,120,60,0.6)";
  c.beginPath();
  c.moveTo(-L * 0.45, 0);
  c.lineTo(-L * 0.85, -L * 0.25 + wig * L * 0.3);
  c.lineTo(-L * 0.75, 0);
  c.lineTo(-L * 0.85, L * 0.25 + wig * L * 0.3);
  c.closePath();
  c.fill();
  c.restore();
  // linhas de holograma
  c.save();
  c.fillStyle = "rgba(10,6,30,0.35)";
  for (let yy = cy - bh / 2; yy < cy + bh / 2; yy += 3) c.fillRect(cx - bw / 2, yy, bw, 1);
  c.font = `700 ${Math.round(bh * 0.12)}px sans-serif`;
  c.fillStyle = `rgba(95,243,255,${0.55 + Math.sin(t * 2) * 0.2})`;
  c.textAlign = "center";
  c.fillText("鯉 · 幸運", cx, cy + bh / 2 - 6);
  c.restore();
}

/* ---------------- prédios colados na estrada, passando em perspectiva ---------------- */
// px(lado, z): x na tela de um ponto no chão; py(altura, z): y na tela (altura 1 = olho do motorista)
export type Proj = { px: (s: number, z: number) => number; py: (h: number, z: number) => number };

const SPACING = 3.2;
const COUNT = 14;

export function drawStreet(c: C, t: number, dist: number, P: Proj, glowRoad: (x: number, y: number, w: number, h: number, rgb: string) => void) {
  const L = SPACING * COUNT;
  const list: { z: number; seed: number; side: number }[] = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < COUNT; i++) {
      const raw = i * SPACING + (side > 0 ? SPACING / 2 : 0) - dist;
      const cycle = Math.floor(raw / L);
      const z = raw - cycle * L + 0.15;
      list.push({ z, seed: i * 131 + side * 977 + cycle * 7919, side });
    }
  }
  list.sort((a, b) => b.z - a.z);
  for (const b of list) building(c, t, b.z, b.seed, b.side, P, glowRoad);
}

function building(c: C, t: number, z0: number, seed: number, side: number, P: Proj, glowRoad: (x: number, y: number, w: number, h: number, rgb: string) => void) {
  const len = 1.4 + hash(seed) * 1.2;
  const z1 = z0 + len;
  if (z1 < 0.35) return;
  const zA = Math.max(0.35, z0);
  const s = side * (1.45 + hash(seed + 1) * 0.6); // parede virada pra estrada
  sidewalk(c, P, side, s, z0, z1);
  if (hash(seed + 99) < 0.22) {
    // terreno vazio: respiro entre os prédios (mas sempre tem alguém passando)
    pedestrians(c, P, side, s, z0, z1, seed, t);
    return;
  }
  const deep = 1.6 + hash(seed + 2) * 1.2;
  const h = 2 + Math.pow(hash(seed + 3), 1.8) * 6.5;
  const tone = Math.floor(hash(seed + 4) * 3);
  const base = ["#2c1258", "#22104c", "#34104e"][tone];
  const quad = (pts: [number, number, number][]) => {
    c.beginPath();
    pts.forEach(([ss, zz, hh], i) => {
      const x = P.px(ss, zz);
      const y = P.py(hh, zz);
      if (i) c.lineTo(x, y);
      else c.moveTo(x, y);
    });
    c.closePath();
  };
  // fachada de frente (de topo pra quem vem) só quando o prédio ainda está à frente
  if (z0 > 0.35) {
    quad([[s, z0, 0], [s + side * deep, z0, 0], [s + side * deep, z0, h], [s, z0, h]]);
    c.fillStyle = "#1c1238";
    c.fill();
  }
  // parede lateral (a que corre ao lado da estrada)
  quad([[s, zA, 0], [s, z1, 0], [s, z1, h], [s, zA, h]]);
  const g = c.createLinearGradient(P.px(s, zA), 0, P.px(s, z1), 0);
  g.addColorStop(0, base);
  g.addColorStop(1, "#05030c");
  c.fillStyle = g;
  c.fill();
  // borda de luz no topo
  c.beginPath();
  c.moveTo(P.px(s, zA), P.py(h, zA));
  c.lineTo(P.px(s, z1), P.py(h, z1));
  c.strokeStyle = `rgba(${NEON[Math.floor(hash(seed + 5) * NEON.length)]},0.5)`;
  c.lineWidth = 1.2;
  c.stroke();
  // janelas: grade na parede, cada uma acesa no seu tempo
  const cols = 4;
  const rows = Math.min(14, Math.floor(h * 1.5));
  for (let r = 1; r < rows; r++)
    for (let k = 0; k < cols; k++) {
      const ws = seed * 31 + r * 7 + k;
      if (hash(ws) < 0.35) continue;
      const on = fract(t * (0.01 + hash(ws + 1) * 0.04) + hash(ws + 2)) < 0.4 + hash(ws + 3) * 0.55;
      if (!on) continue;
      const za = z0 + ((k + 0.3) / cols) * len;
      const zb = z0 + ((k + 0.62) / cols) * len;
      if (za < 0.4) continue;
      const ha = (r / rows) * h;
      const hb = ha + (h / rows) * 0.38;
      quad([[s, za, ha], [s, zb, ha], [s, zb, hb], [s, za, hb]]);
      c.fillStyle = hash(ws + 4) < 0.5 ? "rgba(255,79,216,0.9)" : hash(ws + 4) < 0.85 ? "rgba(95,243,255,0.8)" : "rgba(255,214,102,0.85)";
      c.fill();
    }
  // letreiro vertical saindo da parede, com o seu próprio ritmo
  if (hash(seed + 6) < 0.6 && z0 + 0.3 > 0.45) {
    const col = NEON[Math.floor(hash(seed + 7) * NEON.length)];
    const mode = Math.floor(hash(seed + 8) * 3);
    const a = mode === 0 ? 0.95 : mode === 1 ? (fract(t * (0.5 + hash(seed + 9)) + hash(seed)) < 0.65 ? 1 : 0.15) : hash(Math.floor(t * 8 + seed)) < 0.15 ? 0.1 : 1;
    const zs = z0 + 0.25;
    const h0 = h * 0.35;
    const h1 = Math.min(h * 0.9, h0 + 2.2);
    const out = s - side * 0.35;
    quad([[s, zs, h0], [out, zs, h0], [out, zs, h1], [s, zs, h1]]);
    c.fillStyle = `rgba(${col},${0.3 + 0.6 * a})`;
    c.save();
    c.shadowColor = `rgba(${col},${a})`;
    c.shadowBlur = 18 * a;
    c.fill();
    c.restore();
    // "letras": barrinhas escuras na placa
    for (let i = 0; i < 4; i++) {
      const hh = h0 + ((i + 0.3) / 4) * (h1 - h0);
      quad([[s - side * 0.08, zs, hh], [out + side * 0.08, zs, hh], [out + side * 0.08, zs, hh + (h1 - h0) * 0.12], [s - side * 0.08, zs, hh + (h1 - h0) * 0.12]]);
      c.fillStyle = `rgba(20,5,30,${0.5 * a})`;
      c.fill();
    }
    // reflexo da placa no asfalto molhado
    const rx = P.px(out, zs);
    const ry = P.py(0, zs);
    glowRoad(rx, ry, Math.max(4, (P.px(s, zs) - rx) * side * -1), Math.min(220, 60 / Math.max(zs, 0.4)), col);
  }
  // lojinha no térreo (bar, karaokê, lámen...) com toldo, placa e lanterna
  if (hash(seed + 10) < 0.75) storefront(c, P, side, s, z0 + 0.15, z1 - 0.15, Math.floor(hash(seed + 11) * 6), t);
  // outdoor com anúncio em pixel art nos prédios mais altos
  if (h > 3.6 && hash(seed + 15) < 0.7) {
    const h0 = 1.9 + hash(seed + 16) * Math.min(2, h - 3.6);
    billboard(c, P, side, s, z0 + 0.15, Math.min(z1 - 0.1, z0 + 0.15 + 2.2), h0, h0 + 1.25, Math.floor(hash(seed + 17) * 6), t);
  }
  pedestrians(c, P, side, s, z0, z1, seed, t);
  // vapor saindo de um bueiro no pé do prédio, de tempos em tempos
  if (hash(seed + 13) < 0.3) {
    const u = fract(t / (6 + hash(seed + 14) * 6) + hash(seed));
    if (u < 0.6) {
      const zz = Math.max(0.5, z0 + len * 0.5);
      const x = P.px(s - side * 0.25, zz);
      const y = P.py(0, zz);
      const r = (20 + u * 70) / Math.max(zz, 0.6);
      c.save();
      const vg = c.createRadialGradient(x, y - u * r * 2, 0, x, y - u * r * 2, r);
      vg.addColorStop(0, `rgba(220,210,255,${0.18 * (1 - u)})`);
      vg.addColorStop(1, "rgba(220,210,255,0)");
      c.fillStyle = vg;
      c.fillRect(x - r, y - u * r * 2 - r, r * 2, r * 2);
      c.restore();
    }
  }
}

/* ---------------- chuva fina ---------------- */
export function drawRain(c: C, W: number, H: number, dt: number, city: City, amount: number, slant = 0.25) {
  c.save();
  c.strokeStyle = "rgba(190,210,255,0.22)";
  c.lineWidth = 1;
  c.beginPath();
  const n = Math.floor(city.rain.length * amount);
  for (let i = 0; i < n; i++) {
    const d = city.rain[i];
    d.y += d.v * dt * 1.4;
    d.x += d.v * dt * slant * 0.3;
    if (d.y > 1) {
      d.y -= 1.05;
      d.x = Math.random();
    }
    if (d.x > 1) d.x -= 1;
    const x = d.x * W;
    const y = d.y * H;
    c.moveTo(x, y);
    c.lineTo(x - d.l * H * slant, y - d.l * H);
  }
  c.stroke();
  c.restore();
}

/* ---------------- vista da janela: fachadas passando de lado ---------------- */
export function drawSideStreet(c: C, W: number, H: number, hz: number, t: number, dist: number) {
  const gap = W * 0.75;
  const off = (dist * W * 0.38) % gap;
  for (let i = -1; i < 4; i++) {
    const n = Math.floor((dist * W * 0.38) / gap) + i;
    const x = W * 1.05 + i * gap - off - gap;
    const seed = n * 53;
    if (hash(seed + 20) < 0.25) continue; // um terreno vazio deixa ver a cidade lá atrás
    const w = gap * (0.45 + hash(seed) * 0.25);
    const top = hz - H * (0.08 + hash(seed + 1) * 0.24);
    const bottom = hz + H * 0.18;
    c.fillStyle = ["#2c1258", "#22104c", "#34104e"][Math.floor(hash(seed + 2) * 3)];
    c.fillRect(x, top, w, bottom - top);
    c.fillStyle = `rgba(${NEON[Math.floor(hash(seed + 3) * NEON.length)]},0.6)`;
    c.fillRect(x, top, w, 2);
    // janelas
    const cols = 7;
    const rows = Math.floor((bottom - top) / 22);
    for (let r = 0; r < rows - 1; r++)
      for (let k = 0; k < cols; k++) {
        const ws = seed * 17 + r * 11 + k;
        if (hash(ws) < 0.4) continue;
        if (fract(t * (0.01 + hash(ws + 1) * 0.04) + hash(ws + 2)) > 0.45 + hash(ws + 3) * 0.5) continue;
        c.fillStyle = hash(ws + 4) < 0.5 ? "rgba(255,79,216,0.9)" : "rgba(95,243,255,0.75)";
        c.fillRect(x + (k + 0.35) * (w / cols), top + 10 + r * 22, (w / cols) * 0.3, 8);
      }
    // outdoor de anúncio em pixel e lojinha no térreo
    if (hash(seed + 21) < 0.6 && bottom - top > H * 0.2) {
      const bw = Math.min(w * 0.6, H * 0.36);
      const { img, glow } = adFrame(Math.floor(hash(seed + 22) * 6), t);
      const bx = x + w * 0.08;
      const by = top + H * 0.04;
      c.save();
      c.fillStyle = "#16141c";
      c.fillRect(bx - 6, by - 6, bw + 12, bw / 2 + 12); // gabinete
      c.drawImage(img, bx, by, bw, bw / 2);
      c.shadowColor = `rgb(${glow})`;
      c.shadowBlur = 14;
      c.strokeStyle = `rgba(${glow},0.95)`;
      c.lineWidth = 2;
      c.strokeRect(bx, by, bw, bw / 2);
      c.restore();
    }
    // letreiro vertical
    if (hash(seed + 5) < 0.7) {
      const sg: Sign = { word: WORDS[Math.floor(hash(seed + 6) * WORDS.length)], color: NEON[Math.floor(hash(seed + 7) * NEON.length)], mode: Math.floor(hash(seed + 8) * 4), rate: 0.5 + hash(seed + 9), ph: hash(seed + 10) * 9, side: 1 };
      const chars = [...sg.word];
      const fs = 30;
      c.save();
      c.font = `700 ${fs}px sans-serif`;
      c.textAlign = "center";
      const sx = x + w * 0.85;
      chars.forEach((ch, i) => {
        const a = signLight(sg, t, i, chars.length);
        c.fillStyle = `rgba(${sg.color},${a})`;
        c.shadowColor = `rgba(${sg.color},${a})`;
        c.shadowBlur = 16 * a;
        c.fillText(ch, sx, top + 50 + i * fs * 1.15);
      });
      c.restore();
    }
  }
}
