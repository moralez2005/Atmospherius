// Gente da Neo-Tóquio em pixel art "alta": 24 x 60 px por pessoa, proporção de gente de verdade
// (cabeça ~1/7 do corpo), luz de neon batendo de lado (ciano de um lado, magenta do outro),
// sombra no tecido, ciclo de caminhada de 4 quadros e versão de frente e de costas.
// Na tela, quem está longe aparece levemente borrado (como foco de câmera na chuva) e quem
// está perto fica com o pixel nítido. Todo mundo deixa um reflexo no chão molhado.

type C = CanvasRenderingContext2D;

export const NPC_W = 24;
export const NPC_H = 60;

const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

type Look = {
  skin: string;
  skinD: string;
  hair: string;
  hairStyle: "short" | "long" | "bob" | "bun" | "cap" | "hood";
  top: string;
  topD: string;
  coat: "trench" | "jacket" | "hoodie" | "suit" | "raincoat" | "dress" | "tech" | "puffer" | "kimono";
  legs: string;
  shoes: string;
  prop: "none" | "umbrella" | "clearUmbrella" | "phone" | "bag" | "stroller";
  umb: string; // cor do cabo / borda do guarda-chuva
  mask: boolean; // máscara de LED
  height: number; // 0..3 px mais baixo
  led: boolean; // costuras de LED na roupa (moda futurista)
  visor: boolean; // viseira holográfica nos olhos
};

const SKINS: [string, string][] = [
  ["#f2cfb2", "#c99c84"],
  ["#d9a47c", "#a87458"],
  ["#a8714e", "#7a4c34"],
  ["#6e4630", "#4a2e20"],
  ["#f5d9c4", "#d4ae98"],
];
const CLOTH: [string, string][] = [
  ["#2a2a36", "#16161e"],
  ["#4a3a2a", "#2c2218"],
  ["#1e3040", "#101c26"],
  ["#3a1830", "#220c1c"],
  ["#5a5a64", "#34343c"],
  ["#14141a", "#08080c"],
  ["#6a2a2a", "#3c1414"],
  ["#2a4a3a", "#16281e"],
];
const HAIRS = ["#0d0b10", "#2a1a10", "#5a3a20", "#c8c4d0", "#ff4fb8", "#5ff3ff", "#8a1a2a"];
const NEON = ["95,243,255", "255,61,240", "255,170,60", "255,80,110", "160,120,255"];

function looks(): Look[] {
  const out: Look[] = [];
  // metade da cidade já se veste "do futuro": techwear com LED, jaqueta puffer brilhando, quimono neo
  const coats: Look["coat"][] = [
    "trench", "tech", "hoodie", "suit", "raincoat", "dress", "puffer", "jacket", "kimono", "tech",
    "raincoat", "trench", "dress", "puffer", "suit", "tech", "kimono", "hoodie", "jacket", "puffer",
    "dress", "tech", "trench", "raincoat",
  ];
  const props: Look["prop"][] = [
    "umbrella", "phone", "none", "clearUmbrella", "bag", "stroller", "phone", "none", "clearUmbrella", "umbrella",
    "stroller", "phone", "umbrella", "none", "bag", "clearUmbrella", "umbrella", "phone", "bag", "stroller",
    "phone", "none", "umbrella", "clearUmbrella",
  ];
  for (let i = 0; i < coats.length; i++) {
    const [skin, skinD] = SKINS[Math.floor(hash(i + 1) * SKINS.length)];
    const [top, topD] = CLOTH[Math.floor(hash(i + 2) * CLOTH.length)];
    const coat = coats[i];
    const styles: Look["hairStyle"][] =
      coat === "hoodie" ? ["hood"] : coat === "dress" || props[i] === "stroller" ? ["long", "bob", "bun"] : ["short", "long", "bob", "bun", "cap", "short"];
    out.push({
      skin,
      skinD,
      hair: HAIRS[Math.floor(hash(i + 3) * HAIRS.length)],
      hairStyle: styles[Math.floor(hash(i + 4) * styles.length)],
      top,
      topD,
      coat,
      legs: coat === "suit" ? topD : ["#1a1a24", "#20202a", "#2a2018", "#101014"][Math.floor(hash(i + 5) * 4)],
      shoes: "#07070a",
      prop: props[i],
      umb: NEON[Math.floor(hash(i + 6) * NEON.length)],
      mask: hash(i + 7) < 0.25,
      height: Math.floor(hash(i + 8) * 4),
      led: coat === "tech" || coat === "kimono" || hash(i + 9) < 0.35,
      visor: hash(i + 10) < 0.3,
    });
  }
  return out;
}

