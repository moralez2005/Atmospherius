// Papel de parede do Frutiger Aero: um parque em 3D com bonecos de vidro líquido espalhados
// fazendo coisas: ping-pong, piquenique, um casal no banco do lago, alguém soprando bolhas de
// sabão (clique nelas pra estourar), alguém empinando pipa e outro sentado no alto da colina
// olhando o horizonte, além de quem passeia. No meio, uma fonte; no lago, um peixe que pula de
// vez em quando. O parque segue o relógio: manhã azul, fim de tarde dourado e noite com postes
// acesos e vaga-lumes. Os bonecos acenam quando o mouse passa perto.
//
// Versão leve: tudo é feito de polígonos (WebGL 1, sem bibliotecas), igual a um jogo. A versão
// anterior calculava a cena pixel por pixel (raymarching) e derrubava o driver de vídeo até em
// PC bom. Truques pra parecer com ela sem pesar:
// - o vidro dos bonecos "refrata" lendo a imagem do parque já desenhada, um pouco deslocada;
// - o lago reflete o parque desenhado de cabeça pra baixo numa imagem pequena;
// - as sombras são manchas suaves no gramado (sem cálculo de sombra de verdade);
// - limite de 30 quadros por segundo e resolução que se ajusta sozinha.

import { sfx } from "./uiSound";
import { NPCS, PLAYER_TINT, WATER_TINT } from "./aeroNpcs";

type V3 = [number, number, number];

/* ---------- terreno (o mesmo pros desenhos e pra posicionar as coisas no chão) ---------- */
const pondD = (x: number, z: number) => Math.hypot((x + 4.5) * 0.8, (z - 11) * 1.5);
const ss = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
function H(x: number, z: number) {
  let h = 0.25 * Math.sin(x * 0.22 + 1) * Math.cos(z * 0.18) + 0.12 * Math.sin(x * 0.5 + z * 0.4);
  h += 3.2 * Math.exp(-((x - 7) ** 2 + (z - 15) ** 2) / 38);
  h += 1.6 * Math.exp(-((x + 14) ** 2 + (z - 24) ** 2) / 80);
  h -= 1.4 * ss(7, 2, pondD(x, z));
  return h;
}
const WATER = -0.55;

/* ---------- os bonecos (posição, virada, pose) ---------- */
// pose: 0 raquete, 1 sentado, 2 andando, 3 em pé (bolhas / pipa)
type Fig = { x: number; z: number; ry: number; pose: number; ph: number; dy?: number };
const BENCH: [number, number] = [-1.85, 8.85];
const FIGS: Fig[] = [
  { x: -3.4, z: 0.6, ry: 0, pose: 0, ph: 0 },
  { x: -3.4, z: 5.4, ry: Math.PI, pose: 0, ph: 1 },
  { x: 2.0, z: 2.3, ry: Math.PI - 0.9, pose: 1, ph: 0 },
  { x: 3.3, z: 2.2, ry: Math.PI + 0.8, pose: 1, ph: 2 },
  { x: 7.0, z: 15, ry: Math.PI, pose: 1, ph: 3 }, // no alto da colina
  { x: 0, z: 8, ry: Math.PI / 2, pose: 2, ph: 4 }, // passeando (x muda com o tempo)
  { x: 5.6, z: 4.8, ry: Math.PI / 2 + 0.4, pose: 3, ph: 5 }, // soprando bolhas
  { x: -2.15, z: 9.1, ry: -2.2, pose: 1, ph: 6, dy: 0.05 }, // casal no banco do lago
  { x: -1.55, z: 8.55, ry: -2.2, pose: 1, ph: 7, dy: 0.05 },
  { x: 9.6, z: 13, ry: Math.PI - 0.3, pose: 3, ph: 8 }, // empinando pipa
];
const WALK_Z = 8;
const walkX = (t: number) => -1 + ((t * 0.6) % 10) - 5;
const figGround = (i: number, x: number, z: number) => (i >= 7 && i <= 8 ? H(BENCH[0], BENCH[1]) + 0.05 : H(x, z));

/* ---------- bolhas de sabão ---------- */
type Bubble = { x: number; y: number; z: number; r: number; born: number; vx: number; vz: number; ph: number };
const MAX_B = 10;

/* ---------- vetores ---------- */
function sub(a: V3, b: V3): V3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function add(a: V3, b: V3): V3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function mul(a: V3, s: number): V3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}
function dot(a: V3, b: V3) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function cross(a: V3, b: V3): V3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function norm(a: V3): V3 {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}
// mesma rotação do desenho antigo: "local" → mundo, girando ry em volta do eixo y
function toWorld(l: V3, at: V3, ry: number): V3 {
  const c = Math.cos(ry), s = Math.sin(ry);
  return [at[0] + l[0] * c + l[2] * s, at[1] + l[1], at[2] - l[0] * s + l[2] * c];
}

