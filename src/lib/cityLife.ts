// Vida de rua da Neo-Tóquio: outdoors com anúncios em pixel art (marcas inventadas),
// lojinhas no térreo e gente andando na calçada — tudo em pixel, misturado com o neon
// e a perspectiva 3D da estrada.
//
// As texturas são pequenas (pixel de verdade) e geradas uma vez só; na tela elas são
// esticadas sem suavização, então cada pixel vira um bloquinho.

import { NPC_COUNT, STROLLER_H, STROLLER_W, drawNPC, npc, npcPushesStroller, stroller } from "./npcs";

type C = CanvasRenderingContext2D;

const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const fract = (x: number) => x - Math.floor(x);

/* ---------------- fonte de pixel 3x5 ---------------- */
const FONT: Record<string, string> = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111",
  F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010",
  K: "101101110101101", L: "100100100100111", M: "101111111101101", N: "110101101101101", O: "010101101101010",
  P: "110101110100100", Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010",
  U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101", Y: "101101010010010",
  Z: "111001010100111", "0": "111101101101111", "1": "010110010010111", "2": "110001010100111", "3": "110001010001110",
  "4": "101101111001001", "5": "111100110001110", "6": "011100111101111", "7": "111001010010010", "8": "111101111101111",
  "9": "111101111001110", "!": "010010010000010", "?": "110001010000010", ".": "000000000000010", "-": "000000111000000",
  "·": "000000010000000", "'": "010010000000000", ":": "000010000010000", "%": "101001010100101", "+": "000010111010000",
};
const PLAIN: Record<string, string> = { Á: "A", Ã: "A", Â: "A", À: "A", É: "E", Ê: "E", Í: "I", Ó: "O", Õ: "O", Ô: "O", Ú: "U", Ç: "C" };

function pixText(c: C, text: string, x: number, y: number, color: string, scale = 1) {
  c.fillStyle = color;
  let cx = x;
  for (const raw of text.toUpperCase()) {
    const ch = PLAIN[raw] ?? raw;
    const g = FONT[ch];
    if (g)
      for (let i = 0; i < 15; i++) if (g[i] === "1") c.fillRect(cx + (i % 3) * scale, y + Math.floor(i / 3) * scale, scale, scale);
    cx += 4 * scale;
  }
}
const textW = (text: string, scale = 1) => text.length * 4 * scale - scale;
function centerText(c: C, text: string, cx: number, y: number, color: string, scale = 1) {
  pixText(c, text, Math.round(cx - textW(text, scale) / 2), y, color, scale);
}

/* ---------------- anúncios (marcas inventadas) ---------------- */
// cada anúncio tem 2 quadros, trocados no ritmo dele
type Ad = { frames: HTMLCanvasElement[]; rate: number; glow: string };
const AW = 64;
const AH = 32;
let ADS: Ad[] | null = null;

function canvas(w: number, h: number) {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const c = cv.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  return [cv, c] as const;
}

function makeAd(glow: string, rate: number, paint: (c: C, f: number) => void): Ad {
  const frames = [0, 1].map((f) => {
    const [cv, c] = canvas(AW, AH);
    paint(c, f);
    return cv;
  });
  return { frames, rate, glow };
}

function grad(c: C, a: string, b: string) {
  const g = c.createLinearGradient(0, 0, 0, AH);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  c.fillStyle = g;
  c.fillRect(0, 0, AW, AH);
}