// desenha uma pessoa num canvas 24x60 (y cresce pra baixo; pés em y=59)
function paint(L: Look, back: boolean, f: number) {
  const cv = document.createElement("canvas");
  cv.width = NPC_W;
  cv.height = NPC_H;
  const c = cv.getContext("2d")!;
  const R = (x: number, y: number, w: number, h: number, col: string) => {
    c.fillStyle = col;
    c.fillRect(x, y, w, h);
  };
  const bob = f % 2 ? -1 : 0; // o corpo sobe um pouquinho a cada passo
  const top = 9 + L.height + bob; // topo da cabeça
  const lift = [0, 2, 0, -2][f]; // perna esquerda > 0 sobe, direita < 0 sobe
  const swing = [0, 1, 0, -1][f];
  const hipY = top + 27;
  const footY = 59;

  // pernas e sapatos
  const legL = footY - (lift > 0 ? lift : 0);
  const legR = footY - (lift < 0 ? -lift : 0);
  R(8, hipY, 3, legL - hipY - 1, L.legs);
  R(13, hipY, 3, legR - hipY - 1, L.legs);
  R(10, hipY, 1, legL - hipY - 1, "rgba(0,0,0,0.3)");
  R(15, hipY, 1, legR - hipY - 1, "rgba(0,0,0,0.3)");
  R(7, legL - 2, 4, 2, L.shoes);
  R(13, legR - 2, 4, 2, L.shoes);

  // tronco / roupa
  const sh = top + 9; // ombros
  const coatEnd =
    L.coat === "trench" || L.coat === "raincoat" || L.coat === "kimono" ? hipY + 14 : L.coat === "dress" ? hipY + 10 : L.coat === "puffer" ? hipY - 2 : hipY + 1;
  const neon = `rgb(${L.umb})`;
  // corpo com forma de gente: ombro caído, peito, cintura mais fina e casaco abrindo embaixo
  const long = L.coat === "trench" || L.coat === "raincoat" || L.coat === "dress" || L.coat === "kimono";
  const puff = L.coat === "puffer" ? 1 : 0; // jaqueta estufada fica mais larga
  for (let y = sh; y < coatEnd; y++) {
    const k = y - sh;
    let a = 6;
    let b = 18;
    if (k === 0) [a, b] = [8, 16];
    else if (k === 1) [a, b] = [7, 17];
    else if (k >= 10 && k < 16) [a, b] = [7, 17];
    else if (k >= 16) {
      const flare = long ? Math.min(3, Math.floor((k - 16) / 4) + 1) : 0;
      [a, b] = [7 - flare, 17 + flare];
    }
    a -= puff;
    b += puff;
    R(a, y, b - a, 1, L.top);
    R(b - 3, y, 3, 1, L.topD); // sombra do lado direito
    R(a, y, 1, 1, "rgba(255,255,255,0.08)"); // lado iluminado
  }
  R(11, sh + 6, 1, coatEnd - sh - 7, "rgba(0,0,0,0.22)");
  if (L.coat === "trench" || L.coat === "raincoat") {
    // abertura do sobretudo nas pernas, cinto e gola
    if (!back) {
      R(11, hipY, 2, coatEnd - hipY, "rgba(0,0,0,0.35)");
      R(9, sh, 2, 4, L.topD);
      R(13, sh, 2, 4, L.topD);
    }
    R(6, hipY - 2, 12, 1, L.topD);
    if (L.coat === "raincoat") R(6, sh + 1, 12, coatEnd - sh - 1, "rgba(180,220,255,0.12)"); // plástico brilhando
  } else if (L.coat === "suit" && !back) {
    R(11, sh, 2, 9, "#d8d8e0"); // camisa
    R(11, sh + 1, 2, 7, "#2a1020"); // gravata
    R(10, sh, 1, 10, L.topD);
    R(13, sh, 1, 10, L.topD);
  } else if (L.coat === "hoodie") {
    if (!back) R(9, sh + 9, 6, 4, L.topD); // bolso canguru
    R(11, sh + 1, 1, 6, "rgba(255,255,255,0.35)"); // cordão
  } else if (L.coat === "dress") {
    R(5, hipY, 14, coatEnd - hipY, L.top);
    R(16, hipY, 3, coatEnd - hipY, L.topD);
  } else if (L.coat === "jacket" && !back) {
    R(11, sh, 2, hipY - sh, "#c8c8d0"); // camiseta aparecendo
  } else if (L.coat === "tech") {
    // techwear: gola alta, alças cruzadas e bolsos táticos
    R(9, sh - 2, 6, 3, L.topD);
    for (let k = 0; k < 10; k++) R(7 + k, sh + 2 + k, 1, 1, "rgba(200,200,220,0.35)");
    if (!back) {
      R(7, hipY - 6, 3, 3, L.topD);
      R(14, hipY - 6, 3, 3, L.topD);
    }
    R(8, hipY, 8, 2, "#0a0a10"); // cinto com fivela
    R(11, hipY, 2, 2, neon);
  } else if (L.coat === "puffer") {
    // gomos estufados com brilho
    for (let y = sh + 3; y < coatEnd; y += 4) R(6, y, 12, 1, L.topD);
    R(6, sh + 1, 12, 1, "rgba(255,255,255,0.18)");
    if (!back) R(11, sh, 1, coatEnd - sh, "rgba(255,255,255,0.3)"); // zíper
  } else if (L.coat === "kimono") {
    // quimono neo: gola cruzada, mangas largas e faixa (obi) acesa
    if (!back) {
      for (let k = 0; k < 7; k++) {
        R(9 + Math.floor(k / 2), sh + k, 1, 1, "#e8e0f0");
        R(14 - Math.floor(k / 2), sh + k, 1, 1, L.topD);
      }
    }
    R(6, hipY - 4, 12, 3, "#0d0b14");
    R(6, hipY - 3, 12, 1, neon);
  }
  // costuras de LED na roupa (a moda da cidade)
  if (L.led && L.coat !== "kimono") {
    R(7, sh + 2, 1, coatEnd - sh - 3, neon);
    R(16, sh + 2, 1, coatEnd - sh - 3, `rgba(${L.umb},0.6)`);
    if (L.coat === "trench" || L.coat === "raincoat") R(5, coatEnd - 1, 14, 1, neon);
  }

  // braços (balançando no passo) e mãos
  const armY = sh + 1;
  const armLen = 15;
  const holding = L.prop === "umbrella" || L.prop === "clearUmbrella" || L.prop === "phone";
  const sleeve = L.coat === "kimono" ? 2 : 0; // manga larga do quimono
  if (L.prop === "stroller") {
    // empurrando o carrinho: os dois braços pra frente, mãos na alça
    for (const [x, d] of [[4, 1], [18, -1]] as const) {
      R(x, armY, 2, 8, L.topD);
      R(x + d * 2 + (d < 0 ? 0 : 0), armY + 7, 4, 2, L.topD);
    }
    R(7, armY + 8, 2, 2, L.skin);
    R(15, armY + 8, 2, 2, L.skin);
  } else {
    R(4 - sleeve, armY + swing, 2 + sleeve, armLen - sleeve * 3, L.top);
    R(4, armY + armLen + swing, 2, 2, L.skin);
  }
  if (L.prop === "stroller") {
    // (já desenhado acima)
  } else if (holding) {
    // braço direito dobrado segurando alguma coisa na frente do peito
    R(18, armY, 2, 7, L.topD);
    R(15, armY + 6, 4, 2, L.topD);
    R(14, armY + 6, 2, 2, L.skin);
  } else {
    R(18, armY - swing, 2 + sleeve, armLen - sleeve * 3, L.topD);
    R(18, armY + armLen - swing, 2, 2, L.skinD);
  }

  // pescoço e cabeça (6 x 8)
  R(10, top + 7, 4, 2, L.skinD);
  R(9, top, 6, 8, L.skin);
  R(14, top + 1, 1, 7, L.skinD);
  R(9, top + 7, 6, 1, L.skinD);
  if (!back) {
    // olhos, nariz e boca bem discretos
    R(10, top + 3, 1, 1, "#1a1018");
    R(13, top + 3, 1, 1, "#1a1018");
    R(12, top + 4, 1, 2, L.skinD);
    if (L.visor) {
      // viseira holográfica translúcida sobre os olhos
      R(8, top + 2, 8, 3, `rgba(${L.umb},0.55)`);
      R(8, top + 2, 8, 1, neon);
    } else if (L.mask) {
      R(9, top + 5, 6, 3, "#121218");
      R(10, top + 6, 4, 1, `rgb(${L.umb})`); // máscara com faixa de LED
    } else R(11, top + 6, 2, 1, "#8a4a4a");
  }
  if (back && L.visor) R(8, top + 3, 8, 1, neon); // tira da viseira por trás
  // cabelo
  const hs = L.hairStyle;
  if (hs === "hood") {
    R(8, top - 1, 8, 4, L.top);
    R(8, top, 1, 9, L.top);
    R(15, top, 1, 9, L.topD);
    if (back) R(9, top, 6, 8, L.top);
  } else if (hs === "cap") {
    R(8, top - 1, 8, 3, "#1a1a22");
    if (!back) R(7, top + 1, 6, 1, "#1a1a22");
    if (back) R(9, top + 2, 6, 3, L.hair);
  } else {
    R(9, top - 1, 6, 2, L.hair);
    R(8, top, 1, hs === "short" ? 3 : 5, L.hair);
    R(15, top, 1, hs === "short" ? 3 : 5, L.hair);
    if (!back) R(9, top + 1, 4, 1, L.hair); // franja
    if (back) R(9, top, 6, hs === "short" ? 5 : 8, L.hair);
    if (hs === "long") {
      R(8, top + 5, 1, 9, L.hair);
      R(15, top + 5, 1, 9, L.hair);
      if (back) R(9, top + 8, 6, 6, L.hair);
    } else if (hs === "bob") {
      R(8, top + 4, 1, 4, L.hair);
      R(15, top + 4, 1, 4, L.hair);
    } else if (hs === "bun") {
      R(10, top - 3, 4, 3, L.hair);
    }
  }

  // acessórios
  if (L.prop === "phone" && !back) {
    R(13, armY + 3, 3, 4, "#cff8ff"); // tela acesa
    R(10, top + 3, 4, 3, "rgba(190,248,255,0.25)"); // luz no rosto
  } else if (L.prop === "bag") {
    R(3, hipY - 4, 3, 7, "#3a2a1a");
    R(4, sh + 2, 1, hipY - sh - 6, "#2a1a10");
  } else if (L.prop === "umbrella" || L.prop === "clearUmbrella") {
    const clear = L.prop === "clearUmbrella";
    // cabo aceso subindo da mão e a cúpula por cima da cabeça
    R(15, top - 7, 1, armY + 7 - (top - 7), `rgb(${L.umb})`);
    const domeY = top - 9;
    const fill = clear ? "rgba(200,230,255,0.28)" : "#18182a";
    R(5, domeY + 1, 20 - 5, 1, fill);
    R(2, domeY + 2, 21, 2, fill);
    R(1, domeY + 4, 23, 1, fill);
    R(8, domeY, 15 - 8, 1, fill);
    // borda acesa (neon) e as varetas
    R(0, domeY + 5, 24, 1, `rgb(${L.umb})`);
    if (!clear) for (const x of [4, 9, 14, 19]) R(x, domeY + 2, 1, 3, "rgba(255,255,255,0.08)");
    else R(4, domeY + 2, 16, 1, "rgba(255,255,255,0.4)");
  }

  // luz de neon batendo nas bordas: ciano na esquerda, magenta na direita
  const img = c.getImageData(0, 0, NPC_W, NPC_H);
  const d = img.data;
  const solid = (x: number, y: number) => x >= 0 && x < NPC_W && d[(y * NPC_W + x) * 4 + 3] > 0;
  const rim: [number, number, number, number][] = [];
  for (let y = 0; y < NPC_H; y++)
    for (let x = 0; x < NPC_W; x++) {
      if (!solid(x, y)) continue;
      if (!solid(x - 1, y)) rim.push([x, y, 0, 0]);
      else if (!solid(x + 1, y)) rim.push([x, y, 1, 0]);
    }
  for (const [x, y, side] of rim) {
    const i = (y * NPC_W + x) * 4;
    const [r, g, b] = side ? [255, 80, 220] : [95, 243, 255];
    const k = side ? 0.32 : 0.45; // o ciano bate mais forte que o magenta
    d[i] = Math.round(d[i] * (1 - k) + r * k);
    d[i + 1] = Math.round(d[i + 1] * (1 - k) + g * k);
    d[i + 2] = Math.round(d[i + 2] * (1 - k) + b * k);
  }
  c.putImageData(img, 0, 0);
  return cv;
}