/* ---------- montagem das malhas ---------- */
// vértice: posição (3), normal (3), cor (3), material (1)
// materiais: 0 comum, 1 grama, 2 mesa de ping-pong, 3 toalha xadrez, 4 lâmpada, 5 pipa, 6 copa das árvores, 7 brilhante
const STRIDE = 10;
class Geo {
  v: number[] = [];
  col: V3 = [1, 1, 1];
  mat = 0;
  vert(p: V3, n: V3) {
    this.v.push(p[0], p[1], p[2], n[0], n[1], n[2], this.col[0], this.col[1], this.col[2], this.mat);
  }
  // superfície paramétrica u×v → triângulos (f devolve ponto e normal)
  surf(nu: number, nv: number, f: (u: number, v: number) => [V3, V3]) {
    const g: [V3, V3][][] = [];
    for (let i = 0; i <= nu; i++) {
      g.push([]);
      for (let j = 0; j <= nv; j++) g[i].push(f(i / nu, j / nv));
    }
    for (let i = 0; i < nu; i++)
      for (let j = 0; j < nv; j++) {
        const a = g[i][j], b = g[i + 1][j], c = g[i + 1][j + 1], d = g[i][j + 1];
        this.vert(a[0], a[1]); this.vert(b[0], b[1]); this.vert(c[0], c[1]);
        this.vert(a[0], a[1]); this.vert(c[0], c[1]); this.vert(d[0], d[1]);
      }
  }
  ellipsoid(c: V3, r: V3, nu = 12, nv = 8, rot?: (p: V3) => V3) {
    const R = rot ?? ((p: V3) => p);
    this.surf(nu, nv, (u, v) => {
      const th = v * Math.PI, ph = u * Math.PI * 2;
      const d: V3 = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
      const p = R([d[0] * r[0], d[1] * r[1], d[2] * r[2]]);
      const n = R(norm([d[0] / r[0], d[1] / r[1], d[2] / r[2]]));
      return [add(c, p), n];
    });
  }
  sphere(c: V3, r: number, nu = 12, nv = 8) {
    this.ellipsoid(c, [r, r, r], nu, nv);
  }
  // cilindro de a até b
  cyl(a: V3, b: V3, r: number, sides = 8, caps = false) {
    const ax = norm(sub(b, a));
    const t0 = norm(cross(Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], ax));
    const t1 = cross(ax, t0);
    this.surf(sides, 1, (u, v) => {
      const ph = u * Math.PI * 2;
      const n = add(mul(t0, Math.cos(ph)), mul(t1, Math.sin(ph)));
      return [add(v < 0.5 ? a : b, mul(n, r)), n];
    });
    if (caps)
      for (const [c, s] of [[a, -1], [b, 1]] as [V3, number][])
        this.surf(sides, 1, (u, v) => {
          const ph = u * Math.PI * 2;
          const n = add(mul(t0, Math.cos(ph)), mul(t1, Math.sin(ph)));
          return [add(c, mul(n, r * (1 - v))), mul(ax, s)];
        });
  }
  // cápsula: cilindro com bolas nas pontas
  cap(a: V3, b: V3, r: number, fine = false) {
    const s = fine ? 10 : 7;
    this.cyl(a, b, r, s);
    this.sphere(a, r, s, fine ? 6 : 4);
    this.sphere(b, r, s, fine ? 6 : 4);
  }
  // caixa com cantos retos, girada ry em volta do y (mesma convenção dos bonecos)
  box(c: V3, h: V3, ry = 0) {
    const F: [V3, V3, V3][] = [
      [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
      [[-1, 0, 0], [0, 1, 0], [0, 0, -1]],
      [[0, 1, 0], [0, 0, 1], [1, 0, 0]],
      [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
      [[0, 0, 1], [1, 0, 0], [0, 1, 0]],
      [[0, 0, -1], [0, 1, 0], [1, 0, 0]],
    ];
    const W = (l: V3) => toWorld([l[0] * h[0], l[1] * h[1], l[2] * h[2]], c, ry);
    const N = (l: V3) => sub(toWorld(l, [0, 0, 0], ry), [0, 0, 0]);
    for (const [n, a, b] of F) {
      const q = (s: number, t: number) => W(add(n, add(mul(a, s), mul(b, t))));
      const nn = N(n);
      const p00 = q(-1, -1), p10 = q(1, -1), p11 = q(1, 1), p01 = q(-1, 1);
      this.vert(p00, nn); this.vert(p10, nn); this.vert(p11, nn);
      this.vert(p00, nn); this.vert(p11, nn); this.vert(p01, nn);
    }
  }
  torus(c: V3, R: number, r: number, nu = 28, nv = 8) {
    this.surf(nu, nv, (u, v) => {
      const a = u * Math.PI * 2, b = v * Math.PI * 2;
      const n: V3 = [Math.cos(b) * Math.cos(a), Math.sin(b), Math.cos(b) * Math.sin(a)];
      return [[c[0] + (R + r * Math.cos(b)) * Math.cos(a), c[1] + r * Math.sin(b), c[2] + (R + r * Math.cos(b)) * Math.sin(a)], n];
    });
  }
  // anel (parede cilíndrica com espessura)
  ring(c: V3, r0: number, r1: number, y0: number, y1: number, nu = 28) {
    const side = (r: number, s: number) =>
      this.surf(nu, 1, (u, v) => {
        const a = u * Math.PI * 2;
        const n: V3 = [Math.cos(a) * s, 0, Math.sin(a) * s];
        return [[c[0] + Math.cos(a) * r, c[1] + (v < 0.5 ? y0 : y1), c[2] + Math.sin(a) * r], n];
      });
    side(r1, 1);
    side(r0, -1);
    this.surf(nu, 1, (u, v) => {
      const a = u * Math.PI * 2, r = r0 + (r1 - r0) * v;
      return [[c[0] + Math.cos(a) * r, c[1] + y1, c[2] + Math.sin(a) * r], [0, 1, 0]];
    });
  }
}

/* ---------- o boneco de vidro: uma peça só, lisa, "derretida" nas juntas ---------- */
// O boneco é descrito como na versão antiga (cápsulas que se fundem suavemente) e a superfície
// é calculada uma vez no processador (surface nets) e guardada pronta. Na hora de desenhar a placa
// de vídeo só pinta triângulos, então fica liso sem pesar.
type Part = number[]; // ax, ay, az, bx, by, bz, raio, suavidade da junta
function figureParts(pose: number, wave: number, wig: number, sw: number): Part[] {
  const sit = pose === 1 ? 1 : 0;
  const y0 = sit ? -0.42 : 0;
  const P: Part[] = [];
  const cap = (a: V3, b: V3, r: number, k: number) => P.push([a[0], a[1], a[2], b[0], b[1], b[2], r, k]);
  cap([0, 1.55 + y0, 0], [0, 1.55 + y0, 0], 0.2, 0); // cabeça
  cap([0, 0.72 + y0, 0], [0, 1.18 + y0, 0], 0.2, 0.08); // tronco
  const hip: V3 = [0, 0.72 + y0, 0];
  for (const s of [-1, 1]) {
    let knee: V3, foot: V3;
    if (sit) {
      knee = add(hip, [s * 0.12, 0.05, 0.42]);
      foot = add(knee, [0, -0.4, 0.12]);
    } else {
      knee = add(hip, [s * 0.11, -0.36, s * sw * 0.4]);
      foot = add(knee, [0, -0.34, -s * sw * 0.15]);
    }
    cap(add(hip, [s * 0.1, 0, 0]), knee, 0.085, 0.05);
    cap(knee, foot, 0.075, 0.04);
    const sh: V3 = [s * 0.24, 1.08 + y0, 0];
    let el: V3, hd: V3;
    if (s === 1 && wave > 0.02) {
      el = add(sh, [0.16, 0.18 * wave, 0]);
      hd = add(el, [0.08 + 0.08 * wig * wave, 0.26 * wave, 0.02]);
    } else if (pose === 0 && s === 1) {
      el = add(sh, [0.18, -0.12, 0.22]);
      hd = add(el, [0.05, 0.05, 0.22]);
    } else if (pose === 3 && s === 1) {
      el = add(sh, [0.12, 0.12, 0.16]);
      hd = add(el, [0.04, 0.14, 0.18]);
    } else if (sit) {
      el = add(sh, [s * 0.06, -0.28, 0.12]);
      hd = add(el, [0, -0.12, 0.22]);
    } else {
      el = add(sh, [s * 0.05, -0.3, -s * sw * 0.3]);
      hd = add(el, [0, -0.28, s * sw * 0.25]);
    }
    cap(sh, el, 0.07, 0.05);
    cap(el, hd, 0.06, 0.04);
  }
  return P;
}
function partsSDF(P: Part[], x: number, y: number, z: number) {
  let d = 1e9;
  for (let i = 0; i < P.length; i++) {
    const q = P[i];
    const pax = x - q[0], pay = y - q[1], paz = z - q[2];
    const bax = q[3] - q[0], bay = q[4] - q[1], baz = q[5] - q[2];
    const bb = bax * bax + bay * bay + baz * baz;
    const h = bb > 0 ? Math.max(0, Math.min(1, (pax * bax + pay * bay + paz * baz) / bb)) : 0;
    const dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h;
    const e = Math.sqrt(dx * dx + dy * dy + dz * dz) - q[6];
    const k = q[7];
    if (i === 0 || k <= 0) d = Math.min(d, e);
    else {
      const t = Math.max(0, Math.min(1, 0.5 + (0.5 * (e - d)) / k));
      d = e + (d - e) * t - k * t * (1 - t); // junta suave (smin)
    }
  }
  return d;
}
// superfície da forma (surface nets): vértices com normal suave + índices
type Shape = { v: Float32Array; i: Uint16Array };
function meshParts(P: Part[], cell = 0.034): Shape {
  let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
  for (const q of P) {
    const r = q[6] + 0.08;
    x0 = Math.min(x0, q[0] - r, q[3] - r); x1 = Math.max(x1, q[0] + r, q[3] + r);
    y0 = Math.min(y0, q[1] - r, q[4] - r); y1 = Math.max(y1, q[1] + r, q[4] + r);
    z0 = Math.min(z0, q[2] - r, q[5] - r); z1 = Math.max(z1, q[2] + r, q[5] + r);
  }
  const nx = Math.ceil((x1 - x0) / cell) + 1, ny = Math.ceil((y1 - y0) / cell) + 1, nz = Math.ceil((z1 - z0) / cell) + 1;
  const val = new Float32Array(nx * ny * nz);
  const id = (i: number, j: number, k: number) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) val[id(i, j, k)] = partsSDF(P, x0 + i * cell, y0 + j * cell, z0 + k * cell);
  const cid = new Int32Array(nx * ny * nz).fill(-1);
  const out: number[] = [];
  let nv = 0;
  const C = [0, 1, 2, 3, 4, 5, 6, 7].map((b) => [b & 1, (b >> 1) & 1, (b >> 2) & 1]);
  const E: [number, number][] = [];
  for (let a = 0; a < 8; a++) for (const bit of [1, 2, 4]) if (!(a & bit)) E.push([a, a | bit]);
  const cv = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++)
    for (let j = 0; j < ny - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        let mask = 0;
        for (let c = 0; c < 8; c++) {
          cv[c] = val[id(i + C[c][0], j + C[c][1], k + C[c][2])];
          if (cv[c] < 0) mask |= 1 << c;
        }
        if (mask === 0 || mask === 255) continue;
        let sx = 0, sy = 0, sz = 0, n = 0;
        for (const [a, b] of E) {
          const va = cv[a], vb = cv[b];
          if (va < 0 === vb < 0) continue;
          const t = va / (va - vb);
          sx += C[a][0] + (C[b][0] - C[a][0]) * t;
          sy += C[a][1] + (C[b][1] - C[a][1]) * t;
          sz += C[a][2] + (C[b][2] - C[a][2]) * t;
          n++;
        }
        const px = x0 + (i + sx / n) * cell, py = y0 + (j + sy / n) * cell, pz = z0 + (k + sz / n) * cell;
        const e = 0.004;
        const gx = partsSDF(P, px + e, py, pz) - partsSDF(P, px - e, py, pz);
        const gy = partsSDF(P, px, py + e, pz) - partsSDF(P, px, py - e, pz);
        const gz = partsSDF(P, px, py, pz + e) - partsSDF(P, px, py, pz - e);
        const gl = Math.hypot(gx, gy, gz) || 1;
        out.push(px, py, pz, gx / gl, gy / gl, gz / gl, 1, 1, 1, 0);
        cid[id(i, j, k)] = nv++;
      }
  const idx: number[] = [];
  const quad = (a: number, b: number, c: number, d: number) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    idx.push(a, b, c, a, c, d);
  };
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const v = val[id(i, j, k)] < 0;
        if (i < nx - 1 && j > 0 && k > 0 && v !== val[id(i + 1, j, k)] < 0)
          quad(cid[id(i, j - 1, k - 1)], cid[id(i, j, k - 1)], cid[id(i, j, k)], cid[id(i, j - 1, k)]);
        if (j < ny - 1 && i > 0 && k > 0 && v !== val[id(i, j + 1, k)] < 0)
          quad(cid[id(i - 1, j, k - 1)], cid[id(i, j, k - 1)], cid[id(i, j, k)], cid[id(i - 1, j, k)]);
        if (k < nz - 1 && i > 0 && j > 0 && v !== val[id(i, j, k + 1)] < 0)
          quad(cid[id(i - 1, j - 1, k)], cid[id(i, j - 1, k)], cid[id(i, j, k)], cid[id(i - 1, j, k)]);
      }
  return { v: new Float32Array(out), i: new Uint16Array(idx) };
}

