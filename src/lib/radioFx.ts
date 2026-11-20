// Sons de aparelho para as rádios de cada estética (Web Audio, sem arquivos):
// - Synthwave: toca-fitas do carro (tecla mecânica, avanço rápido, chiado de fita)
// - Vaporwave: videocassete (carregar fita, rebobinar, parada de fita, chiado com estalos)
// - Frutiger Aero: som digital limpo (bolhas e sininho de vidro)
// - Gen X Soft Club: discman (CD acelerando, leitor buscando faixa, CD parando)
// Ao trocar de estética, chiado de sintonia (no Soft Club, conexão discada). Segue a opção "Sons do sistema".
import type { ThemeId } from "@/config/themes";
import { getUiSound } from "./uiSound";

let ac: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function audio() {
  if (!getUiSound()) return null;
  try {
    ac ??= new AudioContext();
    if (ac.state === "suspended") ac.resume().catch(() => {});
    if (!noise) {
      noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return ac;
  } catch {
    return null;
  }
}

// envelope simples: sobe em `a`, segura em `h`, desce em `r`
function envelope(g: GainNode, t: number, v: number, a: number, h: number, r: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + a);
  g.gain.setValueAtTime(v, t + a + h);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + h + r);
}

function tone(a: AudioContext, t: number, f0: number, f1: number, d: number, v: number, type: OscillatorType = "sine") {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + d);
  envelope(g, t, v, Math.min(0.02, d / 4), d * 0.5, d * 0.5);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + d + 0.05);
}

// ruído filtrado com o centro do filtro indo de f0 a f1
function hiss(a: AudioContext, t: number, d: number, v: number, f0: number, f1: number, q = 1, type: BiquadFilterType = "bandpass") {
  const s = a.createBufferSource();
  s.buffer = noise;
  s.loop = true;
  const f = a.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(f1, t + d);
  const g = a.createGain();
  envelope(g, t, v, Math.min(0.03, d / 4), d * 0.6, d * 0.4);
  s.connect(f).connect(g).connect(a.destination);
  s.start(t, Math.random());
  s.stop(t + d + 0.05);
}

// estalo curto (tecla, clique, poeira)
function click(a: AudioContext, t: number, v: number, f = 2500) {
  hiss(a, t, 0.025, v, f, f, 0.8);
}

// "tum" grave de mecanismo
function thump(a: AudioContext, t: number, v: number) {
  tone(a, t, 140, 60, 0.09, v, "sine");
  click(a, t, v * 0.6, 1800);
}

export type RadioAction = "play" | "pause" | "next";

