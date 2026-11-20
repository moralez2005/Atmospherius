// Som de inicialização sintetizado (Web Audio). Nenhum arquivo necessário.
export const BOOT_MS = 6000;

// A tela "bem-vindo" da estética Soft Club só aparece (e toca) UMA vez por inicialização.
// O flag fica no sessionStorage e é apagado ao reiniciar o sistema (Shell.reboot).
const WELCOME_KEY = "softclub-welcome-done";
export const welcomeSeen = () => {
  try {
    return sessionStorage.getItem(WELCOME_KEY) === "1";
  } catch {
    return false;
  }
};
export const markWelcomeSeen = () => {
  try {
    sessionStorage.setItem(WELCOME_KEY, "1");
  } catch {}
};
export const resetWelcome = () => {
  try {
    sessionStorage.removeItem(WELCOME_KEY);
  } catch {}
};

const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);

function makeReverb(ac: AudioContext) {
  const len = Math.floor(ac.sampleRate * 3);
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  }
  const conv = ac.createConvolver();
  conv.buffer = buf;
  return conv;
}

function note(
  ac: AudioContext,
  bus: AudioNode,
  midi: number,
  t: number,
  dur: number,
  vol: number,
  type: OscillatorType = "triangle"
) {
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(3500, t);
  lp.frequency.exponentialRampToValueAtTime(500, t + dur);

  lp.connect(g);
  g.connect(bus);

  [0, 9].forEach((detune) => {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.value = hz(midi);
    o.detune.value = detune;
    o.connect(lp);
    o.start(t);
    o.stop(t + dur + 0.1);
  });
}

export function playBootSound() {
  try {
    const ac = new AudioContext();
    const t0 = ac.currentTime + 0.05;

    const master = ac.createGain();
    master.gain.setValueAtTime(0.5, t0);
    master.gain.setValueAtTime(0.5, t0 + 5);
    master.gain.linearRampToValueAtTime(0, t0 + 6);
    master.connect(ac.destination);

    const bus = ac.createGain();
    const rev = makeReverb(ac);
    const wet = ac.createGain();
    wet.gain.value = 0.7;
    bus.connect(master);
    bus.connect(rev);
    rev.connect(wet);
    wet.connect(master);

    // arpejo ascendente (Fmaj9)
    [65, 69, 72, 76, 79].forEach((m, i) => note(ac, bus, m, t0 + i * 0.28, 3.2, 0.18));
    // baixo + pad
    note(ac, bus, 41, t0, 5, 0.3, "sine");
    [57, 60, 64, 67].forEach((m) => note(ac, bus, m, t0 + 1.6, 4, 0.08, "sawtooth"));
    // brilho final
    note(ac, bus, 91, t0 + 2.8, 2.5, 0.07, "sine");
    note(ac, bus, 88, t0 + 3.1, 2.5, 0.06, "sine");

    setTimeout(() => ac.close(), 7500);
  } catch {
    // sem suporte a áudio: segue em silêncio
  }
}