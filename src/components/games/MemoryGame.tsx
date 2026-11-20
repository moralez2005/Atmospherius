"use client";

import { useEffect, useRef, useState } from "react";
import type { GameProps } from "./GameLauncher";
import "./memory.css";

const SYMBOLS = ["★", "♥", "♦", "♣", "♠", "☀", "☾", "✿"];
type Card = { id: number; sym: string };

function newDeck(): Card[] {
  const d = [...SYMBOLS, ...SYMBOLS].map((sym, id) => ({ id, sym }));
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

export default function MemoryGame({ onBack, best, onScore }: GameProps) {
  const [cards, setCards] = useState<Card[]>(newDeck);
  const [open, setOpen] = useState<number[]>([]); // virradas e ainda não resolvidas (máx. 2)
  const [done, setDone] = useState<number[]>([]); // já formaram par
  const [tries, setTries] = useState(0);
  const [record, setRecord] = useState(false); // venceu batendo o próprio recorde
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const won = done.length === cards.length;

  function flip(id: number) {
    if (open.length === 2 || open.includes(id) || done.includes(id)) return;
    const next = [...open, id];
    setOpen(next);
    if (next.length < 2) return;

    const total = tries + 1;
    setTries(total);
    const [a, b] = next.map((i) => cards.find((c) => c.id === i)!);
    if (a.sym === b.sym) {
      setDone((d) => [...d, a.id, b.id]);
      if (done.length + 2 === cards.length) setRecord(onScore(total)); // último par: salva o placar
      setOpen([]);
    } else {
      timer.current = setTimeout(() => setOpen([]), 800);
    }
  }

  function restart() {
    clearTimeout(timer.current);
    setCards(newDeck());
    setOpen([]);
    setDone([]);
    setTries(0);
    setRecord(false);
  }

  return (
    <div>
      <div className="mm-bar">
        <span>Tentativas: {tries}</span>
        {best !== undefined && <span>Recorde: {best}</span>}
        <span>
          Pares: {done.length / 2}/{cards.length / 2}
        </span>
      </div>

      {won && (
        <div className="mm-win">
          Você venceu em {tries} tentativas!{record && " Novo recorde! ★"}
        </div>
      )}

      <div className="mm-grid">
        {cards.map((c) => {
          const isDone = done.includes(c.id);
          const up = isDone || open.includes(c.id);
          return (
            <button
              key={c.id}
              className={`mm-card ${up ? "is-up" : ""} ${isDone ? "is-done" : ""}`}
              aria-label={up ? `Carta ${c.sym}` : "Carta virada para baixo"}
              onClick={() => flip(c.id)}
            >
              <span className="mm-in">
                <span className="mm-face mm-back">?</span>
                <span className="mm-face mm-front">{c.sym}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mm-actions">
        <button className="os-btn" onClick={restart}>
          Reiniciar
        </button>
        <button className="os-btn" onClick={onBack}>
          Voltar
        </button>
      </div>
    </div>
  );
}