/* ----------------- sons de botão, por aparelho ----------------- */
export function radioSound(theme: ThemeId, action: RadioAction) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + 0.01;
  if (theme === "synthwave") {
    // toca-fitas: tecla pesada; no avanço, o motor gira rápido antes de voltar a tocar
    if (action === "next") {
      thump(a, t, 0.12);
      hiss(a, t + 0.05, 0.7, 0.05, 900, 3800, 2);
      tone(a, t + 0.05, 180, 420, 0.7, 0.025, "sawtooth");
      thump(a, t + 0.8, 0.1);
    } else {
      thump(a, t, action === "play" ? 0.14 : 0.1);
      click(a, t + 0.05, 0.05, 3500);
    }
  } else if (theme === "vaporwave") {
    // videocassete: carrega a fita, rebobina chiando, para descendo o tom
    if (action === "play") {
      click(a, t, 0.08, 1400);
      tone(a, t + 0.04, 70, 110, 0.5, 0.05, "triangle");
      hiss(a, t + 0.1, 0.45, 0.04, 600, 1400, 1.5);
    } else if (action === "pause") {
      tone(a, t, 520, 60, 0.45, 0.05, "sawtooth");
      click(a, t + 0.42, 0.06, 1200);
    } else {
      click(a, t, 0.07, 1400);
      for (let i = 0; i < 9; i++) hiss(a, t + 0.05 + i * 0.06, 0.05, 0.05, 2400 + i * 120, 3000, 3);
      tone(a, t + 0.05, 300, 900, 0.55, 0.02, "square");
      click(a, t + 0.62, 0.06, 1400);
    }
  } else if (theme === "frutiger") {
    // digital e limpo: bolhas subindo e sininho de vidro
    if (action === "pause") {
      tone(a, t, 1568, 1046, 0.25, 0.035);
      tone(a, t + 0.08, 1046, 784, 0.35, 0.03);
    } else {
      const up = action === "next" ? 4 : 3;
      for (let i = 0; i < up; i++) tone(a, t + i * 0.06, 500 + i * 220, 900 + i * 300, 0.07, 0.035);
      tone(a, t + up * 0.06, 2093, 2093, 0.5, 0.025);
      tone(a, t + up * 0.06 + 0.04, 3136, 3136, 0.4, 0.012);
    }
  } else {
    // discman: tampa/botão, CD acelerando com o laser procurando a faixa
    if (action === "pause") {
      click(a, t, 0.06, 3000);
      tone(a, t, 1400, 120, 0.7, 0.02, "sine");
    } else {
      click(a, t, 0.06, 3000);
      tone(a, t + 0.03, 150, 1600, 0.8, 0.02, "sine");
      const seeks = action === "next" ? 6 : 4;
      for (let i = 0; i < seeks; i++) click(a, t + 0.12 + i * 0.07 + Math.random() * 0.02, 0.05, 4500);
      tone(a, t + 0.15 + seeks * 0.07, 2637, 2637, 0.06, 0.015, "square"); // bipe do anti-skip
    }
  }
}

/* ----------------- chiado de sintonia ao trocar de estação ----------------- */
// conexão discada (curtinha): discagem, apito e o "chiado" de negociação do modem
function dialup(a: AudioContext, t: number) {
  const DTMF = [[697, 1209], [770, 1336], [852, 1477], [697, 1336], [941, 1336]];
  DTMF.forEach(([lo, hi], i) => {
    tone(a, t + i * 0.09, lo, lo, 0.06, 0.02);
    tone(a, t + i * 0.09, hi, hi, 0.06, 0.02);
  });
  const h = t + 0.5;
  tone(a, h, 2100, 2100, 0.3, 0.018);
  for (let i = 0; i < 6; i++) {
    tone(a, h + 0.32 + i * 0.1, i % 2 ? 1200 : 2400, i % 2 ? 1800 : 1000, 0.09, 0.014, "square");
  }
  hiss(a, h + 0.35, 0.65, 0.05, 1800, 2600, 0.6);
}

export function tuneSound(theme: ThemeId) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + 0.01;
  // Soft Club: em vez de chiado de rádio, conexão discada dos anos 2000
  if (theme === "softclub") return dialup(a, t);
  hiss(a, t, 0.75, 0.06, 500, 3500, 0.7);
  // assobio de sintonia passando pelas estações
  tone(a, t + 0.1, 900, 2200, 0.25, 0.012, "sine");
  tone(a, t + 0.4, 1800, 700, 0.25, 0.01, "sine");
  for (let i = 0; i < 5; i++) click(a, t + Math.random() * 0.7, 0.03, 1500 + Math.random() * 3000);
  // fecha com o som do aparelho novo
  if (theme === "frutiger") tone(a, t + 0.8, 2093, 2093, 0.3, 0.02);
  else thump(a, t + 0.8, 0.08);
}

/* ----------------- chiado de fundo enquanto toca ----------------- */
// Fita (Synthwave) tem chiado baixinho. (O Vaporwave ficou sem chiado e sem os estalos
// que pareciam cliques de golfinho; efeitos sonoros dele ficam pra depois.)
let bed: { src: AudioBufferSourceNode; gain: GainNode; theme: ThemeId } | null = null;
let crackle: ReturnType<typeof setInterval> | undefined;

