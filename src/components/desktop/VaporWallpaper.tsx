"use client";

import { useEffect, useRef } from "react";
import { createVaporWorld } from "@/lib/vaporWorld";

// Papel de parede do Vaporwave desenhado em código: o lago com a montanha, o sol listrado,
// a palmeira e os golfinhos ao fundo; na frente, o tabuleiro rosa com a janela do Paint
// (O Pensador lá dentro) e as mãos recortadas nos cantos.
const STILL = { look: 0, walk: 1, talk: 0 };

export default function VaporWallpaper() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    return createVaporWorld(cv, () => STILL, "wallpaper");
  }, []);
  return <canvas ref={ref} className="wp-canvas" aria-hidden="true" />;
}
