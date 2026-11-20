export type Who = "you" | "bot";
export type Suit = "paus" | "copas" | "espadas" | "ouros";
export type Rank = "4" | "5" | "6" | "7" | "Q" | "J" | "K" | "A" | "2" | "3";
export type Card = { rank: Rank; suit: Suit };
export type Played = { who: Who; card: Card; covered: boolean };
export type Result = Who | "tie";
export type Phase = "play" | "truco" | "onze" | "handEnd" | "gameEnd";
export type Special = "normal" | "onze" | "ferro";

export type State = {
  score: Record<Who, number>;
  dealer: Who;
  mao: Who; // quem joga primeiro na mão
  hands: Record<Who, Card[]>;
  vira: Card;
  manilha: Rank;
  special: Special;
  onzeFor: Who | null;
  value: number; // valor atual da mão: 1, 3, 6, 9 ou 12
  lastRaiser: Who | null; // quem fez o último aumento aceito (não pode aumentar de novo)
  pending: { by: Who; to: number } | null; // pedido aguardando resposta
  board: Played[][]; // board[i] = cartas da vaza i
  results: Result[];
  turn: Who;
  phase: Phase;
  log: string[];
  summary: string | null;
};

export type Action =
  | { type: "play"; who: Who; index: number; covered: boolean }
  | { type: "call"; who: Who }
  | { type: "respond"; who: Who; answer: "accept" | "run" | "raise" }
  | { type: "onze"; play: boolean }
  | { type: "next"; deck: Card[] }
  | { type: "restart"; deck: Card[] };

export const ORDER: Rank[] = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"];
const SUITS: Suit[] = ["paus", "copas", "espadas", "ouros"];
export const SUIT_SYMBOL: Record<Suit, string> = { paus: "♣", copas: "♥", espadas: "♠", ouros: "♦" };
const SUIT_POWER: Record<Suit, number> = { ouros: 0, espadas: 1, copas: 2, paus: 3 };
export const NAMES: Record<Who, string> = { you: "Você", bot: "Computador" };
export const CALL_LABEL: Record<number, string> = { 3: "TRUCO!", 6: "SEIS!", 9: "NOVE!", 12: "DOZE!" };

export const other = (w: Who): Who => (w === "you" ? "bot" : "you");
export const nextValue = (v: number) => (v === 1 ? 3 : v === 3 ? 6 : v === 6 ? 9 : 12);
export const isManilha = (c: Card, manilha: Rank) => c.rank === manilha;
export const power = (c: Card, manilha: Rank) =>
  c.rank === manilha ? 10 + SUIT_POWER[c.suit] : ORDER.indexOf(c.rank);
export const label = (c: Card) => `${c.rank}${SUIT_SYMBOL[c.suit]}`;