const BED: Partial<Record<ThemeId, { f: number; v: number }>> = {
  synthwave: { f: 5000, v: 0.006 },
};

export function setRadioBed(theme: ThemeId | null, volume: number) {
  const cfg = theme ? BED[theme] : undefined;
  const level = cfg ? cfg.v * Math.min(1, Math.max(0, volume / 40)) : 0;
  if (!cfg || level <= 0) return stopBed();
  const a = audio();
  if (!a) return stopBed();
  if (bed && bed.theme === theme) {
    bed.gain.gain.setTargetAtTime(level, a.currentTime, 0.2);
    return;
  }
  stopBed();
  const src = a.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const f = a.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = cfg.f;
  const gain = a.createGain();
  gain.gain.setValueAtTime(0.0001, a.currentTime);
  gain.gain.setTargetAtTime(level, a.currentTime, 0.4);
  src.connect(f).connect(gain).connect(a.destination);
  src.start();
  bed = { src, gain, theme: theme! };
}

function stopBed() {
  clearInterval(crackle);
  crackle = undefined;
  if (!bed || !ac) return;
  const b = bed;
  bed = null;
  b.gain.gain.setTargetAtTime(0.0001, ac.currentTime, 0.15);
  setTimeout(() => {
    try {
      b.src.stop();
    } catch {}
  }, 600);
}

/* ----------------- porta do carro e motor (Synthwave) ----------------- */
export function carSound(kind: "enter" | "exit" | "horn" | "lights") {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + 0.01;
  if (kind === "horn") {
    // buzina de dois tons
    for (const f of [349, 440]) {
      const o = a.createOscillator();
      const lp = a.createBiquadFilter();
      const g = a.createGain();
      o.type = "square";
      o.frequency.value = f;
      lp.type = "lowpass";
      lp.frequency.value = 1800;
      envelope(g, t, 0.05, 0.02, 0.38, 0.12);
      o.connect(lp).connect(g).connect(a.destination);
      o.start(t);
      o.stop(t + 0.6);
    }
    return;
  }
  if (kind === "lights") {
    click(a, t, 0.08, 2600);
    return;
  }
  // porta batendo
  thump(a, t, 0.16);
  click(a, t + 0.01, 0.06, 900);
  if (kind === "enter") {
    // motor ligando: ronco grave subindo e assentando
    const o = a.createOscillator();
    const f = a.createBiquadFilter();
    const g = a.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(38, t + 0.35);
    o.frequency.exponentialRampToValueAtTime(95, t + 0.8);
    o.frequency.exponentialRampToValueAtTime(52, t + 1.6);
    f.type = "lowpass";
    f.frequency.value = 320;
    envelope(g, t + 0.35, 0.09, 0.08, 0.9, 0.5);
    o.connect(f).connect(g).connect(a.destination);
    o.start(t + 0.35);
    o.stop(t + 2);
  }
}

/* ----------------- motor e vento enquanto dirige (Synthwave) ----------------- */
// Som contínuo: o ronco segue o giro do motor (sobe a cada marcha e cai na troca)
// e o vento cresce com a velocidade, muito mais forte com a janela ou o teto solar aberto.
let ride: {
  o1: OscillatorNode;
  o2: OscillatorNode;
  o3: OscillatorNode; // sub-grave (seno uma oitava abaixo): dá o peso do motor
  sg: GainNode;
  lp: BiquadFilterNode;
  eg: GainNode;
  wind: AudioBufferSourceNode;
  wf: BiquadFilterNode;
  wg: GainNode;
} | null = null;