/* ---------- o parque parado (montado uma vez só) ---------- */
function buildPark() {
  const g = new Geo();
  // terreno: grade mais fina perto da câmera, mais grossa lá longe
  g.mat = 1;
  g.col = [0.4, 0.75, 0.18];
  const xs: number[] = [], zs: number[] = [];
  for (let i = 0; i <= 90; i++) xs.push(-70 + (140 * i) / 90);
  for (let z = -9; z < 90; ) {
    zs.push(z);
    z += z < 20 ? 0.6 : z < 40 ? 1.2 : 2.5;
  }
  const tn = (x: number, z: number): V3 => {
    const e = 0.05;
    return norm([H(x - e, z) - H(x + e, z), 2 * e, H(x, z - e) - H(x, z + e)]);
  };
  for (let j = 0; j < zs.length - 1; j++)
    for (let i = 0; i < xs.length - 1; i++) {
      const P = (a: number, b: number): [V3, V3] => [[xs[a], H(xs[a], zs[b]), zs[b]], tn(xs[a], zs[b])];
      const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1);
      g.vert(...a); g.vert(...b); g.vert(...c);
      g.vert(...a); g.vert(...c); g.vert(...d);
    }
  g.mat = 0;

  // mesa de ping-pong
  const tY = H(-3.4, 3);
  g.mat = 2;
  g.col = [0.05, 0.42, 0.32];
  g.box([-3.4, tY + 0.76, 3], [0.77, 0.04, 1.38]);
  g.mat = 0;
  g.col = [0.2, 0.25, 0.25];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.box([-3.4 + sx * 0.6, tY + 0.38, 3 + sz * 1.1], [0.03, 0.38, 0.03]);
  g.col = [0.9, 0.9, 0.9];
  g.box([-3.4, tY + 0.86, 3], [0.82, 0.07, 0.008]);
  // piquenique: toalha xadrez e cesta
  const pY = H(2.6, 2);
  g.mat = 3;
  g.col = [1, 1, 1];
  g.box([2.6, pY + 0.02, 2], [1.1, 0.012, 0.8]);
  g.mat = 0;
  g.col = [0.75, 0.55, 0.3];
  g.box([2.75, pY + 0.17, 2.1], [0.24, 0.15, 0.17]);
  g.cyl([2.52, pY + 0.32, 2.1], [2.98, pY + 0.32, 2.1], 0.025, 6);

  // fonte (pedra branca)
  const fY = H(1, 12);
  g.col = [0.95, 0.97, 1];
  g.mat = 7;
  g.torus([1, fY + 0.32, 12], 1.35, 0.12);
  g.ring([1, fY, 12], 1.25, 1.45, -0.1, 0.33);
  g.cyl([1, fY, 12], [1, fY + 0.95, 12], 0.12, 12);
  g.ring([1, fY + 0.9, 12], 0.45, 0.55, 0, 0.1, 20);
  g.cyl([1, fY + 0.9, 12], [1, fY + 0.91, 12], 0.5, 20, true);
  g.mat = 0;

  // banco na beira do lago
  const bY = H(BENCH[0], BENCH[1]);
  const bAt: V3 = [BENCH[0], bY, BENCH[1]];
  g.col = [0.55, 0.35, 0.2];
  g.box(toWorld([0, 0.42, 0], bAt, -2.2), [0.8, 0.03, 0.2], -2.2);
  g.box(toWorld([0, 0.7, -0.2], bAt, -2.2), [0.8, 0.15, 0.02], -2.2);
  for (const s of [-1, 1]) g.box(toWorld([s * 0.7, 0.2, 0], bAt, -2.2), [0.03, 0.2, 0.18], -2.2);

  // postes de luz
  for (const [x, z] of LAMPS) {
    const y = H(x, z);
    g.col = [0.85, 0.9, 0.95];
    g.mat = 7;
    g.cyl([x, y, z], [x, y + 2.3, z], 0.07, 8);
    g.mat = 4;
    g.col = [1, 0.95, 0.8];
    g.sphere([x, y + 2.45, z], 0.18, 12, 8);
  }
  g.mat = 0;

  // árvores redondas e brilhantes
  TREES.forEach(([x, z, sc]) => {
    const y = H(x, z);
    g.col = [0.45, 0.3, 0.18];
    g.mat = 0;
    g.cyl([x, y - 0.2, z], [x, y + 2 * sc, z], 0.18 * sc, 8);
    g.mat = 6;
    g.col = [0.3, 0.7, 0.15];
    g.sphere([x, y + 2.6 * sc, z], 1.25 * sc, 18, 12);
    g.sphere([x + 0.7 * sc, y + 2.2 * sc, z + 0.2], 0.8 * sc, 14, 10);
    g.sphere([x - 0.7 * sc, y + 2.3 * sc, z - 0.1], 0.85 * sc, 14, 10);
  });
  g.mat = 0;
  return g.v;
}
const LAMPS: [number, number][] = [[-0.8, 5.5], [4.2, 8]];
const TREES: [number, number, number][] = [[-9, 9, 1], [11, 7, 1], [4.5, 19, 1], [-2.5, 13.5, 0.8], [-12, 16, 1], [-22, 30, 1.3], [20, 26, 1.2]];

// água da fonte (vidro): coluna e arcos caindo na bacia
function buildFountainWater() {
  const g = new Geo();
  const c: V3 = [1, H(1, 12), 12];
  g.cap(add(c, [0, 0.95, 0]), add(c, [0, 1.55, 0]), 0.05);
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3;
    const pts: V3[] = [];
    for (let i = 0; i <= 8; i++) {
      const s = (0.95 * i) / 8;
      pts.push(add(c, [Math.cos(a) * s, 1.5 + 0.7 * s - 2.4 * s * s, Math.sin(a) * s]));
    }
    for (let i = 0; i < 8; i++) g.cyl(pts[i], pts[i + 1], 0.035, 6);
  }
  g.cyl(add(c, [0, 0.28, 0]), add(c, [0, 0.32, 0]), 1.25, 28, true);
  return g.v;
}

// lago: elipse na altura da água
function buildPond() {
  const g = new Geo();
  g.surf(40, 6, (u, v) => {
    const a = u * Math.PI * 2, r = v * 5.6;
    return [[-4.5 + (Math.cos(a) * r) / 0.8, WATER, 11 + (Math.sin(a) * r) / 1.5], [0, 1, 0]];
  });
  return g.v;
}

/* ---------- shaders ---------- */
const COMMON = `
precision highp float;
uniform float T, DAY, DUSK;
uniform vec3 SUN, EYE;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p*=2.03;a*=.5;}return v;}
// céu sem nuvens (reflexos)
vec3 skyc(vec3 rd){
  float y=max(rd.y,0.);
  vec3 dayc=mix(vec3(.8,.95,1.),vec3(.0,.42,.95),pow(y,.42));
  vec3 duskc=mix(vec3(1.,.62,.35),vec3(.35,.3,.7),pow(y,.5));
  vec3 nightc=mix(vec3(.08,.12,.3),vec3(.01,.02,.08),pow(y,.5));
  vec3 c=mix(nightc,dayc,DAY);
  c=mix(c,duskc,DUSK*.85);
  float s=max(dot(rd,SUN),0.);
  c+=mix(vec3(1.,.97,.85),vec3(1.,.6,.3),DUSK)*(pow(s,600.)*4.+pow(s,12.)*.35)*max(DAY,DUSK);
  return c;
}
vec3 fogc(){return mix(vec3(.12,.16,.3),mix(vec3(.8,.93,1.),vec3(1.,.8,.7),DUSK),max(DAY,DUSK));}
vec3 tone(vec3 c){c=1.-exp(-c*1.9);return mix(vec3(dot(c,vec3(.3,.59,.11))),c,1.3);}
vec3 untone(vec3 c){c=clamp(c,0.,.985);return -log(1.-c)/1.9;}
`;

const VS_MESH = `
attribute vec3 aP, aN, aC; attribute float aM;
uniform mat4 VP; uniform float MIR, WATERY;
uniform vec4 MO; // onde fica e pra onde vira (bonecos); zero = já está no lugar
varying vec3 vP, vN, vC; varying float vM;
void main(){
  float c=cos(MO.w), s=sin(MO.w);
  vP=vec3(aP.x*c+aP.z*s,aP.y,-aP.x*s+aP.z*c)+MO.xyz;
  vN=vec3(aN.x*c+aN.z*s,aN.y,-aN.x*s+aN.z*c);
  vC=aC; vM=aM;
  vec3 p=vP; if(MIR>.5) p.y=2.*WATERY-p.y;
  gl_Position=VP*vec4(p,1.);
}`;

// objetos opacos (grama, árvores, fonte, mesa...)
const FS_OPAQUE = `${COMMON}
varying vec3 vP, vN, vC; varying float vM;
uniform float MIR, WATERY;
uniform vec4 SH[40]; // manchas de sombra: x, z, raio, altura
uniform vec3 LAMP0, LAMP1;
vec3 lampLight(vec3 p,vec3 n){
  vec3 L=vec3(0);
  vec3 q=LAMP0-p; float d=length(q); L+=vec3(1.,.85,.55)*max(dot(n,q/d),0.)*3./(1.+d*d*.8);
  q=LAMP1-p; d=length(q); L+=vec3(1.,.85,.55)*max(dot(n,q/d),0.)*3./(1.+d*d*.8);
  return L*(1.-DAY);
}
void main(){
  vec3 p=vP;
  if(MIR>.5 && p.y<WATERY-.02) discard;
  vec3 n=normalize(vN);
  vec3 col=vC; float spec=.2, emit=0., sh=1.;
  float m=vM;
  if(m<.5){}
  else if(m<1.5){ // grama com caminho de terra até a fonte
    float g=fbm(p.xz*.6);
    col=mix(vec3(.25,.62,.12),vec3(.55,.86,.22),g);
    col=mix(col,vec3(.75,.95,.4),smoothstep(.3,1.,n.y)*.25);
    float path=abs(p.x-1.-sin(p.z*.35)*1.2);
    if(p.z<11.) col=mix(col,vec3(.93,.88,.75),smoothstep(.45,.3,path));
    spec=.15;
    // sombras: cada mancha é esticada na direção contrária ao sol, do tamanho que a altura da
    // coisa daria com o sol daquela hora (w > 0: poste/boneco de altura w; w < 0: copa a -w do chão)
    vec2 sd=normalize(-SUN.xz+vec2(1e-4));
    vec2 sp=vec2(-sd.y,sd.x);
    float tn=length(SUN.xz)/max(SUN.y,.12);
    for(int i=0;i<40;i++){
      vec4 s=SH[i]; if(s.z<=0.) continue;
      vec2 c; float al;
      if(s.w>0.){float L=min(s.w*tn,9.); c=s.xy+sd*L*.5; al=L*.5+s.z*.6;}
      else {float L=min(-s.w*tn,12.); c=s.xy+sd*L; al=s.z*min(1./max(SUN.y,.2),2.5);}
      vec2 q=p.xz-c;
      float d=length(vec2(dot(q,sd)/al,dot(q,sp)/s.z));
      sh*=1.-.58*smoothstep(1.,.3,d);
    }
  }
  else if(m<2.5){ // mesa: linhas brancas
    vec3 q=p-vec3(-3.4,0.,3.);
    if(abs(abs(q.x)-.74)<.02||abs(q.x)<.01||abs(abs(q.z)-1.35)<.02) col=vec3(1.);
    spec=.8;
  }
  else if(m<3.5){vec2 c=floor((p.xz-vec2(2.6,2.))*4.);col=mod(c.x+c.y,2.)<1.?vec3(.95,.25,.25):vec3(1.);}
  else if(m<4.5){emit=(1.-DAY)*2.5+.3;spec=.5;}
  else if(m<5.5){col=fract(p.y*2.)<.5?vec3(1.,.3,.6):vec3(1.,.85,.2);spec=.5;}
  else if(m<6.5){col=mix(vec3(.15,.55,.1),vec3(.5,.9,.25),fbm(p.xz*2.+p.y));spec=1.;}
  else {spec=1.;}
  vec3 rd=normalize(p-EYE);
  float lit=max(DAY,DUSK*.7);
  vec3 sunc=mix(vec3(1.,.97,.9),vec3(1.,.65,.4),DUSK);
  float dif=max(dot(n,SUN),0.)*lit*sh;
  float a=.75+.25*n.y; // "oclusão" barata: o que aponta pra baixo fica mais escuro
  vec3 amb=mix(vec3(.12,.16,.3),vec3(.75,.92,1.),lit);
  vec3 h=normalize(SUN-rd);
  vec3 c=col*(.5*a*amb*mix(1.,mix(.72,1.,sh),lit)+.95*dif*sunc+lampLight(p,n));
  c+=spec*pow(max(dot(n,h),0.),60.)*dif;
  c+=pow(1.-max(dot(n,-rd),0.),4.)*.18*skyc(reflect(rd,n));
  c+=col*emit;
  float d=length(p-EYE);
  c=mix(c,fogc(),1.-exp(-max(d-16.,0.)*.03));
  gl_FragColor=vec4(tone(c),1.);
}`;