function buildAds(): Ad[] {
  return [
    // lámen 24h: tigela fumegando
    makeAd("255,80,110", 1.2, (c, f) => {
      grad(c, "#c4123a", "#5a0420");
      c.fillStyle = "#fff4e0";
      c.fillRect(8, 17, 18, 2);
      c.fillRect(9, 19, 16, 3);
      c.fillRect(11, 22, 12, 2);
      c.fillStyle = "#ffcf5a";
      c.fillRect(10, 16, 14, 1);
      c.fillStyle = "#3a1a0a";
      c.fillRect(19, 9, 1, 8);
      c.fillRect(21, 8, 1, 9);
      c.fillStyle = "rgba(255,255,255,0.7)";
      for (let i = 0; i < 3; i++) c.fillRect(11 + i * 4 + (f ? 1 : 0), 7 + ((i + f) % 2) * 2, 1, 5);
      centerText(c, "RAMEN", 46, 6, "#ffe9a8", 1);
      centerText(c, "24H", 46, 14, "#ffffff", 2);
      c.fillStyle = "#ffcf5a";
      c.font = "7px sans-serif";
      c.fillText("ラーメン", 31, 31);
    }),
    // clínica de memória: "esqueça o que dói"
    makeAd("95,243,255", 0.45, (c, f) => {
      grad(c, "#06333f", "#021018");
      // olho com uma lágrima
      c.fillStyle = "#bff8ff";
      c.fillRect(6, 12, 16, 1);
      c.fillRect(4, 13, 20, 4);
      c.fillRect(6, 17, 16, 1);
      c.fillStyle = "#0a5566";
      c.fillRect(11, 12, 6, 6);
      c.fillStyle = "#021018";
      c.fillRect(13, 14, 2, 2);
      if (f) {
        c.fillStyle = "#5ff3ff";
        c.fillRect(19, 20, 1, 2);
        c.fillRect(18, 22, 3, 2);
      }
      centerText(c, "LETHE", 44, 4, "#5ff3ff", 1);
      centerText(c, f ? "O QUE DÓI" : "ESQUEÇA", 44, 13, "#ffffff", 1);
      centerText(c, "CLÍNICA", 44, 22, "#5ff3ff", 1);
    }),
    // café que não deixa dormir
    makeAd("255,170,60", 0.7, (c, f) => {
      grad(c, "#1a0f08", "#0a0604");
      c.fillStyle = "#e9d9c0";
      c.fillRect(6, 14, 12, 10);
      c.fillRect(18, 16, 3, 1);
      c.fillRect(20, 16, 1, 5);
      c.fillRect(18, 20, 3, 1);
      c.fillStyle = "#4a2610";
      c.fillRect(7, 14, 10, 2);
      c.fillStyle = "rgba(255,255,255,0.6)";
      c.fillRect(9 + f, 8, 1, 4);
      c.fillRect(13 - f, 7, 1, 5);
      centerText(c, "KURO CAFÉ", 42, 4, "#ffaa3c", 1);
      centerText(c, f ? "NUNCA." : "DORMIR?", 42, 14, "#ffffff", 1);
      centerText(c, "SEM FECHAR", 42, 25, "#ffaa3c", 1);
    }),
    // bebida de neon
    makeAd("255,61,240", 1.6, (c, f) => {
      grad(c, "#ff3df0", "#4a0a6a");
      c.fillStyle = "#1a0230";
      c.fillRect(8, 6, 4, 4);
      c.fillRect(6, 10, 8, 18);
      c.fillStyle = f ? "#5ff3ff" : "#ffffff";
      c.fillRect(7, 15, 6, 6);
      c.fillStyle = "#ff3df0";
      c.fillRect(8, 17, 4, 2);
      centerText(c, "SOJU-X", 40, 5, "#ffffff", 2);
      centerText(c, "BEBA O NEON", 40, 21, f ? "#5ff3ff" : "#1a0230", 1);
    }),
    // pachinko: bolinhas piscando
    makeAd("255,214,102", 2.4, (c, f) => {
      grad(c, "#ffd666", "#ff6a2a");
      for (let i = 0; i < 9; i++)
        for (let j = 0; j < 3; j++) {
          c.fillStyle = (i + j + f) % 2 ? "#ffffff" : "#c4123a";
          c.fillRect(3 + i * 7, 3 + j * 4, 3, 3);
        }
      centerText(c, "PACHINKO", 32, 17, "#3a0a1a", 1);
      centerText(c, "777", 32, 23, f ? "#ffffff" : "#c4123a", 1);
    }),
    // colônias na lua: "vida nova"
    makeAd("160,120,255", 0.35, (c, f) => {
      grad(c, "#0a0630", "#1e0a50");
      for (let i = 0; i < 14; i++) {
        c.fillStyle = hash(i + f * 20) < 0.5 ? "#ffffff" : "#8a7aff";
        c.fillRect(Math.floor(hash(i) * AW), Math.floor(hash(i + 7) * 12), 1, 1);
      }
      c.fillStyle = "#e8e0ff";
      c.beginPath();
      c.arc(14, 18, 9, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#b0a4e8";
      c.fillRect(10, 15, 3, 3);
      c.fillRect(16, 20, 4, 3);
      centerText(c, "LUA NOVA", 44, 8, "#ffffff", 1);
      centerText(c, f ? "VIDA NOVA" : "RECOMECE", 44, 16, "#a078ff", 1);
      centerText(c, "COLÔNIAS", 44, 24, "#ffffff", 1);
    }),
  ];
}
export function ads() {
  if (!ADS) ADS = buildAds();
  return ADS;
}
// a arte do anúncio vira uma tela de LED: mais resolução, cores vazando (bloom), malha fina
// de LEDs, vinheta e o brilho do vidro — assim ela parece uma tela física, não pixel solto
const PANEL = new Map<HTMLCanvasElement, HTMLCanvasElement>();
function ledPanel(src: HTMLCanvasElement) {
  let cv = PANEL.get(src);
  if (cv) return cv;
  const w = 256;
  const h = 128;
  cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const c = cv.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  c.drawImage(src, 0, 0, w, h);
  // bloom interno: cada cor acesa vaza um pouquinho
  c.globalCompositeOperation = "lighter";
  c.globalAlpha = 0.45;
  c.filter = "blur(3px)";
  c.drawImage(src, 0, 0, w, h);
  c.filter = "none";
  c.globalAlpha = 1;
  c.globalCompositeOperation = "source-over";
  // malha de LEDs (bem fina, quase não se vê de longe)
  c.fillStyle = "rgba(0,0,0,0.22)";
  for (let x = 0; x < w; x += 2) c.fillRect(x, 0, 1, h);
  for (let y = 0; y < h; y += 2) c.fillRect(0, y, w, 1);
  // vinheta: as bordas da tela um pouco mais escuras
  const v = c.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.62);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.45)");
  c.fillStyle = v;
  c.fillRect(0, 0, w, h);
  PANEL.set(src, cv);
  return cv;
}
// versão borrada da tela (feita uma vez só): é o brilho que vaza pra fora
const BLOOM = new Map<HTMLCanvasElement, HTMLCanvasElement>();
function bloomOf(src: HTMLCanvasElement) {
  let cv = BLOOM.get(src);
  if (cv) return cv;
  cv = document.createElement("canvas");
  cv.width = 128;
  cv.height = 64;
  const c = cv.getContext("2d")!;
  c.filter = "blur(6px)";
  c.drawImage(src, 12, 6, 104, 52);
  c.filter = "none";
  BLOOM.set(src, cv);
  return cv;
}
export function adFrame(i: number, t: number) {
  const ad = ads()[i % ads().length];
  return { img: ledPanel(ad.frames[Math.floor(t * ad.rate + i * 0.37) % 2]), glow: ad.glow };
}


