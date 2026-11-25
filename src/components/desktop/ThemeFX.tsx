"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import type { ThemeId } from "@/config/themes";
import AeroScene from "./AeroScene";
import { AeroWalk, AeroWalkHotspot } from "./AeroWalk";
import SoftClubScene from "./SoftClubScene";
import { CarHotspot, Cockpit } from "./SynthDrive";
import VaporScene from "./VaporScene";
import { ThinkerHotspot, VaporTalk } from "./VaporTalk";
import "./theme-fx.css";

// aleatório determinístico: as posições não mudam a cada render
const r = (i: number, s = 1) => {
  const x = Math.sin((i + 1) * 12.9898 * s) * 43758.5453;
  return x - Math.floor(x);
};
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const v = (o: Record<string, string | number>) => o as CSSProperties;
const times = (n: number) => Array.from({ length: n }, (_, i) => i);
const noop = () => () => {};

type Item = { cls: string; style?: CSSProperties; text?: string; children?: ReactNode };


// relógio de fita VHS no canto da tela (Vaporwave)
function VhsOsd({ playing }: { playing: boolean }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const hh = now.getHours();
  const time = `${hh < 12 ? "AM" : "PM"} ${String(hh % 12 || 12).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const date = now.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }).toUpperCase();
  return (
    <span className="fx-vhs">
      <b>{playing ? "▶ PLAY" : "❚❚ PAUSE"}</b>
      <small>SP</small>
      <span>
        {time}
        <br />
        {date}
      </span>
    </span>
  );
}

function build(theme: ThemeId): Item[] {
  switch (theme) {
    case "vaporwave":
      return [
        { cls: "fx-sweep" },
        { cls: "fx-glitch", style: { top: "38%" } },
        { cls: "fx-glitch", style: { top: "71%", animationDelay: "3.5s" } },
        ...times(12).map((i) => ({
          cls: "fx-plus",
          text: i % 3 === 0 ? "✦" : "+",
          style: v({
            left: pct(r(i, 1)),
            animationDuration: `${14 + r(i, 2) * 10}s`,
            animationDelay: `${-r(i, 3) * 20}s`,
          }),
        })),
      ];
    case "synthwave":
      // o céu, o sol, as montanhas, o chão e o carro estão na cena (SynthScene)
      return [
        { cls: "fx-scan" },
        { cls: "fx-shoot" },
        { cls: "fx-shoot", style: { top: "18%", animationDelay: "-5s", animationDuration: "13s" } },
      ];
    case "frutiger":
      // céu, sol, nuvens e reflexo de lente estão no parque 3D; aqui só os brilhinhos
      return [
        ...times(8).map((i) => ({
          cls: "fx-glint",
          text: "✦",
          style: v({
            left: pct(r(i, 11)),
            top: pct(0.1 + r(i, 12) * 0.6),
            animationDelay: `${-r(i, 13) * 5}s`,
          }),
        })),
      ];
    case "softclub":
      return []; // a cena inteira fica em SoftClubScene (pouca coisa ao mesmo tempo)
    default:
      return [];
  }
}

export default function ThemeFX({ themeId, playing = false }: { themeId: ThemeId; playing?: boolean }) {
  // false no servidor e na hidratação, true depois que monta no navegador
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const items = useMemo(() => build(themeId) ?? [], [themeId]);
  if (!mounted) return null;

  return (
    <div className={`fx-layer ${playing ? "is-playing" : ""}`} data-fx={themeId} aria-hidden="true">
      {items.map((it, i) => (
        <span key={`${themeId}-${i}`} className={it.cls} style={it.style}>
          {it.children ?? it.text}
        </span>
      ))}
      {themeId === "vaporwave" && <VaporScene playing={playing} />}
      {themeId === "vaporwave" && <ThinkerHotspot />}
      {themeId === "vaporwave" && <VaporTalk />}
      {themeId === "frutiger" && <AeroScene playing={playing} />}
      {themeId === "frutiger" && <AeroWalkHotspot />}
      {themeId === "frutiger" && <AeroWalk />}
      {themeId === "softclub" && <SoftClubScene playing={playing} />}
      {themeId === "synthwave" && <CarHotspot />}
      {themeId === "synthwave" && <Cockpit playing={playing} />}
      {themeId === "vaporwave" && <VhsOsd playing={playing} />}
    </div>
  );
}