// céu com nuvens e estrelas (tela inteira, atrás de tudo)
const VS_FULL = `attribute vec2 aQ; varying vec2 vQ; void main(){vQ=aQ;gl_Position=vec4(aQ,0.,1.);}`;
const FS_SKY = `${COMMON}
varying vec2 vQ;
uniform vec3 CR, CU, CF; uniform float ASP, MIR;
void main(){
  vec2 uv=vec2(vQ.x*ASP,vQ.y)*.5;
  vec3 rd=normalize(uv.x*CR+uv.y*CU+1.6*CF);
  if(MIR>.5) rd.y=-rd.y;
  vec3 c=skyc(rd);
  vec2 cuv=rd.xz/(rd.y+.12)*1.4+vec2(T*.02,0);
  float cl=smoothstep(.5,.8,fbm(cuv*.8));
  vec3 cloudc=mix(vec3(.25,.3,.45),mix(vec3(1.),vec3(1.,.75,.6),DUSK),max(DAY,DUSK*.8));
  c=mix(c,cloudc,cl*.85*smoothstep(0.,.25,rd.y));
  vec2 g=rd.xy/max(rd.z,.2)*220.;
  float star=step(.996,hash(floor(g)))*smoothstep(.35,.0,length(fract(g)-.5));
  c+=(1.-DAY)*(1.-DUSK)*star*vec3(1.,1.,.9)*smoothstep(.05,.3,rd.y)*(.6+.4*sin(T*2.+hash(floor(g))*20.));
  gl_FragColor=vec4(tone(c),1.);
}`;

// lago: reflexo do parque (imagem desenhada de cabeça pra baixo) + ondinhas
const FS_WATER = `${COMMON}
varying vec3 vP, vN, vC; varying float vM;
uniform sampler2D REFL; uniform vec2 RES;
void main(){
  vec3 p=vP;
  vec3 rd=normalize(p-EYE);
  vec3 n=normalize(vec3(.03*sin(p.x*4.+T*1.5),1.,.03*cos(p.z*5.+T*1.2)));
  float jt=mod(T,9.); float rr=length(p.xz-vec2(-2.8,11.4));
  if(jt>1.1&&jt<4.) n=normalize(n+.15*sin(rr*18.-jt*10.)*exp(-rr*2.)*exp(-(jt-1.1))*vec3(1,0,1));
  vec2 suv=gl_FragCoord.xy/RES+n.xz*.06;
  vec3 refl=untone(texture2D(REFL,suv).rgb);
  vec3 r=reflect(rd,n);
  float f=.2+.8*pow(1.-max(dot(n,-rd),0.),5.);
  vec3 col=mix(vec3(.05,.6,.8)*max(DAY,.25),refl,f);
  col+=pow(max(dot(r,SUN),0.),200.)*2.*max(DAY,DUSK);
  float d=length(p-EYE);
  col=mix(col,fogc(),1.-exp(-max(d-16.,0.)*.03));
  gl_FragColor=vec4(tone(col),1.);
}`;

// vidro líquido: quase transparente, o fundo entorta nas bordas (como uma lente), um leve
// arco-íris nas beiradas, brilho de quina vindo de cima e reflexo do céu
const FS_GLASS = `${COMMON}
varying vec3 vP, vN, vC; varying float vM;
uniform sampler2D SCENE; uniform vec2 RES;
uniform vec3 CR, CU;
uniform vec3 TINT; // cor do vidro deste boneco
uniform vec3 LAMP0, LAMP1;
void main(){
  vec3 p=vP;
  vec3 n=normalize(vN);
  vec3 rd=normalize(p-EYE);
  if(dot(n,rd)>0.) n=-n;
  float ndv=max(dot(n,-rd),0.);
  float edge=1.-ndv;
  float f=pow(edge,3.);
  // normal vista na tela: empurra o fundo pra dentro, bem mais na borda do que no meio
  vec2 sn=vec2(dot(n,CR),dot(n,CU));
  vec2 base=gl_FragCoord.xy/RES;
  vec2 off=-sn*(.012+.085*pow(edge,1.6))*vec2(RES.y/RES.x,1.);
  vec2 px=1.5/RES;
  vec3 back;
  back.r=texture2D(SCENE,base+off*1.12).r;
  back.g=texture2D(SCENE,base+off).g;
  back.b=texture2D(SCENE,base+off*.88).b;
  // um pouquinho fosco: média com 4 vizinhos
  vec3 soft=texture2D(SCENE,base+off+vec2(px.x,0.)).rgb+texture2D(SCENE,base+off-vec2(px.x,0.)).rgb
           +texture2D(SCENE,base+off+vec2(0.,px.y)).rgb+texture2D(SCENE,base+off-vec2(0.,px.y)).rgb;
  back=untone(mix(back,soft*.25,.45));
  float lit=max(DAY,DUSK);
  // vidro grosso levemente água-marinha: some um pouco de vermelho de quem passa por dentro
  vec3 c=back*mix(vec3(1.),TINT,.68)*(1.-.18*edge)+vec3(.0,.02,.03)+TINT*(.05+.15*edge);
  // um pouco da cor "no corpo" do vidro, pra cada um ter a sua cor mesmo em cima da grama
  c=mix(c,TINT*(.3+.45*max(DAY,DUSK)),.3);
  // faixa mais escura logo antes da borda: dá a espessura do vidro
  c*=1.-.28*smoothstep(.25,.55,edge)*(1.-smoothstep(.62,.9,edge));
  vec3 sk=skyc(reflect(rd,n));
  c=mix(c,sk,.1+.55*f);
  c+=sk*.22*max(n.y,0.)*lit; // a parte de cima reflete o céu
  // brilho do sol bem fininho e uma luz suave de cima
  c+=pow(max(dot(n,normalize(SUN-rd)),0.),220.)*3.*lit;
  c+=pow(max(dot(n,normalize(vec3(-.2,1.,-.5))),0.),18.)*.3*vec3(.9,1.,1.);
  // quina brilhante (o "fio de luz" do vidro líquido), mais forte do lado de cima e esquerdo
  vec2 sdir=normalize(sn+vec2(1e-4));
  float rim=smoothstep(.62,.98,edge);
  float k=max(dot(sdir,vec2(-.55,.83)),0.);
  c+=rim*(.35+1.1*k*k)*mix(vec3(.92,1.,1.),TINT,.3)*(.55+.45*lit);
  c+=rim*.35*max(-dot(sdir,vec2(-.55,.83)),0.)*vec3(.65,.95,1.);
  vec3 L=vec3(0); vec3 lq=LAMP0-p; float ld=length(lq); L+=max(dot(n,lq/ld),0.)*3./(1.+ld*ld*.8);
  lq=LAMP1-p; ld=length(lq); L+=max(dot(n,lq/ld),0.)*3./(1.+ld*ld*.8);
  c+=vec3(1.,.85,.55)*L*(1.-DAY)*.35;
  float d=length(p-EYE);
  c=mix(c,fogc(),1.-exp(-max(d-16.,0.)*.03));
  gl_FragColor=vec4(tone(c),1.);
}`;

// bolhas de sabão: película furta-cor por cima do parque
const VS_BUB = `
attribute vec3 aP, aN, aC; attribute float aM;
uniform mat4 VP; uniform vec4 B;
varying vec3 vP, vN;
void main(){vN=aN; vP=B.xyz+aN*B.w; gl_Position=VP*vec4(vP,1.);}`;
const FS_BUB = `${COMMON}
varying vec3 vP, vN;
uniform sampler2D SCENE; uniform vec2 RES;
void main(){
  vec3 n=normalize(vN);
  vec3 rd=normalize(vP-EYE);
  float f=pow(1.-max(dot(n,-rd),0.),2.);
  vec3 bg=untone(texture2D(SCENE,gl_FragCoord.xy/RES).rgb);
  vec3 film=.5+.5*cos(6.28*(f*1.6+vec3(0.,.33,.67))+T);
  vec3 c=mix(bg,bg*.95+film*.35,.2+.8*f);
  c+=skyc(reflect(rd,n))*f*.25;
  c+=pow(max(dot(n,normalize(SUN-rd)),0.),80.)*1.5;
  gl_FragColor=vec4(tone(c),1.);
}`;

