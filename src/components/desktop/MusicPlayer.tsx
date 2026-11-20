"use client";

import type { ThemeId } from "@/config/themes";
import { SKINS } from "./PlayerSkins";
import type { PlayerApi } from "./usePlayer";
import "./player.css";

// Reprodutor no desktop: cada estética tem o seu aparelho (PlayerSkins).
// O iframe do YouTube NÃO fica aqui (fica fixo no Desktop), então minimizar ou
// mover o player nunca para a música.
export default function MusicPlayer({
  p,
  themeId,
  onMinimize,
}: {
  p: PlayerApi;
  themeId: ThemeId;
  onMinimize: () => void;
}) {
  const Skin = SKINS[themeId];
  return (
    <div className="mp-widget wg" data-skin={themeId}>
      <Skin p={p} />
      <div className="wg-ctl">
        <button className="wg-btn" aria-label="Minimizar a rádio" title="Minimizar (a música continua)" onClick={onMinimize}>
          –
        </button>
      </div>
    </div>
  );
}