export function rideSound(on: boolean) {
  if (!on) {
    if (!ride || !ac) return;
    const r = ride;
    ride = null;
    r.eg.gain.setTargetAtTime(0.0001, ac.currentTime, 0.12);
    r.sg.gain.setTargetAtTime(0.0001, ac.currentTime, 0.12);
    r.wg.gain.setTargetAtTime(0.0001, ac.currentTime, 0.12);
    setTimeout(() => {
      try {
        r.o1.stop();
        r.o2.stop();
        r.o3.stop();
        r.wind.stop();
      } catch {}
    }, 700);
    return;
  }
  if (ride) return;
  const a = audio();
  if (!a) return;
  const o1 = a.createOscillator();
  const o2 = a.createOscillator();
  o1.type = "sawtooth";
  o2.type = "square";
  o1.frequency.value = 40;
  o2.frequency.value = 20;
  const lp = a.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 200;
  lp.Q.value = 6;
  const eg = a.createGain();
  eg.gain.value = 0.0001;
  const sub = a.createGain();
  sub.gain.value = 0.6;
  o1.connect(lp);
  o2.connect(sub).connect(lp);
  lp.connect(eg).connect(a.destination);
  const o3 = a.createOscillator();
  o3.type = "sine";
  o3.frequency.value = 30;
  const sg = a.createGain();
  sg.gain.value = 0.0001;
  o3.connect(sg).connect(a.destination);
  const wind = a.createBufferSource();
  wind.buffer = noise;
  wind.loop = true;
  const wf = a.createBiquadFilter();
  wf.type = "bandpass";
  wf.Q.value = 0.7;
  wf.frequency.value = 500;
  const wg = a.createGain();
  wg.gain.value = 0.0001;
  wind.connect(wf).connect(wg).connect(a.destination);
  o1.start();
  o2.start();
  o3.start();
  wind.start(0, Math.random());
  ride = { o1, o2, o3, sg, lp, eg, wind, wf, wg };
}

// rpm e acelerador de 0 a 1; vento de 0 a ~1.2; velocidade de 0 a ~3.3
// O tom segue principalmente a velocidade (vai ficando mais agudo devagar, como um carro
// de verdade ganhando embalo) e só um pouco o giro: na troca de marcha ele dá uma leve
// caída suave, sem cortar o som.
let lastGas = 0;
let tone01 = 0;
export function rideUpdate(rpm: number, gas: number, wind: number, speed = 0) {
  if (!ride || !ac) return;
  if (!getUiSound()) return rideSound(false);
  const t = ac.currentTime;
  // pisou fundo saindo devagar: rugido grave e longo de arranque
  if (gas > 0.5 && lastGas < 0.15 && speed < 0.6) launchSound();
  lastGas = gas;
  const target = Math.min(1, speed / 3.6) * 0.7 + rpm * 0.3;
  tone01 += (target - tone01) * 0.035; // bem suavizado: nada de saltos
  const f = 32 + tone01 * 135 + gas * 6;
  ride.o1.frequency.setTargetAtTime(f, t, 0.12);
  ride.o2.frequency.setTargetAtTime(f / 2, t, 0.12);
  ride.o3.frequency.setTargetAtTime(f, t, 0.12);
  ride.lp.frequency.setTargetAtTime(170 + gas * 600 + tone01 * 700, t, 0.15);
  // pisou fundo = ronco cheio (bem mais alto que só rodando)
  ride.eg.gain.setTargetAtTime(0.035 + gas * 0.085 + tone01 * 0.03, t, 0.12);
  ride.sg.gain.setTargetAtTime(0.06 + gas * 0.11 + tone01 * 0.03, t, 0.12);
  // rajadas: o vento oscila um pouco sozinho
  const gust = 0.85 + Math.sin(t * 1.7) * 0.1 + Math.sin(t * 4.3) * 0.05;
  ride.wf.frequency.setTargetAtTime(350 + wind * 900 * gust, t, 0.2);
  ride.wg.gain.setTargetAtTime(Math.max(0.0001, wind * 0.11 * gust), t, 0.15);
}

