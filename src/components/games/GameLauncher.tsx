"use client";

import { useEffect, useState } from "react";
import { GAMES } from "@/config/games";
import { THEMES, type ThemeId } from "@/config/themes";
import { readSaves, saveRecord, type Saves } from "@/lib/saves";
import type { GameId } from "@/lib/types";
import "./games.css";
import MemoryGame from "./MemoryGame";
import TrucoGame from "./TrucoGame";
import TamagochiGame from "./TamagochiGame";
import BubbleGame from "./BubbleGame";
import OutrunGame from "./OutrunGame";
import SnakeGame from "./SnakeGame";
import PlazaGame from "./PlazaGame";

// O que cada jogo recebe: voltar para a lista e registrar o placar (recorde no navegador)
export type GameProps = { onBack: () => void; best?: number; onScore: (score: number) => boolean };

// unidade do recorde de cada jogo (e se menor é melhor)
const RECORD: Partial<Record<GameId, { label: (n: number) => string; lower?: boolean }>> = {
  memoria: { label: (n) => `${n} tentativas`, lower: true },
  tamagochi: { label: (n) => `${n} ${n === 1 ? "dia" : "dias"} de vida` },
  bolhas: { label: (n) => `${n} pontos` },
  outrun: { label: (n) => `${n} m` },
  cobrinha: { label: (n) => `${n} pontos` },
  plaza: { label: (n) => `${n.toLocaleString("pt-BR")} pontos` },
};

export default function GameLauncher({ themeId, onTheme }: { themeId: ThemeId; onTheme: (id: ThemeId) => void }) {
  const [picked, setGame] = useState<GameId | null>(null);
  const [saves, setSaves] = useState<Saves>({});

  useEffect(() => {
    setSaves(readSaves()); // localStorage só existe no navegador
  }, []);

  // jogo de outra estética não roda: trocar de estética volta para a lista
  const fits = (id: GameId) => {
    const t = GAMES.find((g) => g.id === id)?.theme;
    return !t || t === themeId;
  };
  const game = picked && fits(picked) ? picked : null;

  if (game) {
    const props: GameProps = {
      onBack: () => setGame(null),
      best: saves[game],
      onScore: (score) => {
        const isNew = saveRecord(game, score, RECORD[game]?.lower);
        if (isNew) setSaves(readSaves());
        return isNew;
      },
    };
    if (game === "memoria") return <MemoryGame {...props} />;
    if (game === "truco") return <TrucoGame onBack={props.onBack} />;
    if (game === "tamagochi") return <TamagochiGame {...props} />;
    if (game === "bolhas") return <BubbleGame {...props} />;
    if (game === "outrun") return <OutrunGame {...props} />;
    if (game === "cobrinha") return <SnakeGame {...props} />;
    if (game === "plaza") return <PlazaGame {...props} />;
  }

  return (
    <div>
      <div className="gm-list">
        {GAMES.map((g) => {
          const away = !fits(g.id); // só roda em outra estética
          const rec = saves[g.id];
          return (
            <button
              key={g.id}
              className={`os-btn gm-game ${away ? "is-locked" : ""}`}
              title={away ? `Este jogo só roda na estética ${THEMES[g.theme!].name}` : undefined}
              onClick={() => (away ? onTheme(g.theme!) : setGame(g.id))}
            >
              <span className="gm-ico">{g.icon}</span>
              <span className="gm-txt">
                {g.name}
                <small>{g.desc}</small>
                {away ? (
                  <small className="gm-away">Só no {THEMES[g.theme!].name} · clique para ir</small>
                ) : (
                  rec !== undefined && RECORD[g.id] && <small className="gm-rec">Recorde: {RECORD[g.id]!.label(rec)}</small>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