/* ---------------- placas de loja ---------------- */
const SHOPS = [
  { name: "BAR", jp: "酒場", rgb: "255,80,110" },
  { name: "KARAOKE", jp: "カラオケ", rgb: "255,61,240" },
  { name: "NOODLE", jp: "麺", rgb: "255,170,60" },
  { name: "24H", jp: "コンビニ", rgb: "95,243,255" },
  { name: "PEÇAS", jp: "電脳", rgb: "120,255,170" },
  { name: "HOTEL", jp: "ホテル", rgb: "160,120,255" },
];
let SHOP_TEX: HTMLCanvasElement[] | null = null;
export function shopSign(i: number) {
  if (!SHOP_TEX)
    SHOP_TEX = SHOPS.map((s) => {
      const [cv, c] = canvas(40, 9);
      c.fillStyle = "#0b0418";
      c.fillRect(0, 0, 40, 9);
      c.fillStyle = `rgb(${s.rgb})`;
      c.fillRect(0, 0, 40, 1);
      c.fillRect(0, 8, 40, 1);
      centerText(c, s.name, 20, 2, `rgb(${s.rgb})`, 1);
      return cv;
    });
  return { img: SHOP_TEX[i % SHOP_TEX.length], ...SHOPS[i % SHOPS.length] };
}

/* ---------------- desenho em perspectiva ---------------- */
// coisas que precisam de nitidez (texto dos anúncios) ficam pra depois da pixelização
const LATE: ((c: C) => void)[] = [];
export function flushLate(c: C) {
  for (const fn of LATE) fn(c);
  LATE.length = 0;
}
export function clearLate() {
  LATE.length = 0;
}
export type Proj = { px: (s: number, z: number) => number; py: (h: number, z: number) => number };