// arranque: o motor ruge grave, sobe e assenta, com o "tranco" do pneu no asfalto
function launchSound() {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + 0.01;
  const o = a.createOscillator();
  const s = a.createOscillator();
  const lp = a.createBiquadFilter();
  const g = a.createGain();
  o.type = "sawtooth";
  s.type = "sine";
  // sobe devagar por ~3 s, junto com o carro ganhando velocidade
  o.frequency.setValueAtTime(40, t);
  o.frequency.exponentialRampToValueAtTime(62, t + 0.9);
  o.frequency.exponentialRampToValueAtTime(92, t + 2.6);
  s.frequency.setValueAtTime(40, t);
  s.frequency.exponentialRampToValueAtTime(62, t + 0.9);
  s.frequency.exponentialRampToValueAtTime(92, t + 2.6);
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(130, t);
  lp.frequency.exponentialRampToValueAtTime(520, t + 2.4);
  lp.Q.value = 7;
  envelope(g, t, 0.26, 0.08, 2.2, 1.0);
  o.connect(lp);
  s.connect(lp);
  lp.connect(g).connect(a.destination);
  o.start(t);
  s.start(t);
  o.stop(t + 3.5);
  s.stop(t + 3.5);
  hiss(a, t, 1.4, 0.1, 90, 60, 0.7, "lowpass"); // pneu raspando no asfalto
  hiss(a, t, 0.9, 0.035, 2600, 1200, 1.2); // cantada de pneu
  thump(a, t, 0.22);
  // escape estalando quando o motor enche
  for (const k of [0.55, 0.8, 1.3]) thump(a, t + k, 0.07);
}

// "tum" curtinho da troca de marcha
export function shiftSound() {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + 0.01;
  click(a, t, 0.05, 1600);
  tone(a, t, 120, 70, 0.08, 0.04, "triangle");
}

// moto de luz passando do seu lado: o motor elétrico vem subindo de tom por trás,
// passa colado (mais alto e com vento) e cai de tom indo embora — efeito Doppler de verdade
export function bikeSound() {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + 0.01;
  const out = a.createGain();
  const pan = a.createStereoPanner();
  out.connect(pan).connect(a.destination);
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(0.022, t + 0.9); // chegando
  out.gain.exponentialRampToValueAtTime(0.04, t + 1.05); // do seu lado (bem mais baixo que o motor)
  out.gain.exponentialRampToValueAtTime(0.0001, t + 2.4); // sumindo lá na frente
  pan.pan.setValueAtTime(-0.2, t);
  pan.pan.linearRampToValueAtTime(-0.85, t + 1.05);
  pan.pan.linearRampToValueAtTime(0.1, t + 2.4);
  const lp = a.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(900, t);
  lp.frequency.exponentialRampToValueAtTime(5200, t + 1.05);
  lp.frequency.exponentialRampToValueAtTime(700, t + 2.4);
  lp.connect(out);
  // zunido do motor (duas vozes levemente desafinadas = aquele "chorus" de anime)
  for (const [type, mul, v] of [["sawtooth", 1, 0.5], ["sawtooth", 1.007, 0.5], ["square", 0.5, 0.35]] as const) {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(380 * mul, t);
    o.frequency.exponentialRampToValueAtTime(470 * mul, t + 1.0); // subindo enquanto chega
    o.frequency.exponentialRampToValueAtTime(300 * mul, t + 1.25); // o Doppler: cai na hora que passa
    o.frequency.exponentialRampToValueAtTime(260 * mul, t + 2.4);
    g.gain.value = v;
    o.connect(g).connect(lp);
    o.start(t);
    o.stop(t + 2.5);
  }
  // tremolo rápido do motor elétrico
  const lfo = a.createOscillator();
  const lg = a.createGain();
  lfo.frequency.value = 38;
  lg.gain.value = 0.25;
  lfo.connect(lg).connect(out.gain);
  lfo.start(t);
  lfo.stop(t + 2.5);
  // deslocamento de ar quando passa
  hiss(a, t + 0.85, 0.7, 0.028, 3500, 500, 0.7);
}