// carrinho de bebê do futuro: casco arredondado, capota, faixa de luz e rodinhas acesas
export const STROLLER_W = 22;
export const STROLLER_H = 24;
function paintStroller(rgb: string, back: boolean, f: number) {
  const cv = document.createElement("canvas");
  cv.width = STROLLER_W;
  cv.height = STROLLER_H;
  const c = cv.getContext("2d")!;
  const R = (x: number, y: number, w: number, h: number, col: string) => {
    c.fillStyle = col;
    c.fillRect(x, y, w, h);
  };
  // alça
  R(4, 0, 14, 1, "#2a2a34");
  R(4, 0, 1, 7, "#2a2a34");
  R(17, 0, 1, 7, "#2a2a34");
  // capota (de frente ela cobre o bebê; de trás aparece a alça e o casco)
  R(4, 6, 14, 3, "#e8e4f0");
  R(3, 8, 16, 2, "#e8e4f0");
  R(3, 10, 16, 6, "#f4f0fa");
  R(15, 8, 4, 8, "#c8c0d8");
  if (!back) {
    R(6, 10, 10, 4, "#1a1630"); // abertura da capota
    R(9, 12, 4, 2, "#f2cfb2"); // rostinho do bebê
    R(9, 11, 4, 1, `rgb(${rgb})`); // touquinha
  }
  R(3, 15, 16, 1, `rgb(${rgb})`); // faixa de luz
  // rodinhas (giram: muda o brilho)
  for (const x of [3, 15]) {
    R(x, 18, 4, 5, "#0a0a10");
    R(x + 1, 19 + (f % 2), 2, 2, `rgb(${rgb})`);
  }
  R(6, 16, 10, 2, "#2a2a34");
  return cv;
}
let STROLLERS: HTMLCanvasElement[][] | null = null;
export function stroller(v: number, back: boolean, f: number) {
  if (!STROLLERS)
    STROLLERS = NEON.map((rgb) => [paintStroller(rgb, false, 0), paintStroller(rgb, false, 1), paintStroller(rgb, true, 0), paintStroller(rgb, true, 1)]);
  return STROLLERS[v % STROLLERS.length][(back ? 2 : 0) + (f % 2)];
}

