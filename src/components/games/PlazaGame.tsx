"use client";

import { useEffect, useState } from "react";
import type { GameProps } from "./GameLauncher";

// Plaza 2001: o jogo de skate 3D roda numa página própria (public/games/plaza2001.html),
// dentro de um iframe. No fim da sessão a página manda o placar por postMessage.
export default function PlazaGame({ onBack, best, onScore }: GameProps) {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data as { type?: string; score?: number };
      if (d?.type !== "plaza2001-score" || typeof d.score !== "number") return;
      const isNew = onScore(Math.round(d.score));
      setMsg(isNew ? `Novo recorde: ${Math.round(d.score).toLocaleString("pt-BR")} pontos!` : null);
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [onScore]);

  return (
    <div className="plaza-wrap">
      <div className="plaza-bar">
        <button className="os-btn" onClick={onBack}>
          ← Voltar
        </button>
        <span>{msg ?? (best !== undefined ? `Recorde: ${best.toLocaleString("pt-BR")} pontos` : "Plaza 2001 · clique no jogo antes de usar o teclado")}</span>
      </div>
      <iframe className="plaza-frame" src="/games/plaza2001.html?embed=1" title="Plaza 2001" allow="autoplay" />
    </div>
  );
}
