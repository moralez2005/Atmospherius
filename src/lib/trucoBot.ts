import { power, type State } from "./truco";

const NEED: Record<number, number> = { 3: 0.5, 6: 0.62, 9: 0.72, 12: 0.82 };

// força da mão do computador (0 a 1), usando só as cartas DELE e o placar das vazas
function strength(s: State): number {
  const ps = s.hands.bot.map((c) => power(c, s.manilha)).sort((a, b) => b - a);
  if (!ps.length) return 0;
  let st = (ps[0] * 0.6 + (ps[1] ?? ps[0]) * 0.4) / 13;
  st += 0.15 * s.results.filter((r) => r === "bot").length;
  st -= 0.15 * s.results.filter((r) => r === "you").length;
  return Math.max(0, Math.min(1, st));
}

export function botOnze(s: State) {
  return strength(s) >= 0.55;
}

export function botCallTruco(s: State) {
  if (s.special !== "normal" || s.pending || s.lastRaiser === "bot" || s.value >= 12) return false;
  const st = strength(s);
  const r = Math.random();
  if (st >= 0.78) return r < 0.7;
  if (st >= 0.62) return r < 0.2;
  return s.value === 1 && r < 0.04; // blefe raro
}

export function botRespond(s: State): "accept" | "run" | "raise" {
  const to = s.pending?.to ?? 3;
  if (s.score.you + s.value >= 12) return "accept"; // correr entregaria a partida
  const st = strength(s) + (Math.random() - 0.5) * 0.14;
  const need = NEED[to] ?? 0.82;
  if (to < 12 && st >= need + 0.18 && Math.random() < 0.6) return "raise";
  return st >= need ? "accept" : "run";
}

export function botPlay(s: State): { index: number; covered: boolean } {
  const hand = s.hands.bot;
  if (s.special === "ferro") return { index: Math.floor(Math.random() * hand.length), covered: false };

  const pw = (i: number) => power(hand[i], s.manilha);
  const asc = hand.map((_, i) => i).sort((a, b) => pw(a) - pw(b));
  const last = s.board[s.board.length - 1];
  const opp = last && last.length === 1 ? last[0] : null; // carta do jogador, se já jogou
  const roundIdx = opp ? s.board.length - 1 : s.board.length;

  if (opp) {
    const op = opp.covered ? -1 : power(opp.card, s.manilha);
    const win = asc.find((i) => pw(i) > op); // a menor carta que vence
    if (win !== undefined) return { index: win, covered: false };
    const tie = asc.find((i) => pw(i) === op);
    if (tie !== undefined) return { index: tie, covered: false };
    return { index: asc[0], covered: roundIdx >= 1 }; // não dá para ganhar: joga a pior (coberta se puder)
  }
  if (roundIdx === 0 && hand.length === 3) return { index: asc[1], covered: false }; // abre com a do meio
  return { index: asc[asc.length - 1], covered: false }; // depois, abre com a mais forte
}