// vaga-lumes (pontos que brilham, somados à imagem)
const VS_FLY = `
attribute vec3 aP, aN, aC; attribute float aM;
uniform mat4 VP; uniform float PX;
varying float vB;
void main(){vB=aM; vec4 q=VP*vec4(aP,1.); gl_Position=q; gl_PointSize=max(2.,PX*.09/q.w);}`;
const FS_FLY = `precision mediump float; varying float vB;
void main(){float d=length(gl_PointCoord-.5)*2.; float a=exp(-d*d*5.)*vB; gl_FragColor=vec4(vec3(.75,1.,.35)*a,1.);}`;

// imagem final: copia pra tela com o brilho do sol no canto, reflexo de lente e vinheta
const FS_POST = `precision highp float;
varying vec2 vQ;
uniform sampler2D SCENE; uniform float ASP, SUNV, DUSK;
void main(){
  vec3 c=texture2D(SCENE,vQ*.5+.5).rgb;
  vec2 uv=vec2(vQ.x*ASP,vQ.y)*.5;
  vec2 su=vec2(-.62,.36);
  float sd=length(uv-su);
  c+=mix(vec3(1.,.98,.85),vec3(1.,.7,.4),DUSK)*.11*exp(-sd*3.5)*SUNV;
  for(int k=1;k<4;k++){vec2 fp=su*(1.-float(k)*.55);float fr=length(uv-fp);
    c+=vec3(.4,.9,1.)*.06*smoothstep(.06+float(k)*.02,.0,fr)*(1.-smoothstep(.03,.06,abs(fr-.05*float(k))))*SUNV;}
  c*=1.-.12*dot(uv,uv);
  gl_FragColor=vec4(c,1.);
}`;
const FS_COPY = `precision mediump float; varying vec2 vQ; uniform sampler2D SCENE;
void main(){gl_FragColor=texture2D(SCENE,vQ*.5+.5);}`;

// hora do dia → luz (window.__aeroHour força uma hora, pra testar)
function daylight(hour: number) {
  const day = ss(5.5, 8, hour) - ss(17.5, 19.5, hour);
  const dusk = Math.max(Math.exp(-(((hour - 6.4) / 0.9) ** 2)), Math.exp(-(((hour - 18.3) / 1) ** 2)));
  // o sol nasce à esquerda e se põe à direita, mais baixo no fim da tarde
  const k = Math.max(0, Math.min(1, (hour - 6) / 12));
  const elev = 0.08 + Math.sin(Math.PI * k) * 0.6;
  const az = -0.9 + k * 1.6;
  const sun: V3 = [Math.sin(az), elev, Math.cos(az) * 0.8 + 0.4];
  const l = Math.hypot(...sun);
  return { day: Math.max(0, Math.min(1, day)), dusk: Math.min(1, dusk), sun: sun.map((v) => v / l) as V3 };
}

// Passeio: você anda pelo parque com um boneco de vidro e conversa com os outros.
// onNear avisa quem está perto (ou -1); onPop avisa quando você estoura uma bolha.
export type WalkHooks = { onNear?: (i: number) => void; onPop?: () => void };
export type ParkHandle = (() => void) & { talk: (i: number) => void; endTalk: () => void };
let walking = 0; // passeios abertos: enquanto isso o papel de parede descansa (um 3D por vez)

