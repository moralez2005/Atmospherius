"use client";

import { useEffect, useState, type MouseEvent } from "react";
import type { GameProps } from "./GameLauncher";
import "./mines.css";

// Campo Minado ＡＥＳＴＨＥＴＩＣ: 9×9 com 10 minas. Clique abre, botão direito
// (ou o modo bandeira) marca. O recorde é o menor tempo.
const N = 9;
const MINES = 10;
type Cell = { mine: boolean; open: boolean; flag: boolean; near: number };

function build(safe: number): Cell[] {
  const cells: Cell[] = Array.from({ length: N * N }, () => ({ mine: false, open: false, flag: false, near: 0 }));
  // a primeira casa clicada (e as vizinhas) nunca têm mina
  const forbidden = new Set([safe, ...around(safe)]);
  let placed = 0;
  while (placed < MINES) {
    const i = Math.floor(Math.random() * N * N);
    if (cells[i].mine || forbidden.has(i)) continue;
    cells[i].mine = true;
    placed++;
  }
  cells.forEach((c, i) => (c.near = around(i).filter((j) => cells[j].mine).length));
  return cells;
}

function around(i: number) {
  const x = i % N;
  const y = Math.floor(i / N);
  const out: number[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if ((dx || dy) && nx >= 0 && ny >= 0 && nx < N && ny < N) out.push(ny * N + nx);
    }
  return out;
}

export default function MinesGame({ onBack, best, onScore }: GameProps) {
  const [cells, setCells] = useState<Cell[] | null>(null); // null = ainda não clicou
  const [state, setState] = useState<"play" | "won" | "lost">("play");
  const [flagMode, setFlagMode] = useState(false);
  const [start, setStart] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [record, setRecord] = useState(false);

  useEffect(() => {
    if (start === null || state !== "play") return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [start, state]);

  const secs = start === null ? 0 : Math.max(0, Math.floor((now - start) / 1000));
  const flags = cells?.filter((c) => c.flag).length ?? 0;

  function reset() {
    setCells(null);
    setState("play");
    setStart(null);
    setNow(0);
    setRecord(false);
  }

  function reveal(i: number) {
    if (state !== "play") return;
    let board = cells;
    if (!board) {
      board = build(i);
      const t = Date.now();
      setStart(t);
      setNow(t);
    }
    const next = board.map((c) => ({ ...c }));
    if (next[i].flag || next[i].open) return;
    if (next[i].mine) {
      for (const c of next) if (c.mine) c.open = true;
      setCells(next);
      setState("lost");
      return;
    }
    // abre em cascata as casas sem minas por perto
    const stack = [i];
    while (stack.length) {
      const j = stack.pop()!;
      if (next[j].open || next[j].flag) continue;
      next[j].open = true;
      if (next[j].near === 0) stack.push(...around(j));
    }
    setCells(next);
    if (next.every((c) => c.mine || c.open)) {
      const t = Math.max(1, Math.floor((Date.now() - (start ?? Date.now())) / 1000));
      setNow(Date.now());
      setState("won");
      setRecord(onScore(t));
    }
  }

  function flag(i: number, e?: MouseEvent) {
    e?.preventDefault();
    if (!cells || state !== "play" || cells[i].open) return;
    setCells(cells.map((c, j) => (j === i ? { ...c, flag: !c.flag } : c)));
  }

  const face = state === "lost" ? "✖_✖" : state === "won" ? "★‿★" : "◕‿◕";

  return (
    <div className="gx mn">
      <div className="mn-panel">
        <span className="mn-lcd">{String(MINES - flags).padStart(3, "0")}</span>
        <button className="mn-face" onClick={reset} title="Novo jogo">
          {face}
        </button>
        <span className="mn-lcd">{String(Math.min(999, secs)).padStart(3, "0")}</span>
      </div>
      <div className="mn-grid" onContextMenu={(e) => e.preventDefault()}>
        {Array.from({ length: N * N }, (_, i) => {
          const c = cells?.[i];
          const open = c?.open;
          return (
            <button
              key={i}
              className={`mn-cell ${open ? "is-open" : ""} ${open && c?.mine ? "is-mine" : ""} n${open ? c?.near : ""}`}
              onClick={() => (flagMode ? flag(i) : reveal(i))}
              onContextMenu={(e) => flag(i, e)}
              aria-label={open ? (c?.mine ? "mina" : `${c?.near} minas por perto`) : c?.flag ? "marcada" : "fechada"}
            >
              {open ? (c?.mine ? "◆" : c?.near || "") : c?.flag ? "⚑" : ""}
            </button>
          );
        })}
      </div>
      <p className="gx-help mn-msg">
        {state === "won" && <>Você limpou o campo em {secs}s! {record && "Novo recorde! ★"}</>}
        {state === "lost" && "Você achou uma estátua-mina... tente de novo!"}
        {state === "play" && (best !== undefined ? `Recorde: ${best}s` : "Clique para abrir · botão direito marca")}
      </p>
      <div className="gx-actions">
        <button className={`os-btn ${flagMode ? "is-on" : ""}`} onClick={() => setFlagMode((f) => !f)} aria-pressed={flagMode}>
          ⚑ Modo bandeira {flagMode ? "ligado" : "desligado"}
        </button>
        <button className="os-btn" onClick={onBack}>
          Voltar
        </button>
      </div>
    </div>
  );
}