// "voz" do locutor da rádio: não é fala de verdade, são sílabas sintetizadas (pulso vocal
// passando por formantes de vogais, com entonação de quem fala no microfone) e filtradas
// como rádio AM/FM, com um chiado leve. Dura o tempo da legenda. Devolve uma função pra parar.
export function djVoice(ms: number, o: { pitch?: number; radio?: boolean; vol?: number } = {}) {
  const base = o.pitch ?? 118;
  const radio = o.radio ?? true;
  const a = audio();
  if (!a) return () => {};
  const t0 = a.currentTime + 0.05;
  const dur = ms / 1000;
  const out = a.createGain();
  out.gain.value = 0.0001;
  // cara de rádio: corta grave e agudo, e "satura" de leve
  const hp = a.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = radio ? 320 : 90;
  const lp = a.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = radio ? 3200 : 2400;
  const sh = a.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i / 255) * 2 - 1;
    curve[i] = Math.tanh(x * 2.2);
  }
  sh.curve = curve;
  out.connect(hp).connect(lp).connect(sh);
  const master = a.createGain();
  master.gain.value = o.vol ?? 0.32;
  sh.connect(master).connect(a.destination);
  // pregas vocais: dente de serra grave com vibrato e entonação
  const src = a.createOscillator();
  src.type = "sawtooth";
  const f1 = a.createBiquadFilter();
  const f2 = a.createBiquadFilter();
  f1.type = f2.type = "bandpass";
  f1.Q.value = 7;
  f2.Q.value = 9;
  const g1 = a.createGain();
  const g2 = a.createGain();
  g1.gain.value = 1;
  g2.gain.value = 0.55;
  src.connect(f1).connect(g1).connect(out);
  src.connect(f2).connect(g2).connect(out);
  const VOW = [[730, 1090], [530, 1840], [300, 2280], [570, 840], [440, 1020], [660, 1700]];
  let t = t0;
  let i = 0;
  while (t < t0 + dur - 0.1) {
    const syl = 0.09 + Math.random() * 0.1;
    const gap = Math.random() < 0.14 ? 0.18 + Math.random() * 0.2 : 0.025; // pausa de vírgula de vez em quando
    const [fa, fb] = VOW[Math.floor(Math.random() * VOW.length)];
    // voz de locutor: grave, descendo no fim das frases
    const phrase = ((t - t0) % 2.4) / 2.4;
    const pitch = base + Math.sin(i * 1.7) * base * 0.1 - phrase * base * 0.15 + Math.random() * 6;
    src.frequency.setTargetAtTime(pitch, t, 0.03);
    f1.frequency.setTargetAtTime(fa, t, 0.02);
    f2.frequency.setTargetAtTime(fb, t, 0.02);
    out.gain.setTargetAtTime(0.5 + Math.random() * 0.35, t, 0.015);
    out.gain.setTargetAtTime(0.0001, t + syl, 0.02);
    t += syl + gap;
    i++;
  }
  src.start(t0);
  src.stop(t0 + dur + 0.3);
  if (radio) hiss(a, t0, dur, 0.008, 2500, 2500, 0.5); // chiado da transmissão
  return () => {
    try {
      master.gain.setTargetAtTime(0.0001, a.currentTime, 0.05);
      src.stop(a.currentTime + 0.2);
    } catch {}
  };
}

// pneu cantando numa curva forte (k = 0..1, mais alto quanto mais rápido)
export function skidSound(k: number) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + 0.01;
  hiss(a, t, 0.55 + k * 0.3, 0.025 + k * 0.03, 1700 + k * 500, 1300, 6);
  hiss(a, t + 0.05, 0.4, 0.015 + k * 0.015, 900, 700, 3);
}