// textura numa parede paralela à estrada (s constante): fatias verticais, cada uma no seu z,
// então a imagem encolhe certinho com a distância
export function wallImage(c: C, img: HTMLCanvasElement, P: Proj, s: number, za: number, zb: number, h0: number, h1: number, slices = 32) {
  const iw = img.width;
  for (let i = 0; i < slices; i++) {
    const u0 = i / slices;
    const u1 = (i + 1) / slices;
    const z0 = za + (zb - za) * u0;
    const z1 = za + (zb - za) * u1;
    if (Math.min(z0, z1) < 0.6) continue; // colado na câmera a fatia estica demais
    const x0 = P.px(s, z0);
    const x1 = P.px(s, z1);
    const yt = P.py(h1, z0);
    const yb = P.py(h0, z0);
    const sx = Math.floor(u0 * iw);
    const sw = Math.max(1, Math.floor(u1 * iw) - sx);
    c.drawImage(img, sx, 0, sw, img.height, Math.min(x0, x1), yt, Math.abs(x1 - x0) + 0.6, yb - yt);
  }
}

// outdoor 3D na parede: estrutura saindo do prédio, moldura neon e o anúncio em pixel
export function billboard(c: C, P: Proj, side: number, s: number, za: number, zb: number, h0: number, h1: number, ad: number, t: number) {
  if (zb < 0.5) return;
  void c;
  const { img, glow } = adFrame(ad, t);
  // tudo do outdoor vai em resolução cheia (é ele que tem que parecer real no meio do pixel)
  LATE.push((m) => realBillboard(m, P, side, s, za, zb, h0, h1, img, glow, t));
}

