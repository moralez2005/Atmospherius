"use client";

import type { CSSProperties, ReactNode } from "react";
import type { PlayerApi } from "./usePlayer";

export const fmt = (s: number) =>
  isFinite(s) && s > 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00";

const ICON = {
  play: "M8 5v14l11-7z",
  pause: "M7 5h4v14H7zM13 5h4v14h-4z",
  next: "M6 6l8.5 6L6 18zM16 6h2.5v12H16z",
  shuffle:
    "M3 7h3.5c2 0 3.2.9 4.3 2.4l2.4 3.4c1 1.4 2.1 2.2 4 2.2H19M16.5 12.5L19 15l-2.5 2.5M3 17h3.5c1.4 0 2.4-.5 3.2-1.3M13.4 8.3c.8-.8 1.8-1.3 3.1-1.3H19M16.5 4.5L19 7l-2.5 2.5",
  vol: "M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11",
};

function Ico({ d, stroke }: { d: string; stroke?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={d}
        fill={stroke ? "none" : "currentColor"}
        stroke={stroke ? "currentColor" : "none"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function playerStatus(p: PlayerApi) {
  if (p.failed) return "rádio fora do ar (sem conexão)";
  if (!p.ready) return "sintonizando...";
  if (p.needsTap) return "clique em qualquer lugar para ligar o som";
  if (p.loading) return "carregando faixa...";
  return p.playing ? "no ar" : "pausado";
}

// Controles comuns a todos os visuais: o mínimo para ouvir em segundo plano
export function Controls({ p, labels }: { p: PlayerApi; labels?: Partial<Record<"shuffle" | "play" | "next", ReactNode>> }) {
  const on = p.playing || p.loading;
  return (
    <div className="mp-ctrls">
      <button
        className="os-btn mp-btn mp-shuffle"
        aria-pressed={p.shuffle}
        aria-label="Tocar em ordem aleatória"
        title={p.shuffle ? "Aleatório ligado" : "Aleatório desligado"}
        onClick={p.toggleShuffle}
      >
        {labels?.shuffle ?? <Ico d={ICON.shuffle} stroke />}
      </button>
      <button
        className="os-btn mp-btn mp-play"
        aria-label={on ? "Pausar" : "Tocar"}
        onClick={p.toggle}
        disabled={!p.ready}
      >
        {labels?.play ?? <Ico d={on ? ICON.pause : ICON.play} />}
      </button>
      <button className="os-btn mp-btn mp-next" aria-label="Próxima faixa" onClick={p.next} disabled={!p.ready}>
        {labels?.next ?? <Ico d={ICON.next} />}
      </button>
      <label className="mp-vol" title={`Volume ${p.volume}%`}>
        <Ico d={ICON.vol} stroke />
        <input
          type="range"
          min={0}
          max={100}
          value={p.volume}
          aria-label="Volume"
          style={{ "--pct": `${p.volume}%` } as CSSProperties}
          onChange={(e) => p.setVolume(Number(e.target.value))}
        />
      </label>
    </div>
  );
}

export function Progress({ p }: { p: PlayerApi }) {
  const pct = p.dur ? (p.pos / p.dur) * 100 : 0;
  return (
    <div className="mp-prog">
      <input
        type="range"
        className="mp-seek"
        min={0}
        max={1000}
        aria-label="Progresso da faixa"
        disabled={!p.ready || !p.dur}
        style={{ "--pct": `${pct}%` } as CSSProperties}
        value={Math.round(pct * 10)}
        onChange={(e) => p.seek(Number(e.target.value) / 1000)}
      />
      <div className="mp-times">
        <span>{fmt(p.pos)}</span>
        <span>{fmt(p.dur)}</span>
      </div>
    </div>
  );
}

export function NowPlaying({ p }: { p: PlayerApi }) {
  return (
    <div className="mp-meta">
      <div className="mp-station">
        {p.station.name} · {p.station.dial}
      </div>
      <div className="mp-title" title={p.track?.title}>
        {p.track?.title ?? "—"}
      </div>
      <div className="mp-artist">{p.track?.artist}</div>
    </div>
  );
}
