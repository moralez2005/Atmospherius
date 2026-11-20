// Sons curtos de interface (Web Audio), sem arquivos
let ctx: AudioContext | null = null;
const KEY = "vaporos-sfx";

export const getUiSound = () => {
  try {
    return localStorage.getItem(KEY) !== "0";
  } catch {
    return true;
  }
};
export const setUiSound = (on: boolean) => {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {}
};

function blip(ac: AudioContext, f: number, t: number, d: number, v = 0.05, type: OscillatorType = "triangle") {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g);
  g.connect(ac.destination);
  o.start(t);
  o.stop(t + d + 0.02);
}

export function sfx(kind: "open" | "close" | "min" | "notify" | "pop" | "startup" | "talk") {
  if (!getUiSound()) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime;
    if (kind === "open") {
      blip(ctx, 523, t, 0.09);
      blip(ctx, 784, t + 0.07, 0.12);
    } else if (kind === "close") {
      blip(ctx, 659, t, 0.08);
      blip(ctx, 392, t + 0.07, 0.12);
    } else if (kind === "min") {
      blip(ctx, 330, t, 0.1);
    } else if (kind === "startup") {
      // acorde subindo, no clima de computador ligando nos anos 2000 (melodia original)
      [311, 466, 622, 784, 932].forEach((f, i) => blip(ctx!, f, t + i * 0.12, 1.4 - i * 0.1, 0.035, "sine"));
      [155, 233].forEach((f) => blip(ctx!, f, t, 1.8, 0.03, "triangle"));
      blip(ctx, 1245, t + 0.7, 1.1, 0.015, "sine");
    } else if (kind === "talk") {
      // "plim" de vidro bem baixinho (conversa no parque do Frutiger)
      blip(ctx, 1047, t, 0.12, 0.022, "sine");
      blip(ctx, 1568, t + 0.05, 0.2, 0.016, "sine");
    } else if (kind === "pop") {
      blip(ctx, 900, t, 0.05, 0.05, "sine");
      blip(ctx, 1500, t + 0.03, 0.06, 0.03, "sine");
    } else {
      blip(ctx, 1319, t, 0.35, 0.04, "sine");
      blip(ctx, 988, t + 0.12, 0.45, 0.04, "sine");
    }
  } catch {}
}