// Outdoor de verdade: gabinete de metal com profundidade, tela de LED embutida numa moldura,
// brilho da tela vazando (bloom) na parede e no ar molhado, refletores embaixo, passarela de
// manutenção, chuva escorrendo na tela e reflexo de vidro.
function realBillboard(m: C, P: Proj, side: number, s: number, za: number, zb: number, h0: number, h1: number, img: HTMLCanvasElement, glow: string, t: number) {
  const D = 0.28; // profundidade do gabinete
  const back = s - side * 0.04;
  const out = s - side * D;
  const zA = Math.max(0.6, za);
  if (zb <= zA) return;
  const q = (pts: [number, number, number][]) => {
    m.beginPath();
    pts.forEach(([ss, zz, hh], i) => (i ? m.lineTo(P.px(ss, zz), P.py(hh, zz)) : m.moveTo(P.px(ss, zz), P.py(hh, zz))));
    m.closePath();
  };
  const xs = [P.px(out, zA), P.px(out, zb), P.px(back, zA), P.px(back, zb)];
  const ys = [P.py(h1, zA), P.py(h0, zA), P.py(h1, zb), P.py(h0, zb)];
  const bx0 = Math.min(...xs);
  const bx1 = Math.max(...xs);
  const by0 = Math.min(...ys);
  const by1 = Math.max(...ys);
  const size = Math.max(bx1 - bx0, by1 - by0);
  m.save();
  // 1) luz da tela banhando a parede atrás e o ar (antes do gabinete)
  m.globalCompositeOperation = "lighter";
  const cx = (bx0 + bx1) / 2;
  const cy = (by0 + by1) / 2;
  const halo = m.createRadialGradient(cx, cy, size * 0.1, cx, cy, size * 1.1);
  halo.addColorStop(0, `rgba(${glow},0.22)`);
  halo.addColorStop(1, `rgba(${glow},0)`);
  m.fillStyle = halo;
  m.fillRect(cx - size * 1.2, cy - size * 1.2, size * 2.4, size * 2.4);
  m.globalCompositeOperation = "source-over";
  // 2) estrutura: duas vigas presas na parede e a passarela de manutenção embaixo
  for (const u of [0.18, 0.82]) {
    const zz = za + (zb - za) * u;
    if (zz < 0.6) continue;
    q([[s, zz, h0 - 0.5], [out, zz, h0 - 0.02], [out, zz, h0], [s, zz, h0 - 0.42]]);
    m.fillStyle = "#16141c";
    m.fill();
  }
  q([[back, zA, h0 - 0.12], [out - side * 0.12, zA, h0 - 0.12], [out - side * 0.12, zb, h0 - 0.12], [back, zb, h0 - 0.12]]);
  m.fillStyle = "#121018";
  m.fill();
  // guarda-corpo da passarela
  m.strokeStyle = "rgba(120,120,140,0.55)";
  m.lineWidth = Math.max(0.6, size / 300);
  m.beginPath();
  m.moveTo(P.px(out - side * 0.12, zA), P.py(h0 - 0.02, zA));
  m.lineTo(P.px(out - side * 0.12, zb), P.py(h0 - 0.02, zb));
  for (let k = 0; k <= 8; k++) {
    const zz = zA + ((zb - zA) * k) / 8;
    m.moveTo(P.px(out - side * 0.12, zz), P.py(h0 - 0.12, zz));
    m.lineTo(P.px(out - side * 0.12, zz), P.py(h0 - 0.02, zz));
  }
  m.stroke();
  // 3) gabinete: fundo (visto de baixo) e a lateral de frente pra quem chega, metal escovado
  q([[back, zA, h0], [out, zA, h0], [out, zb, h0], [back, zb, h0]]);
  const under = m.createLinearGradient(P.px(back, zA), 0, P.px(out, zA), 0);
  under.addColorStop(0, "#0c0b12");
  under.addColorStop(1, "#24222e");
  m.fillStyle = under;
  m.fill();
  if (za > 0.6) {
    q([[back, za, h0], [out, za, h0], [out, za, h1], [back, za, h1]]);
    const sideG = m.createLinearGradient(0, P.py(h1, za), 0, P.py(h0, za));
    sideG.addColorStop(0, "#2e2c38");
    sideG.addColorStop(1, "#15141c");
    m.fillStyle = sideG;
    m.fill();
    m.strokeStyle = "rgba(255,255,255,0.12)";
    m.lineWidth = 1;
    m.stroke();
  }
  // moldura (bezel) da frente
  q([[out, zA, h0], [out, zb, h0], [out, zb, h1], [out, zA, h1]]);
  m.fillStyle = "#0b0a10";
  m.fill();
  m.strokeStyle = "rgba(200,200,220,0.25)";
  m.lineWidth = Math.max(0.8, size / 260);
  m.stroke();
  // 4) a tela de LED, embutida um pouquinho na moldura (imagem suave, como tela de verdade)
  const ih = (h1 - h0) * 0.07;
  const iz = (zb - za) * 0.04;
  m.imageSmoothingEnabled = true;
  m.imageSmoothingQuality = "high";
  // na parede da direita o texto corre ao contrário em z (senão aparece espelhado)
  const [sa, sb] = side > 0 ? [zb - iz, za + iz] : [za + iz, zb - iz];
  wallImage(m, img, P, out, sa, sb, h0 + ih, h1 - ih, 64);
  // 5) bloom: a luz da tela estourando por cima dela mesma (textura já borrada, sem filtro por quadro)
  m.globalCompositeOperation = "lighter";
  m.globalAlpha = 0.4;
  const [ba, bb] = side > 0 ? [zb + iz, za - iz] : [za - iz, zb + iz];
  wallImage(m, bloomOf(img), P, out, ba, bb, h0 - ih * 2, h1 + ih * 2, 16);
  m.globalAlpha = 1;
  // 6) refletores na passarela apontando pra cima
  for (const u of [0.25, 0.5, 0.75]) {
    const zz = za + (zb - za) * u;
    if (zz < 0.6) continue;
    const lx = P.px(out - side * 0.1, zz);
    const ly = P.py(h0 - 0.08, zz);
    const tx = P.px(out, zz);
    const ty = P.py(h0 + (h1 - h0) * 0.7, zz);
    const cone = m.createLinearGradient(lx, ly, tx, ty);
    cone.addColorStop(0, "rgba(255,240,220,0.35)");
    cone.addColorStop(1, "rgba(255,240,220,0)");
    const wd = Math.max(3, size * 0.08);
    m.fillStyle = cone;
    m.beginPath();
    m.moveTo(lx, ly);
    m.lineTo(tx - wd, ty);
    m.lineTo(tx + wd, ty);
    m.closePath();
    m.fill();
    m.fillStyle = "rgba(255,245,230,0.95)";
    m.fillRect(lx - 1.5, ly - 1.5, 3, 3);
  }
  m.globalCompositeOperation = "source-over";
  // 7) vidro: reflexo diagonal e chuva escorrendo na tela
  const g0 = P.px(out, zA);
  const g1 = P.px(out, zb);
  q([[out, zA + iz, h0 + ih], [out, zb - iz, h0 + ih], [out, zb - iz, h1 - ih], [out, zA + iz, h1 - ih]]);
  m.save();
  m.clip();
  const sheen = m.createLinearGradient(g0, by0, g1, by1);
  sheen.addColorStop(0, "rgba(255,255,255,0)");
  sheen.addColorStop(0.45, "rgba(255,255,255,0)");
  sheen.addColorStop(0.5, "rgba(255,255,255,0.12)");
  sheen.addColorStop(0.58, "rgba(255,255,255,0)");
  m.fillStyle = sheen;
  m.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
  m.strokeStyle = "rgba(220,235,255,0.22)";
  m.lineWidth = 1;
  m.beginPath();
  for (let k = 0; k < 14; k++) {
    const u = ((k * 0.618 + t * 0.03 * (1 + (k % 3))) % 1) * 0.96 + 0.02;
    const zz = za + (zb - za) * ((k * 0.37) % 1);
    const x = P.px(out, zz);
    const yA = P.py(h1 - (h1 - h0) * u, zz);
    m.moveTo(x, yA);
    m.lineTo(x, yA + Math.max(2, size * 0.04));
  }
  m.stroke();
  m.restore();
  // 8) luz no chão molhado embaixo
  m.globalCompositeOperation = "lighter";
  q([[out, zA, 0.02], [out, zb, 0.02], [side * 1.02, zb, 0.02], [side * 1.02, zA, 0.02]]);
  m.fillStyle = `rgba(${glow},0.1)`;
  m.fill();
  m.restore();
}

