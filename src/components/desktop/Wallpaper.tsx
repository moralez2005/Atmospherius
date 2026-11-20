"use client";

import type { CSSProperties } from "react";
import { THEMES, type ThemeId } from "@/config/themes";
import SynthScene from "./SynthScene";
import SoftClubSky from "./SoftClubSky";
import VaporWallpaper from "./VaporWallpaper";
import AeroPark from "./AeroPark";
import { useAeroAnimated } from "@/lib/aeroSettings";
import "./wallpaper.css";

const W = 2560;
const H = 1080; // proporção dos wallpapers

// lite: sem o fundo borrado (usado nas cópias dos efeitos de glitch)
export default function Wallpaper({
  themeId,
  playing = false,
  lite = false,
}: {
  themeId: ThemeId;
  playing?: boolean;
  lite?: boolean;
}) {
  const t = THEMES[themeId];
  const aeroAnimated = useAeroAnimated();
  // Synthwave é uma cena animada (canvas) em vez de imagem parada
  if (themeId === "synthwave") {
    return (
      <div className="wp" aria-hidden="true">
        <SynthScene playing={playing} />
      </div>
    );
  }
  // Vaporwave: o lago ao fundo e o tabuleiro com O Pensador, desenhados em código
  if (themeId === "vaporwave" && !lite) {
    return (
      <div className="wp" aria-hidden="true">
        <VaporWallpaper />
      </div>
    );
  }
  // Frutiger Aero: o parque 3D animado (se ligado nas configurações); senão, a imagem parada do parque
  if (themeId === "frutiger" && !lite && aeroAnimated) {
    return (
      <div className="wp" aria-hidden="true">
        <AeroPark />
      </div>
    );
  }
  // Gen X Soft Club: céu e morro desenhados (sem imagem)
  if (themeId === "softclub") {
    return (
      <div className="wp" aria-hidden="true">
        <SoftClubSky playing={playing} />
      </div>
    );
  }
  const vars = { "--wp-crop": t.crop, "--wp-ar": W / (H * (1 - t.crop)) } as CSSProperties;
  return (
    <div className="wp" style={vars} aria-hidden="true">
      {!lite && <div className="wp-blur" style={{ backgroundImage: `url(${t.wallpaper})` }} />}
      <div className="wp-stage">
        <div className="wp-frame">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="wp-img" src={t.wallpaper} alt="" draggable={false} />
        </div>
      </div>
    </div>
  );
}