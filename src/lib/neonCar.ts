// Superesportivo em cunha visto de trás (desenho original, sem marca):
// carroceria escura com contornos de neon, facetas low-poly, asa traseira,
// quatro lanternas e quatro escapamentos. É o carro do jogador na cena Synthwave
// e também o molde dos outros carros da pista (cockpit e jogo Outrun), só que
// em outras cores. Desenha com a base do carro em (0, 0), crescendo para cima.

export type CarPalette = {
  edge: string; // "r,g,b" do contorno principal (asa, traseira, tampa)
  trim: string; // "r,g,b" dos detalhes (cabine, entradas de ar, aros)
  body: [string, string, string]; // degradê da carroceria (de cima para baixo)
  glass: [string, string, string]; // vidro traseiro refletindo o céu
  deck: string; // "r,g,b" do brilho na tampa do motor
};

// o carro do jogador (rosa + ciano)
export const MY_CAR: CarPalette = {
  edge: "255,61,240",
  trim: "95,243,255",
  body: ["#2a1158", "#12062a", "#07020f"],
  glass: ["#1a2a7a", "#7a2bbf", "#ff5fae"],
  deck: "255,90,210",
};

// os outros carros da pista: mesmo desenho, outras cores
export const TRAFFIC: CarPalette[] = [
  { edge: "95,243,255", trim: "255,230,140", body: ["#0f2f5e", "#061a30", "#02070f"], glass: ["#0a1f4a", "#1f6fbf", "#5fffe0"], deck: "95,243,255" },
  { edge: "255,170,60", trim: "255,61,240", body: ["#4a2412", "#220c05", "#0c0402"], glass: ["#3a1a5a", "#bf4a7a", "#ffb35f"], deck: "255,170,60" },
  { edge: "120,255,150", trim: "95,243,255", body: ["#123a2a", "#061a12", "#020a06"], glass: ["#0a2a3a", "#2bbf8a", "#c8ff5f"], deck: "120,255,150" },
  { edge: "190,150,255", trim: "255,255,255", body: ["#2a1a5e", "#120a30", "#05030f"], glass: ["#1a1a6a", "#6a4abf", "#d0b0ff"], deck: "190,150,255" },
  { edge: "255,80,110", trim: "255,230,140", body: ["#4a0f22", "#22050f", "#0c0205"], glass: ["#3a0a3a", "#bf2b5a", "#ff8f6f"], deck: "255,80,110" },
];

type P = number[][];
const DECK: P = [[-0.5, -0.44], [-0.44, -0.62], [0.44, -0.62], [0.5, -0.44]];
const REAR: P = [[-0.5, -0.44], [0.5, -0.44], [0.47, -0.1], [-0.47, -0.1]];
const CABIN: P = [[-0.31, -0.62], [-0.19, -0.9], [0.19, -0.9], [0.31, -0.62]];
const GLASS: P = [[-0.26, -0.645], [-0.17, -0.87], [0.17, -0.87], [0.26, -0.645]];
const SCOOP_L: P = [[-0.47, -0.62], [-0.45, -0.72], [-0.33, -0.72], [-0.33, -0.62]];
const SCOOP_R: P = SCOOP_L.map(([x, y]) => [-x, y]);
const WING: P = [[-0.54, -0.93], [0.54, -0.93], [0.51, -0.87], [-0.51, -0.87]];
const STRUT_L: P = [[-0.26, -0.87], [-0.22, -0.87], [-0.2, -0.62], [-0.24, -0.62]];
const STRUT_R: P = STRUT_L.map(([x, y]) => [-x, y]);
// silhueta inteira (para carros bem pequenos, lá longe)
const SILHOUETTE: P = [
  [-0.47, -0.1], [-0.5, -0.44], [-0.44, -0.62], [-0.31, -0.62], [-0.19, -0.9], [0.19, -0.9],
  [0.31, -0.62], [0.44, -0.62], [0.5, -0.44], [0.47, -0.1],
];
// facetas (linhas internas do low-poly)
const FACETS: P[] = [
  [[-0.5, -0.44], [-0.2, -0.62]], [[0.5, -0.44], [0.2, -0.62]],
  [[-0.2, -0.62], [0, -0.44]], [[0.2, -0.62], [0, -0.44]],
  [[-0.47, -0.1], [-0.3, -0.27]], [[0.47, -0.1], [0.3, -0.27]],
  [[-0.31, -0.62], [-0.44, -0.62]], [[-0.19, -0.9], [-0.31, -0.62]],
];

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function poly(c: CanvasRenderingContext2D, pts: P, cw: number, ch: number) {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x * cw, y * ch) : c.moveTo(x * cw, y * ch)));
  c.closePath();
}