// calçada com meio-fio aceso
export function sidewalk(c: C, P: Proj, side: number, s: number, za: number, zb: number) {
  const zA = Math.max(0.4, za);
  if (zb < zA) return;
  const q = (pts: [number, number, number][]) => {
    c.beginPath();
    pts.forEach(([ss, zz, hh], i) => (i ? c.lineTo(P.px(ss, zz), P.py(hh, zz)) : c.moveTo(P.px(ss, zz), P.py(hh, zz))));
    c.closePath();
  };
  q([[side * 1.02, zA, 0.05], [side * 1.02, zb, 0.05], [s, zb, 0.05], [s, zA, 0.05]]);
  c.fillStyle = "#1a0f33";
  c.fill();
  // lajotas: linhas transversais
  c.strokeStyle = "rgba(160,120,255,0.18)";
  c.lineWidth = 1;
  c.beginPath();
  for (let z = Math.ceil(zA * 2) / 2; z < zb; z += 0.5) {
    c.moveTo(P.px(side * 1.02, z), P.py(0.05, z));
    c.lineTo(P.px(s, z), P.py(0.05, z));
  }
  c.stroke();
  // meio-fio
  c.beginPath();
  c.moveTo(P.px(side * 1.02, zA), P.py(0.05, zA));
  c.lineTo(P.px(side * 1.02, zb), P.py(0.05, zb));
  c.strokeStyle = "rgba(95,243,255,0.7)";
  c.lineWidth = 1.3;
  c.stroke();
}