let LOOKS: Look[] | null = null;
export function npcPushesStroller(v: number) {
  if (!LOOKS) LOOKS = looks();
  return LOOKS[v % LOOKS.length].prop === "stroller";
}

let CACHE: { front: HTMLCanvasElement[]; back: HTMLCanvasElement[] }[] | null = null;
export function npc(v: number, back: boolean, f: number) {
  if (!CACHE)
    CACHE = (LOOKS ??= looks()).map((L) => ({
      front: [0, 1, 2, 3].map((f) => paint(L, false, f)),
      back: [0, 1, 2, 3].map((f) => paint(L, true, f)),
    }));
  const k = CACHE[v % CACHE.length];
  return (back ? k.back : k.front)[f % 4];
}
export const NPC_COUNT = 24;

const SOFT = new Map<HTMLCanvasElement, HTMLCanvasElement>();
function soft(src: HTMLCanvasElement) {
  let cv = SOFT.get(src);
  if (cv) return cv;
  cv = document.createElement("canvas");
  cv.width = src.width * 3;
  cv.height = src.height * 3;
  const c = cv.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  c.filter = "blur(1.6px)";
  c.drawImage(src, 0, 0, cv.width, cv.height);
  SOFT.set(src, cv);
  return cv;
}

// desenha alguém em pé no chão em (x, yb) com altura h na tela:
// longe = levemente borrado; perto = pixel nítido; sempre com reflexo no chão molhado
export function drawNPC(c: C, img: HTMLCanvasElement, x: number, yb: number, h: number, ratio = NPC_W / NPC_H) {
  const w = h * ratio;
  const yt = yb - h;
  c.save();
  // de longe: versão levemente borrada (pré-calculada, sem filtro por quadro); de perto: pixel puro
  const far = h < 80;
  c.imageSmoothingEnabled = far;
  if (far) img = soft(img);
  c.drawImage(img, x - w / 2, yt, w, h);
  // reflexo no asfalto molhado
  c.globalAlpha = 0.18;
  c.translate(0, yb * 2);
  c.scale(1, -1);
  c.drawImage(img, x - w / 2, yb - h * 0.6, w, h * 0.6);
  c.restore();
}