export function createAeroPark(canvas: HTMLCanvasElement, onFail: () => void = () => {}, walk?: WalkHooks): ParkHandle {
  const nothing = Object.assign(() => {}, { talk: () => {}, endTalk: () => {} });
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, powerPreference: "low-power" });
  if (!gl) {
    onFail();
    return nothing;
  }
  if (walk) walking++;
  let dead = false;
  const onLost = (e: Event) => {
    e.preventDefault();
    dead = true;
    onFail();
  };
  canvas.addEventListener("webglcontextlost", onLost);

  /* --- programas --- */
  type Prog = { p: WebGLProgram; u: (n: string) => WebGLUniformLocation | null; a: Record<string, number> };
  const progs: Prog[] = [];
  function program(vs: string, fs: string): Prog {
    const sh = (type: number, src: string) => {
      const s = gl!.createShader(type)!;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) console.error(gl!.getShaderInfoLog(s));
      return s;
    };
    const p = gl!.createProgram()!;
    gl!.attachShader(p, sh(gl!.VERTEX_SHADER, vs));
    gl!.attachShader(p, sh(gl!.FRAGMENT_SHADER, fs));
    gl!.linkProgram(p);
    const cache: Record<string, WebGLUniformLocation | null> = {};
    const a: Record<string, number> = {};
    for (const n of ["aP", "aN", "aC", "aM", "aQ"]) a[n] = gl!.getAttribLocation(p, n);
    const pr = { p, u: (n: string) => (n in cache ? cache[n] : (cache[n] = gl!.getUniformLocation(p, n))), a };
    progs.push(pr);
    return pr;
  }
  const P = {
    opaque: program(VS_MESH, FS_OPAQUE),
    water: program(VS_MESH, FS_WATER),
    glass: program(VS_MESH, FS_GLASS),
    sky: program(VS_FULL, FS_SKY),
    bub: program(VS_BUB, FS_BUB),
    fly: program(VS_FLY, FS_FLY),
    post: program(VS_FULL, FS_POST),
    copy: program(VS_FULL, FS_COPY),
  };

  /* --- malhas --- */
  type Mesh = { b: WebGLBuffer; n: number; ib?: WebGLBuffer; ni?: number };
  const mesh = (v: number[] | Float32Array, dyn = false): Mesh => {
    const b = gl!.createBuffer()!;
    gl!.bindBuffer(gl!.ARRAY_BUFFER, b);
    gl!.bufferData(gl!.ARRAY_BUFFER, v instanceof Float32Array ? v : new Float32Array(v), dyn ? gl!.DYNAMIC_DRAW : gl!.STATIC_DRAW);
    return { b, n: v.length / STRIDE };
  };
  const update = (m: Mesh, v: number[]) => {
    gl!.bindBuffer(gl!.ARRAY_BUFFER, m.b);
    gl!.bufferData(gl!.ARRAY_BUFFER, new Float32Array(v), gl!.DYNAMIC_DRAW);
    m.n = v.length / STRIDE;
  };
  const park = mesh(buildPark());
  const fountain = mesh(buildFountainWater());
  const pond = mesh(buildPond());
  const sphereG = new Geo();
  sphereG.sphere([0, 0, 0], 1, 16, 12);
  const bubMesh = mesh(sphereG.v);
  const dynOpaque = mesh([], true);
  // bonecos: cada pose é calculada uma vez e guardada pronta (a placa de vídeo só desenha)
  const shapeMesh = (sh: Shape): Mesh => {
    const g = gl!;
    const b = g.createBuffer()!;
    g.bindBuffer(g.ARRAY_BUFFER, b);
    g.bufferData(g.ARRAY_BUFFER, sh.v, g.STATIC_DRAW);
    const ib = g.createBuffer()!;
    g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, ib);
    g.bufferData(g.ELEMENT_ARRAY_BUFFER, sh.i, g.STATIC_DRAW);
    return { b, n: sh.v.length / STRIDE, ib, ni: sh.i.length };
  };
  const figCache: Map<string, Mesh>[] = [...FIGS, null].map(() => new Map());
  const poseOf = (i: number) => (i < FIGS.length ? FIGS[i].pose : 2);
  const WALK_STEPS = 32;
  let builtThisFrame = 0;
  // devolve a malha da pose pedida; se ainda não existe, calcula (no máximo uma por quadro,
  // pra nunca travar) e enquanto isso usa a pose pronta mais parecida
  function figMesh(i: number, wave: number, wig: number, walkStep: number) {
    const pose = poseOf(i);
    const wl = wave < 0.02 ? 0 : wave < 0.6 ? 0.5 : 1;
    const wq = wl ? Math.round(((wig + 1) / 2) * 6) : 0;
    const key = `${pose === 2 ? walkStep : 0}|${wl}|${wq}`;
    const cache = figCache[i];
    let m = cache.get(key);
    if (m) return m;
    if (builtThisFrame < 1 || cache.size === 0) {
      builtThisFrame++;
      const sw = pose === 2 ? Math.sin((walkStep / WALK_STEPS) * Math.PI * 2) * 0.35 : 0;
      m = shapeMesh(meshParts(figureParts(pose, wl, (wq / 6) * 2 - 1, sw)));
      if (cache.size > 48) {
        const first = cache.keys().next().value as string;
        const old = cache.get(first)!;
        gl!.deleteBuffer(old.b);
        if (old.ib) gl!.deleteBuffer(old.ib);
        cache.delete(first);
      }
      cache.set(key, m);
      return m;
    }
    // ainda não pronta: a mais parecida (mesmo passo de caminhada, ou a parada)
    let best: Mesh | undefined, bd = 1e9;
    cache.forEach((mm, k) => {
      const [ws, l] = k.split("|").map(Number);
      const dd = Math.abs(l - wl) * 10 + Math.min(Math.abs(ws - walkStep), WALK_STEPS - Math.abs(ws - walkStep));
      if (dd < bd) {
        bd = dd;
        best = mm;
      }
    });
    return best!;
  }
  const flies = mesh([], true);
  const quad = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  function bindMesh(pr: Prog, m: Mesh) {
    const g = gl!;
    g.bindBuffer(g.ARRAY_BUFFER, m.b);
    const S = STRIDE * 4;
    const at = (n: string, size: number, off: number) => {
      const l = pr.a[n];
      if (l < 0) return;
      g.enableVertexAttribArray(l);
      g.vertexAttribPointer(l, size, g.FLOAT, false, S, off * 4);
    };
    at("aP", 3, 0);
    at("aN", 3, 3);
    at("aC", 3, 6);
    at("aM", 1, 9);
  }
  function drawFull(pr: Prog) {
    const g = gl!;
    g.bindBuffer(g.ARRAY_BUFFER, quad);
    const l = pr.a.aQ;
    g.enableVertexAttribArray(l);
    g.vertexAttribPointer(l, 2, g.FLOAT, false, 0, 0);
    g.drawArrays(g.TRIANGLES, 0, 3);
  }
  function resetAttribs() {
    for (let i = 0; i < 4; i++) gl!.disableVertexAttribArray(i);
  }

  /* --- imagens fora da tela --- */
  type Target = { fb: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number };
  const mkTex = (w: number, h: number) => {
    const g = gl!;
    const t = g.createTexture()!;
    g.bindTexture(g.TEXTURE_2D, t);
    g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, w, h, 0, g.RGBA, g.UNSIGNED_BYTE, null);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
    return t;
  };
  const mkDepth = (w: number, h: number) => {
    const g = gl!;
    const d = g.createRenderbuffer()!;
    g.bindRenderbuffer(g.RENDERBUFFER, d);
    g.renderbufferStorage(g.RENDERBUFFER, g.DEPTH_COMPONENT16, w, h);
    return d;
  };
  const mkTarget = (w: number, h: number, depth: WebGLRenderbuffer): Target => {
    const g = gl!;
    const tex = mkTex(w, h);
    const fb = g.createFramebuffer()!;
    g.bindFramebuffer(g.FRAMEBUFFER, fb);
    g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, tex, 0);
    g.framebufferRenderbuffer(g.FRAMEBUFFER, g.DEPTH_ATTACHMENT, g.RENDERBUFFER, depth);
    return { fb, tex, w, h };
  };
  let A: Target, B: Target, R: Target;
  let bufs: (WebGLFramebuffer | WebGLTexture | WebGLRenderbuffer)[] = [];
  function freeTargets() {
    const g = gl!;
    for (const b of bufs) {
      if (b instanceof WebGLFramebuffer) g.deleteFramebuffer(b);
      else if (b instanceof WebGLTexture) g.deleteTexture(b);
      else g.deleteRenderbuffer(b);
    }
    bufs = [];
  }

  // resolução: começa em 75% e se ajusta sozinha pra manter 30 quadros por segundo
  const forced = (window as unknown as { __aeroScale?: number }).__aeroScale;
  let scale = forced ?? 0.75;
  let W = 0, Hh = 0;
  function resize() {
    W = canvas.clientWidth;
    Hh = canvas.clientHeight;
    const w = Math.max(16, Math.round(W * scale));
    const h = Math.max(16, Math.round(Hh * scale));
    canvas.width = w;
    canvas.height = h;
    freeTargets();
    const d = mkDepth(w, h);
    A = mkTarget(w, h, d);
    B = mkTarget(w, h, d); // mesma profundidade: o vidro é desenhado por cima do parque já pronto
    const rw = Math.max(16, w >> 1), rh = Math.max(16, h >> 1);
    const rd = mkDepth(rw, rh);
    R = mkTarget(rw, rh, rd);
    bufs.push(A.fb, A.tex, B.fb, B.tex, d, R.fb, R.tex, rd);
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  /* --- câmera (a mesma conta do desenho antigo, pra saber onde cada coisa aparece) --- */
  const cam = { ro: [0.4, 2.4, -7.5] as V3, ta: [0, 1.2, 6] as V3 };
  const mouse = { x: -1e4, y: -1e4, px: 0 };
  function basis() {
    const f = norm(sub(cam.ta, cam.ro));
    const r = norm(cross([0, 1, 0], f));
    const u = cross(f, r);
    return { f, r, u };
  }
  function project(p: V3) {
    const { f, r, u } = basis();
    const d = sub(p, cam.ro);
    const z = dot(d, f);
    if (z <= 0) return null;
    const rect = canvas.getBoundingClientRect();
    const x = (1.6 * dot(d, r)) / z;
    const y = (1.6 * dot(d, u)) / z;
    return { x: rect.left + rect.width / 2 + x * rect.height, y: rect.top + rect.height / 2 - y * rect.height, s: rect.height / z };
  }
  // matriz de projeção × visão (coluna por coluna, como o WebGL espera)
  function viewProj(aspect: number) {
    const { f, r, u } = basis();
    const e = cam.ro;
    const near = 0.05, far = 140;
    const fy = 3.2; // 1.6 / 0.5: mesmo campo de visão do desenho antigo
    const fx = fy / aspect;
    const A_ = (far + near) / (near - far), B_ = (2 * far * near) / (near - far);
    // linhas da visão: x = r, y = u, z = -f (com essa base o x positivo fica à direita, como antes)
    const vx = [r[0], r[1], r[2], -dot(r, e)];
    const vy = [u[0], u[1], u[2], -dot(u, e)];
    const vz = [-f[0], -f[1], -f[2], dot(f, e)];
    const m = new Float32Array(16);
    for (let c = 0; c < 4; c++) {
      m[c * 4 + 0] = fx * vx[c];
      m[c * 4 + 1] = fy * vy[c];
      m[c * 4 + 2] = A_ * vz[c] + (c === 3 ? B_ : 0);
      m[c * 4 + 3] = -vz[c];
    }
    return { m, f, r, u };
  }

  /* --- bolhas e aceno --- */
  const bubbles: Bubble[] = [];
  let lastBubble = 0;
  let cheer = 0;
  const wand = (): V3 => {
    const f = FIGS[6];
    return [f.x - 0.4, H(f.x, f.z) + 1.5, f.z - 0.1];
  };
  const waves = new Float32Array(10);
  const figNow: { m: Mesh; at: V3; ry: number; tint: [number, number, number] }[] = [];
  /* --- passeio --- */
  // ponto de partida (window.__aeroStart muda, pra testar e gravar vídeo, como o __aeroHour)
  const start = (window as unknown as { __aeroStart?: { x: number; z: number; ang: number } }).__aeroStart;
  const player = { x: start?.x ?? 0.6, z: start?.z ?? -3.2, ang: start?.ang ?? 0, v: 0, phase: 0 };
  const keys = new Set<string>();
  let talkTo = -1, talkT = 0, nearNpc = -2, tNow = 0, camReady = false;
  const npcRy = FIGS.map((f) => f.ry);
  let walkerT = 0, lastWalkerT = -1;
  const OBST: [number, number, number][] = [
    ...TREES.map(([x, z, sc]) => [x, z, 0.45 * sc] as [number, number, number]),
    ...LAMPS.map(([x, z]) => [x, z, 0.22] as [number, number, number]),
    [1, 12, 1.6],
    [-3.4, 2.15, 0.8],
    [-3.4, 3, 0.8],
    [-3.4, 3.85, 0.8],
    [BENCH[0], BENCH[1], 0.75],
    [2.75, 2.1, 0.3],
  ];
  // empurra você pra fora do lago, das árvores, da fonte, da mesa e dos outros bonecos
  function collide(x: number, z: number): [number, number] {
    x = Math.max(-28, Math.min(28, x));
    z = Math.max(-6, Math.min(42, z));
    const pd = pondD(x, z);
    if (pd < 5.1) {
      const k = 5.1 / Math.max(pd, 0.01);
      x = -4.5 + (x + 4.5) * k;
      z = 11 + (z - 11) * k;
    }
    const near: [number, number, number][] = [...OBST, ...figNow.slice(0, FIGS.length).map((f, i) => [f.at[0], f.at[2], FIGS[i].pose === 1 ? 0.45 : 0.35] as [number, number, number])];
    for (const [ox, oz, r] of near) {
      const dx = x - ox, dz = z - oz, d = Math.hypot(dx, dz), min = r + 0.3;
      if (d < min && d > 1e-4) {
        x = ox + (dx / d) * min;
        z = oz + (dz / d) * min;
      }
    }
    return [x, z];
  }
  const angTo = (a: number, b: number, k: number) => {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * k;
  };
  const paddles: V3[] = [];
  const shadowData = new Float32Array(40 * 4);
  const lamp0: V3 = [LAMPS[0][0], H(...LAMPS[0]) + 2.45, LAMPS[0][1]];
  const lamp1: V3 = [LAMPS[1][0], H(...LAMPS[1]) + 2.45, LAMPS[1][1]];

  // coisas opacas que se mexem: bolinha, pipa e peixe
  function dynamicOpaque(T: number) {
    const g = new Geo();
    // raquetes vermelhas
    g.col = [0.9, 0.2, 0.2];
    g.mat = 7;
    paddles.forEach((c, i) => {
      const ax = sub(toWorld([0, 0, 1], [0, 0, 0], npcRy[i]), [0, 0, 0]);
      g.cyl(add(c, mul(ax, -0.015)), add(c, mul(ax, 0.015)), 0.13, 12, true);
    });
    g.mat = 0;
    g.col = [1, 0.9, 0.6];
    const u = (T * 0.55) % 1;
    const bz = -1.2 + 2.4 * Math.abs(u * 2 - 1);
    g.sphere([-3.4 + 0.15 * Math.sin(T), H(-3.4, 3) + 0.95 + 0.35 * Math.abs(Math.sin(u * Math.PI * 2)), 3 + bz], 0.04, 8, 6);
    // pipa
    const kp: V3 = [10.4 + 0.6 * Math.sin(T * 0.7), H(9.6, 13) + 4.3 + 0.4 * Math.sin(T * 1.1), 17];
    const a = -0.3 * Math.sin(T * 0.9);
    const kr = (x: number, y: number): V3 => [kp[0] + x * Math.cos(a) - y * Math.sin(a), kp[1] + x * Math.sin(a) + y * Math.cos(a), kp[2]];
    g.mat = 5;
    const top = kr(0, 0.786), bot = kr(0, -0.786), le = kr(-0.55, 0), ri = kr(0.55, 0);
    const nk: V3 = [0, 0, -1];
    g.vert(top, nk); g.vert(ri, nk); g.vert(bot, nk);
    g.vert(top, nk); g.vert(bot, nk); g.vert(le, nk);
    g.mat = 0;
    g.col = [1, 1, 1];
    const hand: V3 = [9.6, H(9.6, 13) + 1.5, 13.15];
    g.cyl(hand, sub(kp, [0, 0.3, 0]), 0.012, 4);
    g.col = [1, 0.3, 0.6];
    g.cyl(sub(kp, [0, 0.6, 0]), sub(kp, [0.3 * Math.sin(T * 2), 1.6, 0]), 0.03, 5);
    // peixe pulando no lago de vez em quando
    const jt = T % 9;
    if (jt < 1.2) {
      const k = jt / 1.2;
      const fp: V3 = [-4.2 + k * 1.4, WATER + 0.9 * Math.sin(k * Math.PI) - 0.15, 11.4];
      const ang = (k - 0.5) * 2;
      g.col = [1, 0.55, 0.15];
      g.mat = 7;
      g.ellipsoid(fp, [0.286, 0.13, 0.11], 12, 8, (p) => [p[0] * Math.cos(ang) - p[1] * Math.sin(ang), p[0] * Math.sin(ang) + p[1] * Math.cos(ang), p[2]]);
    }
    update(dynOpaque, g.v);
  }

  /* --- laço de desenho --- */
  let raf = 0;
  let last = 0;
  const t0 = performance.now();
  let slow = 0, fast = 0, crawl = 0;

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    if (document.hidden || dead) return;
    if (!walk && walking > 0) return; // tem um passeio aberto por cima: não desenha o fundo
    if (now - last < 31) return; // 30 quadros por segundo bastam
    const gap = now - last;
    const dtF = Math.min(0.2, gap / 1000);
    last = now;
    // resolução automática: se não está conseguindo 30 quadros, baixa; se sobra, sobe
    if (!forced && gap < 1000) {
      if (gap > 48) slow++;
      else slow = Math.max(0, slow - 1);
      if (gap < 36) fast++;
      else fast = 0;
      // última trava: já na resolução mínima e ainda muito lento (mais de 4 quadros por segundo
      // perdidos por vários segundos) → desliga o 3D e volta pra imagem parada do parque
      if (scale <= 0.4 && gap > 250) crawl++;
      else crawl = Math.max(0, crawl - 1);
      if (crawl > 12) {
        dead = true;
        onFail();
        return;
      }
      if (slow > 20 && scale > 0.4) {
        scale = Math.max(0.4, scale - 0.1);
        slow = 0;
        resize();
      } else if (fast > 150 && scale < 1) {
        scale = Math.min(1, scale + 0.1);
        fast = 0;
        resize();
      }
    }
    const t = (now - t0) / 1000;

    tNow = t;
    if (!walk) {
      // câmera respirando devagar + um pouquinho de paralaxe com o mouse
      mouse.px += ((mouse.x > -1e3 ? mouse.x / window.innerWidth - 0.5 : 0) - mouse.px) * 0.05;
      cam.ro = [0.4 + Math.sin(t * 0.1) * 0.4 + mouse.px * 0.6, 2.4, -7.5];
      cam.ta = [mouse.px * 0.4, 1.2, 6];
      walkerT = t;
    } else {
      // quem passeia para pra conversar (ou quando você entra na frente)
      const wx = walkX(walkerT);
      if (talkTo !== 5 && Math.hypot(player.x - wx, player.z - WALK_Z) > 1.3) walkerT += dtF;
      // você: W/S anda, A/D vira, Shift corre
      const k = (...c: string[]) => c.some((x) => keys.has(x));
      if (talkTo < 0) {
        const turn = (k("KeyD", "ArrowRight") ? 1 : 0) - (k("KeyA", "ArrowLeft") ? 1 : 0);
        const fwd = (k("KeyW", "ArrowUp") ? 1 : 0) - (k("KeyS", "ArrowDown") ? 1 : 0);
        player.ang += turn * 2.3 * dtF;
        const target = fwd * (k("ShiftLeft", "ShiftRight") ? 4.2 : 2.1) * (fwd < 0 ? 0.6 : 1);
        player.v += (target - player.v) * Math.min(1, dtF * 8);
      } else {
        player.v += (0 - player.v) * Math.min(1, dtF * 10);
        // vira pra quem está conversando com você
        const n = figNow[talkTo];
        if (n) player.ang = angTo(player.ang, Math.atan2(n.at[0] - player.x, n.at[2] - player.z), Math.min(1, dtF * 6));
      }
      [player.x, player.z] = collide(player.x + Math.sin(player.ang) * player.v * dtF, player.z + Math.cos(player.ang) * player.v * dtF);
      if (Math.abs(player.v) > 0.1) player.phase += player.v * dtF * 4.6;
      else player.phase += (Math.round(player.phase / Math.PI) * Math.PI - player.phase) * Math.min(1, dtF * 8);
      // câmera atrás de você; conversando, de lado, mostrando os dois
      const py = H(player.x, player.z);
      const f: V3 = [Math.sin(player.ang), 0, Math.cos(player.ang)];
      let wro: V3, wta: V3;
      const n = talkTo >= 0 ? figNow[talkTo] : undefined;
      if (n) {
        const mid: V3 = [(player.x + n.at[0]) / 2, (py + n.at[1]) / 2, (player.z + n.at[2]) / 2];
        const d = norm([n.at[0] - player.x, 0, n.at[2] - player.z]);
        let side: V3 = [d[2], 0, -d[0]];
        const back = sub(cam.ro, mid);
        if (dot(side, back) < 0) side = mul(side, -1);
        const nr = Math.min(1.5, Math.max(1, Math.sqrt((canvas.clientHeight || 1) / (canvas.clientWidth || 1)) * 1.2));
        wro = add(mid, add(mul(side, 3.3 * nr), add(mul(d, -0.8), [0, 1.5 * nr, 0])));
        wta = add(mid, [0, 1.05, 0]);
      } else {
        // tela estreita (em pé): a câmera vai mais pra trás e mais alto, pra caber o parque
        const narrow = Math.min(1.6, Math.max(1, Math.sqrt((canvas.clientHeight || 1) / (canvas.clientWidth || 1)) * 1.25));
        wro = add([player.x, py, player.z], add(mul(f, -4.6 * narrow), [0, 2.55 * narrow, 0]));
        wta = add([player.x, py, player.z], add(mul(f, 3.2), [0, 0.95, 0]));
      }
      const kc = camReady ? Math.min(1, dtF * 4) : 1;
      camReady = true;
      cam.ro = add(cam.ro, mul(sub(wro, cam.ro), kc));
      cam.ta = add(cam.ta, mul(sub(wta, cam.ta), kc));
      cam.ro[1] = Math.max(cam.ro[1], H(cam.ro[0], cam.ro[2]) + 0.7);
    }

    // bolhas: o boneco sopra uma de tempos em tempos; elas sobem com o vento e somem
    if (t - lastBubble > 1.1 && bubbles.length < MAX_B) {
      lastBubble = t;
      const [x, y, z] = wand();
      bubbles.push({ x, y, z, r: 0.09 + Math.random() * 0.1, born: t, vx: -(0.3 + Math.random() * 0.25), vz: (Math.random() - 0.5) * 0.3, ph: Math.random() * 6 });
    }
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      const age = t - b.born;
      b.x += b.vx * dtF;
      b.z += b.vz * dtF;
      b.y += (0.18 + Math.sin(age * 2 + b.ph) * 0.12) * dtF;
      if (age > 11) bubbles.splice(i, 1);
    }
    cheer = Math.max(0, cheer - dtF * 0.6);

    // bonecos acenam quando o mouse passa perto (papel de parede) ou quando você chega perto (passeio)
    builtThisFrame = 0;
    let closest = -1, cd = 2.1;
    FIGS.forEach((fg, i) => {
      const x = i === 5 ? walkX(walkerT) : fg.x;
      const z = i === 5 ? WALK_Z : fg.z;
      let want = 0;
      if (walk) {
        const dd = Math.hypot(player.x - x, player.z - z);
        want = talkTo === i ? (t - talkT < 1.6 ? 1 : 0) : talkTo < 0 && dd < 2.6 ? 1 : 0;
        if (dd < cd) {
          cd = dd;
          closest = i;
        }
        const face = talkTo === i && fg.pose !== 1;
        npcRy[i] = angTo(npcRy[i], face ? Math.atan2(player.x - x, player.z - z) : fg.ry, Math.min(1, dtF * 5));
      } else {
        const p = project([x, H(x, z) + 1.1, z]);
        want = p && Math.hypot(p.x - mouse.x, p.y - mouse.y) < Math.max(40, p.s * 0.9) ? 1 : 0;
      }
      waves[i] += (want - waves[i]) * Math.min(1, dtF * 5);
      const wv = i === 6 ? Math.max(waves[i], cheer) : waves[i];
      const walking5 = i !== 5 || !walk || walkerT !== lastWalkerT;
      const step = walking5 ? Math.floor((((t * 4 + fg.ph) / (Math.PI * 2)) % 1) * WALK_STEPS) % WALK_STEPS : 0;
      figNow[i] = { m: figMesh(i, wv, Math.sin(t * 9), step), at: [x, figGround(i, x, z), z], ry: npcRy[i], tint: NPCS[i].tint };
      if (fg.pose === 0) {
        // a raquete vai junto com a mão (inclusive quando o boneco acena)
        const wl = wv < 0.02 ? 0 : wv < 0.6 ? 0.5 : 1;
        const wq = wl ? (Math.round(((Math.sin(t * 9) + 1) / 2) * 6) / 6) * 2 - 1 : 0;
        const hd = figureParts(0, wl, wq, 0)[9];
        paddles[i] = toWorld([hd[3], hd[4] - 0.03, hd[5] + 0.04], figNow[i].at, npcRy[i]);
      }
    });
    lastWalkerT = walkerT;
    if (walk) {
      const ps = Math.floor((((player.phase / (Math.PI * 2)) % 1) + 1) % 1 * WALK_STEPS) % WALK_STEPS;
      figNow[FIGS.length] = { m: figMesh(FIGS.length, 0, 0, ps), at: [player.x, H(player.x, player.z), player.z], ry: player.ang, tint: PLAYER_TINT };
      if (closest !== nearNpc) {
        nearNpc = closest;
        walk.onNear?.(closest);
      }
    }
    dynamicOpaque(t);

    const hour = (window as unknown as { __aeroHour?: number }).__aeroHour ?? new Date().getHours() + new Date().getMinutes() / 60;
    const L = daylight(hour);

    // manchas de sombra no gramado
    shadowData.fill(0);
    let si = 0;
    const shadow = (x: number, z: number, r: number, h: number) => {
      if (si >= 40) return;
      shadowData.set([x, z, r, h], si * 4);
      si++;
    };
    FIGS.forEach((fg, i) => shadow(i === 5 ? walkX(walkerT) : fg.x, i === 5 ? WALK_Z : fg.z, 0.3, fg.pose === 1 ? 1.1 : 1.7));
    if (walk) shadow(player.x, player.z, 0.3, 1.7);
    TREES.forEach(([x, z, sc]) => {
      shadow(x, z, 1.35 * sc, -2.5 * sc);
      shadow(x, z, 0.22 * sc, 2 * sc);
    });
    shadow(-3.4, 3, 0.85, 0.8);
    shadow(1, 12, 1.4, 0.7);
    shadow(BENCH[0], BENCH[1], 0.55, 0.8);
    shadow(2.75, 2.1, 0.28, 0.35);
    LAMPS.forEach(([x, z]) => shadow(x, z, 0.12, 2.5));

    const g = gl!;
    const aspect = A.w / A.h;
    const V = viewProj(aspect);
    const common = (pr: Prog, mir = 0) => {
      g.useProgram(pr.p);
      g.uniform1f(pr.u("T"), t);
      g.uniform1f(pr.u("DAY"), L.day);
      g.uniform1f(pr.u("DUSK"), L.dusk);
      g.uniform3fv(pr.u("SUN"), L.sun);
      g.uniform3fv(pr.u("EYE"), cam.ro);
      g.uniformMatrix4fv(pr.u("VP"), false, V.m);
      g.uniform1f(pr.u("MIR"), mir);
      g.uniform1f(pr.u("WATERY"), WATER);
      g.uniform3fv(pr.u("LAMP0"), lamp0);
      g.uniform3fv(pr.u("LAMP1"), lamp1);
      g.uniform4f(pr.u("MO"), 0, 0, 0, 0);
    };
    const sky = (mir: number, w: number, h: number) => {
      common(P.sky, mir);
      g.uniform3fv(P.sky.u("CR"), V.r);
      g.uniform3fv(P.sky.u("CU"), V.u);
      g.uniform3fv(P.sky.u("CF"), V.f);
      g.uniform1f(P.sky.u("ASP"), w / h);
      g.disable(g.DEPTH_TEST);
      g.depthMask(false);
      drawFull(P.sky);
      resetAttribs();
      g.depthMask(true);
      g.enable(g.DEPTH_TEST);
    };
    const opaque = (mir: number) => {
      common(P.opaque, mir);
      g.uniform4fv(P.opaque.u("SH"), shadowData);
      for (const m of [park, dynOpaque]) {
        if (!m.n) continue;
        bindMesh(P.opaque, m);
        g.drawArrays(g.TRIANGLES, 0, m.n);
      }
      resetAttribs();
    };

    // 1) reflexo do lago: o parque espelhado na altura da água, em meia resolução
    g.bindFramebuffer(g.FRAMEBUFFER, R.fb);
    g.viewport(0, 0, R.w, R.h);
    g.clear(g.DEPTH_BUFFER_BIT);
    sky(1, R.w, R.h);
    opaque(1);

    // 2) o parque: céu, coisas opacas e o lago
    g.bindFramebuffer(g.FRAMEBUFFER, A.fb);
    g.viewport(0, 0, A.w, A.h);
    g.clear(g.DEPTH_BUFFER_BIT);
    sky(0, A.w, A.h);
    opaque(0);
    common(P.water);
    g.activeTexture(g.TEXTURE0);
    g.bindTexture(g.TEXTURE_2D, R.tex);
    g.uniform1i(P.water.u("REFL"), 0);
    g.uniform2f(P.water.u("RES"), A.w, A.h);
    bindMesh(P.water, pond);
    g.drawArrays(g.TRIANGLES, 0, pond.n);
    resetAttribs();

    // 3) copia pra B (mesma profundidade) e desenha o vidro por cima, lendo o parque de A
    g.bindFramebuffer(g.FRAMEBUFFER, B.fb);
    g.disable(g.DEPTH_TEST);
    g.depthMask(false);
    g.useProgram(P.copy.p);
    g.bindTexture(g.TEXTURE_2D, A.tex);
    g.uniform1i(P.copy.u("SCENE"), 0);
    drawFull(P.copy);
    resetAttribs();
    g.enable(g.DEPTH_TEST);
    g.depthMask(true);
    // vidro: bonecos (com posição/virada) e a água da fonte
    const glassDraw = (pr: Prog) => {
      g.uniform4f(pr.u("MO"), 0, 0, 0, 0);
      g.uniform3fv(pr.u("TINT"), WATER_TINT);
      bindMesh(pr, fountain);
      g.drawArrays(g.TRIANGLES, 0, fountain.n);
      for (const f of figNow) {
        g.uniform4f(pr.u("MO"), f.at[0], f.at[1], f.at[2], f.ry);
        g.uniform3fv(pr.u("TINT"), f.tint);
        bindMesh(pr, f.m);
        g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, f.m.ib!);
        g.drawElements(g.TRIANGLES, f.m.ni!, g.UNSIGNED_SHORT, 0);
      }
      g.uniform4f(pr.u("MO"), 0, 0, 0, 0);
    };
    // primeiro só a profundidade (assim só a superfície da frente de cada boneco aparece)
    common(P.glass);
    g.uniform3fv(P.glass.u("CR"), V.r);
    g.uniform3fv(P.glass.u("CU"), V.u);
    g.colorMask(false, false, false, false);
    glassDraw(P.glass);
    g.colorMask(true, true, true, true);
    g.depthFunc(g.LEQUAL);
    g.depthMask(false);
    g.uniform1i(P.glass.u("SCENE"), 0);
    g.uniform2f(P.glass.u("RES"), A.w, A.h);
    glassDraw(P.glass);
    resetAttribs();
    // bolhas de sabão
    common(P.bub);
    g.uniform1i(P.bub.u("SCENE"), 0);
    g.uniform2f(P.bub.u("RES"), A.w, A.h);
    bindMesh(P.bub, bubMesh);
    for (const b of bubbles) {
      const r = b.r * Math.min(1, (t - b.born) * 3);
      g.uniform4f(P.bub.u("B"), b.x, b.y, b.z, r);
      g.drawArrays(g.TRIANGLES, 0, bubMesh.n);
    }
    resetAttribs();
    // vaga-lumes à noite
    const fk = (1 - L.day) * (1 - L.dusk * 0.6);
    if (fk > 0.02) {
      const fv: number[] = [];
      for (let i = 0; i < 16; i++) {
        const hs = (a: number, b: number) => {
          const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
          return x - Math.floor(x);
        };
        let x = hs(i, 1) * 16 - 7, y = 0.6 + hs(i, 2) * 1.6, z = 2 + hs(i, 3) * 12;
        x += Math.sin(t * 0.7 + i) * 0.6;
        y += Math.sin(t * 1.3 + i * 2) * 0.24;
        z += Math.cos(t * 0.6 + i) * 0.6;
        y += H(x, z);
        fv.push(x, y, z, 0, 0, 0, 0, 0, 0, fk * (0.5 + 0.5 * Math.sin(t * 3 + i * 1.7)));
      }
      update(flies, fv);
      common(P.fly);
      g.uniform1f(P.fly.u("PX"), A.h);
      g.enable(g.BLEND);
      g.blendFunc(g.ONE, g.ONE);
      bindMesh(P.fly, flies);
      g.drawArrays(g.POINTS, 0, flies.n);
      resetAttribs();
      g.disable(g.BLEND);
    }
    g.depthFunc(g.LESS);
    g.depthMask(true);

    // 4) tela: brilho do sol, reflexo de lente e vinheta
    g.bindFramebuffer(g.FRAMEBUFFER, null);
    g.viewport(0, 0, canvas.width, canvas.height);
    g.disable(g.DEPTH_TEST);
    g.useProgram(P.post.p);
    g.bindTexture(g.TEXTURE_2D, B.tex);
    g.uniform1i(P.post.u("SCENE"), 0);
    g.uniform1f(P.post.u("ASP"), aspect);
    g.uniform1f(P.post.u("SUNV"), Math.max(L.day, L.dusk * 0.8));
    g.uniform1f(P.post.u("DUSK"), L.dusk);
    drawFull(P.post);
    resetAttribs();
  }
  raf = requestAnimationFrame(frame);

  // mouse: aceno e clique nas bolhas (só quando o clique é no fundo, não em janela/ícone)
  const onMove = (e: PointerEvent) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  };
  const onDown = (e: PointerEvent) => {
    const top = document.elementFromPoint(e.clientX, e.clientY);
    if (top && top.closest("button, a, input, textarea, select, [role='dialog'], .win, .window, .taskbar, .widget")) return;
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      const p = project([b.x, b.y, b.z]);
      if (p && Math.hypot(p.x - e.clientX, p.y - e.clientY) < Math.max(14, b.r * p.s * 1.3)) {
        bubbles.splice(i, 1);
        sfx("pop");
        cheer = 1; // quem sopra comemora
        walk?.onPop?.();
        break;
      }
    }
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerdown", onDown);
  const onKeyDown = (e: KeyboardEvent) => {
    keys.add(e.code);
    if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
  };
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);
  const onBlur = () => keys.clear();
  if (walk) {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
  }

  const stop = () => {
    cancelAnimationFrame(raf);
    if (walk) {
      walking = Math.max(0, walking - 1);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    }
    ro.disconnect();
    canvas.removeEventListener("webglcontextlost", onLost);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerdown", onDown);
    if (!dead) {
      freeTargets();
      for (const pr of progs) gl.deleteProgram(pr.p);
    }
  };
  return Object.assign(stop, {
    talk(i: number) {
      talkTo = i;
      talkT = tNow;
    },
    endTalk() {
      talkTo = -1;
    },
  });
}