// loja no térreo: vitrine acesa com prateleiras, toldo saindo da parede, placa em pixel e lanterna
export function storefront(c: C, P: Proj, side: number, s: number, za: number, zb: number, shop: number, t: number) {
  if (zb < 0.5) return;
  const zA = Math.max(0.45, za);
  const { img, rgb } = shopSign(shop);
  const q = (pts: [number, number, number][]) => {
    c.beginPath();
    pts.forEach(([ss, zz, hh], i) => (i ? c.lineTo(P.px(ss, zz), P.py(hh, zz)) : c.moveTo(P.px(ss, zz), P.py(hh, zz))));
    c.closePath();
  };
  // vitrine
  q([[s, zA, 0.1], [s, zb, 0.1], [s, zb, 0.95], [s, zA, 0.95]]);
  const flick = 0.5 + Math.sin(t * (1.3 + hash(shop) * 2)) * 0.06;
  c.fillStyle = `rgba(${rgb},${flick})`;
  c.fill();
  // prateleiras e silhuetas lá dentro
  c.fillStyle = "rgba(20,6,40,0.55)";
  for (const hh of [0.35, 0.6]) {
    q([[s, zA, hh], [s, zb, hh], [s, zb, hh + 0.04], [s, zA, hh + 0.04]]);
    c.fill();
  }
  // porta
  const zd = za + (zb - za) * 0.7;
  if (zd > 0.45) {
    q([[s, zd, 0.05], [s, zd + 0.25, 0.05], [s, zd + 0.25, 0.85], [s, zd, 0.85]]);
    c.fillStyle = "rgba(10,4,24,0.75)";
    c.fill();
  }
  // toldo saindo da parede
  const aw = s - side * 0.3;
  q([[s, zA, 1.15], [aw, zA, 1.0], [aw, zb, 1.0], [s, zb, 1.15]]);
  c.fillStyle = "#1e0f3c";
  c.fill();
  c.strokeStyle = `rgba(${rgb},0.9)`;
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(P.px(aw, zA), P.py(1.0, zA));
  c.lineTo(P.px(aw, zb), P.py(1.0, zb));
  c.stroke();
  // placa em pixel em cima do toldo (só quando não está colada na câmera)
  if (zA > 1.4) {
  c.save();
  c.imageSmoothingEnabled = false;
  const zE = Math.min(zb, zA + 1.2);
  if (side > 0) wallImage(c, img, P, s, zE, zA, 1.18, 1.45, 16);
  else wallImage(c, img, P, s, zA, zE, 1.18, 1.45, 16);
  c.restore();
  }
  // lanterna de papel vermelha balançando
  const zl = za + 0.2;
  if (zl > 0.5) {
    const sw = Math.sin(t * 1.4 + shop) * 0.04;
    const x = P.px(aw + side * 0.05 + sw, zl);
    const y = P.py(0.85, zl);
    const r = Math.max(1.5, 7 / zl);
    c.save();
    c.fillStyle = "#ff3a3a";
    c.shadowColor = "#ff3a3a";
    c.shadowBlur = 10;
    c.beginPath();
    c.ellipse(x, y, r * 0.8, r, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
}

// pedestres andando pela calçada, cada um no seu passo e direção (desenhados em resolução cheia,
// depois da pixelização, pra ter os detalhes; de longe ficam levemente borrados)
export function pedestrians(c: C, P: Proj, side: number, s: number, za: number, zb: number, seed: number, t: number) {
  void c;
  const n = Math.floor(hash(seed + 40) * 3.4);
  const len = zb - za;
  for (let i = 0; i < n; i++) {
    const ps = seed * 7 + i * 13;
    const dir = hash(ps) < 0.5 ? 1 : -1;
    const sp = 0.05 + hash(ps + 1) * 0.06;
    const stand = hash(ps + 2) < 0.2; // alguém parado olhando o celular
    const u = stand ? hash(ps + 3) : fract(hash(ps + 3) + (t * sp * dir) / Math.max(0.5, len));
    const z = za + u * len;
    if (z < 1.7) continue; // perto demais da câmera vira um gigante
    const lane = side * (1.12 + hash(ps + 4) * (Math.abs(s) - 1.25));
    const x = P.px(lane, z);
    const yb = P.py(0.05, z);
    const h = yb - P.py(1.3, z);
    const v = Math.floor(hash(ps + 5) * NPC_COUNT);
    const f = stand ? 0 : Math.floor(t * (5 + sp * 40) + i) % 4;
    const away = !stand && dir > 0;
    const img = npc(v, away, f); // indo embora = de costas
    // mãe empurrando o carrinho: o carrinho vai um pouco à frente, no sentido em que ela anda
    if (npcPushesStroller(v)) {
      const zs = z + (away ? 0.45 : -0.45);
      if (zs > 1.2) {
        const sx = P.px(lane, zs);
        const sb = P.py(0.05, zs);
        const sh = sb - P.py(0.62, zs);
        const st = stroller(v, away, f);
        const drawS = (m: C) => drawNPC(m, st, sx, sb, sh, STROLLER_W / STROLLER_H);
        if (away) {
          LATE.push(drawS); // mais longe: desenha antes dela
          LATE.push((m) => drawNPC(m, img, x, yb, h));
        } else {
          LATE.push((m) => drawNPC(m, img, x, yb, h));
          LATE.push(drawS);
        }
        continue;
      }
    }
    LATE.push((m) => drawNPC(m, img, x, yb, h));
  }
}