export type CarOpts = {
  palette?: CarPalette;
  brake?: number; // 0..1: lanternas mais fortes
  t?: number; // tempo (anima reflexos)
  flame?: boolean; // fogo no escapamento (acelerando forte)
};

// carroceria na origem; cw = largura em px, ch = altura em px
export function drawCarBody(c: CanvasRenderingContext2D, cw: number, ch: number, o: CarOpts = {}) {
  const pal = o.palette ?? MY_CAR;
  const brake = o.brake ?? 0;
  const t = o.t ?? 0;
  // escala das linhas: o desenho original foi feito para ~300 px de largura
  const k = Math.max(0.35, Math.min(1, cw / 260));

  // muito longe: só a silhueta com contorno e as lanternas
  if (cw < 46) {
    c.fillStyle = pal.body[1];
    poly(c, SILHOUETTE, cw, ch);
    c.fill();
    c.save();
    c.globalCompositeOperation = "lighter";
    c.strokeStyle = `rgba(${pal.edge},0.9)`;
    c.lineWidth = Math.max(0.6, cw / 40);
    c.stroke();
    c.fillStyle = `rgba(255,42,79,${0.75 + brake * 0.25})`;
    c.fillRect(-cw * 0.45, -ch * 0.4, cw * 0.24, ch * 0.1);
    c.fillRect(cw * 0.21, -ch * 0.4, cw * 0.24, ch * 0.1);
    c.restore();
    return;
  }

  // pneus largos com aro de neon
  for (const side of [-1, 1]) {
    c.fillStyle = "#05020c";
    roundRect(c, side > 0 ? cw * 0.3 : -cw * 0.5, -ch * 0.27, cw * 0.2, ch * 0.27, 5 * k);
    c.fill();
    c.strokeStyle = `rgba(${pal.trim},0.75)`;
    c.lineWidth = 1.5 * k;
    c.beginPath();
    c.ellipse(side * cw * 0.4, -ch * 0.135, cw * 0.075, ch * 0.1, 0, Math.PI * 0.9, Math.PI * 2.1);
    c.stroke();
  }

  // carroceria escura refletindo o céu
  const dark = c.createLinearGradient(0, -ch * 0.95, 0, 0);
  dark.addColorStop(0, pal.body[0]);
  dark.addColorStop(0.45, pal.body[1]);
  dark.addColorStop(1, pal.body[2]);
  c.fillStyle = dark;
  for (const shape of [REAR, DECK, CABIN, SCOOP_L, SCOOP_R]) {
    poly(c, shape, cw, ch);
    c.fill();
  }
  // tampa do motor pega a cor do horizonte
  const deck = c.createLinearGradient(0, -ch * 0.62, 0, -ch * 0.44);
  deck.addColorStop(0, `rgba(${pal.deck},0.45)`);
  deck.addColorStop(1, `rgba(${pal.deck},0.03)`);
  c.fillStyle = deck;
  poly(c, DECK, cw, ch);
  c.fill();

  // vidro traseiro com a grade refletida
  const glass = c.createLinearGradient(0, -ch * 0.87, 0, -ch * 0.645);
  glass.addColorStop(0, pal.glass[0]);
  glass.addColorStop(0.55, pal.glass[1]);
  glass.addColorStop(1, pal.glass[2]);
  c.fillStyle = glass;
  poly(c, GLASS, cw, ch);
  c.fill();
  c.save();
  poly(c, GLASS, cw, ch);
  c.clip();
  c.strokeStyle = `rgba(${pal.trim},0.35)`;
  c.lineWidth = k;
  for (let i = 0; i < 4; i++) {
    const y = -ch * (0.66 + i * 0.035 + ((t * 0.4) % 1) * 0.035);
    c.beginPath();
    c.moveTo(-cw * 0.3, y);
    c.lineTo(cw * 0.3, y);
    c.stroke();
  }
  c.strokeStyle = "rgba(255,255,255,0.4)";
  c.lineWidth = 2 * k;
  c.beginPath();
  c.moveTo(-cw * 0.08, -ch * 0.87);
  c.lineTo(-cw * 0.15, -ch * 0.65);
  c.stroke();
  c.restore();

  // grade de ventilação entre as lanternas
  c.strokeStyle = `rgba(${pal.edge},0.35)`;
  c.lineWidth = k;
  for (let i = 0; i < 4; i++) {
    const y = -ch * (0.24 - i * 0.03);
    c.beginPath();
    c.moveTo(-cw * 0.3, y);
    c.lineTo(cw * 0.3, y);
    c.stroke();
  }

  // facetas low-poly bem fracas
  c.strokeStyle = `rgba(${pal.trim},0.28)`;
  c.lineWidth = k;
  c.beginPath();
  for (const [[x1, y1], [x2, y2]] of FACETS) {
    c.moveTo(x1 * cw, y1 * ch);
    c.lineTo(x2 * cw, y2 * ch);
    c.moveTo(-x1 * cw, y1 * ch);
    c.lineTo(-x2 * cw, y2 * ch);
  }
  c.stroke();

  // asa traseira com suportes
  c.fillStyle = pal.body[2];
  for (const shape of [STRUT_L, STRUT_R, WING]) {
    poly(c, shape, cw, ch);
    c.fill();
  }

  // contornos de neon: halo largo + linha fina e clara, somando luz com o fundo
  c.save();
  c.globalCompositeOperation = "lighter";
  c.lineJoin = "round";
  const edges: [P, string][] = [
    [WING, pal.edge],
    [STRUT_L, pal.edge],
    [STRUT_R, pal.edge],
    [CABIN, pal.trim],
    [DECK, pal.edge],
    [REAR, pal.edge],
    [SCOOP_L, pal.trim],
    [SCOOP_R, pal.trim],
  ];
  for (const [shape, rgb] of edges) {
    poly(c, shape, cw, ch);
    c.strokeStyle = `rgba(${rgb},0.22)`;
    c.lineWidth = 7 * k;
    c.stroke();
    c.strokeStyle = `rgba(${rgb},0.95)`;
    c.lineWidth = 1.6 * k;
    c.stroke();
  }
  c.restore();

  // quatro lanternas (acendem forte quando freia) ligadas por um filete
  const on = 0.8 + brake * 0.2;
  c.save();
  c.shadowColor = "#ff2a4f";
  c.shadowBlur = (16 + brake * 18) * k;
  c.fillStyle = `rgba(255, 42, 79, ${on})`;
  for (const x of [-0.45, -0.33, 0.22, 0.34]) {
    roundRect(c, cw * x, -ch * 0.4, cw * 0.11, ch * 0.09, 2 * k);
    c.fill();
  }
  c.fillRect(-cw * 0.22, -ch * 0.365, cw * 0.44, ch * 0.018);
  c.restore();
  c.fillStyle = "rgba(255,200,210,0.9)";
  for (const x of [-0.44, -0.32, 0.23, 0.35]) c.fillRect(cw * x, -ch * 0.37, cw * 0.09, ch * 0.02);

  // difusor e quatro escapamentos
  c.fillStyle = "#05020c";
  roundRect(c, -cw * 0.32, -ch * 0.13, cw * 0.64, ch * 0.08, 3 * k);
  c.fill();
  for (const x of [-0.2, -0.12, 0.12, 0.2]) {
    c.beginPath();
    c.arc(cw * x, -ch * 0.09, ch * 0.028, 0, Math.PI * 2);
    c.fillStyle = "#d9c8ff";
    c.fill();
    c.beginPath();
    c.arc(cw * x, -ch * 0.09, ch * 0.016, 0, Math.PI * 2);
    c.fillStyle = `rgba(255,140,60,${0.4 + Math.random() * 0.3})`;
    c.fill();
    if (o.flame && Math.random() < 0.6) {
      // labareda azul-rosa saindo do escapamento
      const fl = c.createRadialGradient(cw * x, -ch * 0.09, 0, cw * x, -ch * 0.09, ch * 0.09);
      fl.addColorStop(0, "rgba(180,220,255,0.9)");
      fl.addColorStop(0.5, "rgba(255,61,240,0.5)");
      fl.addColorStop(1, "rgba(255,61,240,0)");
      c.fillStyle = fl;
      c.beginPath();
      c.arc(cw * x, -ch * 0.09, ch * 0.09, 0, Math.PI * 2);
      c.fill();
    }
  }
}

// carro completo: luz neon embaixo, reflexo no chão e a carroceria
export function drawNeonCar(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  cw: number,
  o: CarOpts & { tilt?: number; reflection?: boolean } = {},
) {
  const ch = cw * 0.46;
  const pal = o.palette ?? MY_CAR;
  const t = o.t ?? 0;
  c.save();
  c.translate(x, y);
  if (o.tilt) c.rotate(o.tilt);
  const glow = c.createRadialGradient(0, 0, 0, 0, 0, cw * 0.8);
  glow.addColorStop(0, `rgba(${pal.edge}, ${0.55 + Math.sin(t * 4) * 0.1})`);
  glow.addColorStop(0.5, `rgba(${pal.trim}, 0.18)`);
  glow.addColorStop(1, `rgba(${pal.edge}, 0)`);
  c.fillStyle = glow;
  c.beginPath();
  c.ellipse(0, 0, cw * 0.8, ch * 0.28, 0, 0, Math.PI * 2);
  c.fill();
  if (o.reflection !== false && cw >= 46) {
    c.save();
    c.globalAlpha = 0.22;
    c.scale(1, -0.45);
    drawCarBody(c, cw, ch, o);
    c.restore();
  }
  drawCarBody(c, cw, ch, o);
  c.restore();
}
