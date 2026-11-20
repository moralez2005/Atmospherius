"use client";

import { useEffect, useReducer, useState } from "react";
import {
  CALL_LABEL,
  SUIT_SYMBOL,
  dealHand,
  isManilha,
  nextValue,
  reducer,
  shuffledDeck,
  type Card,
  type Played,
  type Rank,
} from "@/lib/truco";
import { botCallTruco, botOnze, botPlay, botRespond } from "@/lib/trucoBot";
import "./truco.css";

function CardView({
  card,
  manilha,
  hidden,
  onClick,
  disabled,
}: {
  card?: Card;
  manilha?: Rank;
  hidden?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const c = hidden ? undefined : card;
  const cls = [
    "tc-card",
    !c && "back",
    c && (c.suit === "copas" || c.suit === "ouros") && "red",
    c && manilha && isManilha(c, manilha) && "manilha",
  ]
    .filter(Boolean)
    .join(" ");
    const inner = c ? (
    <>
      <span className="tc-corner">
        {c.rank}
        <br />
        {SUIT_SYMBOL[c.suit]}
      </span>
      <span className="tc-pip">{SUIT_SYMBOL[c.suit]}</span>
    </>
  ) : (
    <span className="tc-logo">✦</span>
  );
  
  return onClick ? (
    <button
      className={cls}
      onClick={onClick}
      disabled={disabled}
      aria-label={c ? `${c.rank}${SUIT_SYMBOL[c.suit]}` : "Carta oculta"}
    >
      {inner}
    </button>
  ) : (
    <span className={cls}>{inner}</span>
  );
}

function Slot({ p, manilha }: { p?: Played; manilha: Rank }) {
  if (!p) return <span className="tc-slot" />;
  return <CardView card={p.card} manilha={manilha} hidden={p.covered} />;
}

export default function TrucoGame({ onBack }: { onBack: () => void }) {
  const [s, dispatch] = useReducer(reducer, null, () => dealHand({ you: 0, bot: 0 }, "bot", shuffledDeck()));
  const [cover, setCover] = useState(false);

  // vez do computador (com um pequeno atraso para dar para acompanhar)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (s.phase === "onze" && s.onzeFor === "bot") {
      t = setTimeout(() => dispatch({ type: "onze", play: botOnze(s) }), 1100);
    } else if (s.phase === "truco" && s.pending?.by === "you") {
      t = setTimeout(() => dispatch({ type: "respond", who: "bot", answer: botRespond(s) }), 1100);
    } else if (s.phase === "play" && s.turn === "bot" && !s.pending) {
      t = setTimeout(() => {
        if (botCallTruco(s)) dispatch({ type: "call", who: "bot" });
        else dispatch({ type: "play", who: "bot", ...botPlay(s) });
      }, 1100);
    }
    return () => clearTimeout(t);
  }, [s]);

  const last = s.board[s.board.length - 1];
  const roundIdx = last && last.length === 1 ? s.board.length - 1 : s.board.length;
  const canAct = s.phase === "play" && s.turn === "you" && !s.pending;
  const canCover = canAct && roundIdx >= 1 && s.special === "normal";
  const canCall = canAct && s.special === "normal" && s.lastRaiser !== "you" && s.value < 12;
  const botAsks = s.phase === "truco" && s.pending?.by === "bot" ? s.pending : null;
  const over = s.phase === "gameEnd";

  function play(index: number) {
    dispatch({ type: "play", who: "you", index, covered: cover && canCover });
    setCover(false);
  }

  const status =
    s.phase === "play" && s.turn === "you"
      ? "Sua vez: escolha uma carta."
      : s.phase === "play"
        ? "Vez do computador..."
        : s.phase === "truco" && s.pending?.by === "you"
          ? "Aguardando o computador responder..."
          : s.phase === "onze" && s.onzeFor === "bot"
            ? "O computador está decidindo a mão de onze..."
            : "";

  return (
    <div className="tc">
      <div className="tc-top">
        <span>
          Você {s.score.you} x {s.score.bot} Computador
        </span>
        <span className="tc-vira">
          Vira: <CardView card={s.vira} /> Manilha: {s.manilha}
        </span>
        <span className="tc-value">Vale {s.phase === "onze" ? 3 : s.value}</span>
      </div>

      {s.special === "ferro" && !over && (
        <div className="tc-banner">MÃO DE FERRO: cartas às escuras! Quem ganhar leva a partida.</div>
      )}

      <div className="tc-hand" aria-label="Cartas do computador">
        {s.hands.bot.map((_, i) => (
          <CardView key={i} hidden />
        ))}
      </div>

      <div className="tc-board">
        {[0, 1, 2].map((i) => {
          const v = s.board[i] ?? [];
          const r = s.results[i];
          return (
            <div key={i} className="tc-col">
              <Slot p={v.find((p) => p.who === "bot")} manilha={s.manilha} />
              <Slot p={v.find((p) => p.who === "you")} manilha={s.manilha} />
              <div className="tc-res">{r === "tie" ? "=" : r === "you" ? "✓" : r === "bot" ? "✗" : ""}</div>
            </div>
          );
        })}
      </div>

      <div className="tc-hand" aria-label="Suas cartas">
        {s.hands.you.map((c, i) => (
          <CardView
            key={`${c.rank}${c.suit}`}
            card={c}
            manilha={s.manilha}
            hidden={s.special === "ferro"}
            onClick={() => play(i)}
            disabled={!canAct}
          />
        ))}
      </div>

      {s.phase === "onze" && s.onzeFor === "you" && (
        <div className="tc-panel">
          <b>Mão de onze!</b> Você tem 11 pontos e já viu as cartas. Jogar vale 3 pontos; correr dá 1 ponto ao
          computador.
          <div className="tc-actions">
            <button className="os-btn" onClick={() => dispatch({ type: "onze", play: true })}>
              Jogar (vale 3)
            </button>
            <button className="os-btn" onClick={() => dispatch({ type: "onze", play: false })}>
              Correr
            </button>
          </div>
        </div>
      )}

      {botAsks && (
        <div className="tc-panel">
          <b>O computador pediu {CALL_LABEL[botAsks.to]}</b> A mão passa a valer {botAsks.to}. Correr dá{" "}
          {s.value} {s.value === 1 ? "ponto" : "pontos"} a ele.
          <div className="tc-actions">
            <button className="os-btn" onClick={() => dispatch({ type: "respond", who: "you", answer: "accept" })}>
              Aceitar
            </button>
            <button className="os-btn" onClick={() => dispatch({ type: "respond", who: "you", answer: "run" })}>
              Correr
            </button>
            {botAsks.to < 12 && (
              <button className="os-btn" onClick={() => dispatch({ type: "respond", who: "you", answer: "raise" })}>
                Aumentar ({CALL_LABEL[nextValue(botAsks.to)]})
              </button>
            )}
          </div>
        </div>
      )}

      {(s.phase === "handEnd" || over) && (
        <div className="tc-panel">
          <b>{over ? (s.score.you >= 12 ? "Você venceu a partida!" : "O computador venceu a partida.") : "Fim da mão"}</b>{" "}
          {s.summary}
          <div className="tc-actions">
            {over ? (
              <button className="os-btn" onClick={() => dispatch({ type: "restart", deck: shuffledDeck() })}>
                Nova partida
              </button>
            ) : (
              <button className="os-btn" onClick={() => dispatch({ type: "next", deck: shuffledDeck() })}>
                Próxima mão
              </button>
            )}
          </div>
        </div>
      )}

      {(canCall || canCover) && (
        <div className="tc-actions">
          {canCall && (
            <button className="os-btn" onClick={() => dispatch({ type: "call", who: "you" })}>
              {CALL_LABEL[nextValue(s.value)]}
            </button>
          )}
          {canCover && (
            <label>
              <input type="checkbox" checked={cover} onChange={(e) => setCover(e.target.checked)} /> Jogar coberta
              (não vale nada)
            </label>
          )}
        </div>
      )}

      {status && <div>{status}</div>}

      <div className="tc-log">
        {s.log.slice(-4).map((m, i) => (
          <div key={i}>{m}</div>
        ))}
      </div>

      <details className="tc-rules">
        <summary>Regras</summary>
        <ul>
          <li>Baralho de 40 cartas. Força: 4 &lt; 5 &lt; 6 &lt; 7 &lt; Q &lt; J &lt; K &lt; A &lt; 2 &lt; 3.</li>
          <li>A manilha é a carta seguinte à vira. Entre as manilhas: ♣ &gt; ♥ &gt; ♠ &gt; ♦.</li>
          <li>3 vazas por mão (✓ você, ✗ computador, = empate). Empate na 1ª: a 2ª decide. Empate na 2ª ou 3ª:
            vence quem ganhou a 1ª. Três empates: vence quem foi mão.</li>
          <li>Truco vale 3, seis 6, nove 9, doze 12. Correr dá ao adversário os pontos da aposta anterior.</li>
          <li>Carta coberta só a partir da 2ª vaza e não vale nada.</li>
          <li>Mão de onze: jogar (vale 3) ou correr (+1). Mão de ferro (11 x 11): às escuras, vale a partida.</li>
          <li>Vence quem fizer 12 pontos.</li>
        </ul>
      </details>

      <div className="tc-actions">
        <button className="os-btn" onClick={() => dispatch({ type: "restart", deck: shuffledDeck() })}>
          Reiniciar partida
        </button>
        <button className="os-btn" onClick={onBack}>
          Voltar
        </button>
      </div>
    </div>
  );
}