// baralho embaralhado (chamar fora do reducer, que precisa ser puro)
export function shuffledDeck(): Card[] {
  const d: Card[] = ORDER.flatMap((rank) => SUITS.map((suit) => ({ rank, suit })));
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

export function dealHand(score: Record<Who, number>, dealer: Who, deck: Card[], log: string[] = []): State {
  const mao = other(dealer);
  const vira = deck[6];
  const ferro = score.you === 11 && score.bot === 11;
  const onzeFor: Who | null = ferro ? null : score.you === 11 ? "you" : score.bot === 11 ? "bot" : null;
  const special: Special = ferro ? "ferro" : onzeFor ? "onze" : "normal";
  const extra = ferro
    ? ["Mão de ferro: jogo às escuras!"]
    : onzeFor
      ? [`Mão de onze para ${NAMES[onzeFor]}.`]
      : [];
  return {
    score,
    dealer,
    mao,
    hands: { you: deck.slice(0, 3), bot: deck.slice(3, 6) },
    vira,
    manilha: ORDER[(ORDER.indexOf(vira.rank) + 1) % ORDER.length],
    special,
    onzeFor,
    value: 1,
    lastRaiser: null,
    pending: null,
    board: [],
    results: [],
    turn: mao,
    phase: onzeFor ? "onze" : "play",
    log: [...log, ...extra],
    summary: null,
  };
}

const say = (s: State, m: string): State => ({ ...s, log: [...s.log.slice(-29), m] });

function finish(s: State, winner: Who, points: number, why: string): State {
  const gain = s.special === "ferro" ? 12 : points;
  const score = { ...s.score, [winner]: Math.min(12, s.score[winner] + gain) };
  const msg = `${NAMES[winner]} ganhou a mão (+${gain}): ${why}.`;
  return {
    ...s,
    score,
    pending: null,
    phase: score[winner] >= 12 ? "gameEnd" : "handEnd",
    summary: msg,
    log: [...s.log.slice(-29), msg],
  };
}

// null = a mão ainda não foi decidida
function decide(r: Result[], mao: Who): Who | null {
  if (r.length < 2) return null;
  const [a, b, c] = r;
  if (r.length === 2) {
    if (a !== "tie" && (b === "tie" || b === a)) return a;
    if (a === "tie" && b !== "tie") return b;
    return null;
  }
  if (c !== "tie") return c;
  return a !== "tie" ? a : mao; // 3 empates: vence quem foi "mão"
}

export function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "restart":
      return dealHand({ you: 0, bot: 0 }, "bot", a.deck, ["Nova partida!"]);

    case "next":
      return s.phase === "handEnd" ? dealHand(s.score, other(s.dealer), a.deck) : s;

    case "onze": {
      if (s.phase !== "onze" || !s.onzeFor) return s;
      const who = s.onzeFor;
      if (a.play) return say({ ...s, phase: "play", value: 3 }, `${NAMES[who]} joga a mão de onze (vale 3).`);
      return finish(s, other(who), 1, `${NAMES[who]} correu da mão de onze`);
    }

    case "call": {
      if (s.phase !== "play" || s.turn !== a.who || s.pending || s.special !== "normal") return s;
      if (s.lastRaiser === a.who || s.value >= 12) return s;
      const to = nextValue(s.value);
      return say({ ...s, phase: "truco", pending: { by: a.who, to } }, `${NAMES[a.who]} pediu ${CALL_LABEL[to]}`);
    }

    case "respond": {
      const p = s.pending;
      if (s.phase !== "truco" || !p || a.who === p.by) return s;
      if (a.answer === "accept") {
        return say(
          { ...s, phase: "play", value: p.to, lastRaiser: p.by, pending: null },
          `${NAMES[a.who]} aceitou. A mão vale ${p.to}.`
        );
      }
      if (a.answer === "run") {
        return finish(say(s, `${NAMES[a.who]} correu!`), p.by, s.value, `${NAMES[a.who]} correu`);
      }
      if (p.to >= 12) return s;
      const to = nextValue(p.to);
      return say(
        { ...s, value: p.to, lastRaiser: p.by, pending: { by: a.who, to } },
        `${NAMES[a.who]} aumentou: ${CALL_LABEL[to]}`
      );
    }

    case "play": {
      if (s.phase !== "play" || s.turn !== a.who || s.pending) return s;
      const hand = s.hands[a.who];
      const card = hand[a.index];
      if (!card) return s;

      const last = s.board[s.board.length - 1];
      const opens = !last || last.length === 2;
      const roundIdx = opens ? s.board.length : s.board.length - 1;
      const covered = a.covered && roundIdx >= 1 && s.special === "normal";

      const played: Played = { who: a.who, card, covered };
      const board = opens ? [...s.board, [played]] : [...s.board.slice(0, -1), [...last, played]];
      let n: State = { ...s, board, hands: { ...s.hands, [a.who]: hand.filter((_, i) => i !== a.index) } };
      n = say(n, `${NAMES[a.who]} jogou ${covered ? "uma carta coberta" : label(card)}.`);
      if (opens) return { ...n, turn: other(a.who) };

      // vaza completa
      const [first, second] = board[board.length - 1];
      const pw = (p: Played) => (p.covered ? -1 : power(p.card, s.manilha));
      const res: Result = pw(first) === pw(second) ? "tie" : pw(first) > pw(second) ? first.who : second.who;
      const results = [...s.results, res];
      n = say({ ...n, results }, res === "tie" ? "Vaza empatada." : `${NAMES[res]} levou a vaza.`);

      const w = decide(results, s.mao);
      if (w) {
        const marks = results.map((r) => (r === "tie" ? "=" : r === "you" ? "✓" : "✗")).join(" ");
        return finish(n, w, n.value, `vazas ${marks}`);
      }
      return { ...n, turn: res === "tie" ? first.who : res };
    }
  }
}