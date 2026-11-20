"use client";

import { useEffect, useRef } from "react";
import { createAeroPark } from "@/lib/aeroPark";
import { aeroFailed, aeroStable, aeroStarting } from "@/lib/aeroSettings";

// Frutiger Aero: o parque 3D com os bonecos de vidro líquido (veja lib/aeroPark.ts)
export default function AeroPark() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    aeroStarting();
    const ok = setTimeout(aeroStable, 15000); // 15 s rodando sem travar: tudo certo
    const stop = createAeroPark(cv, aeroFailed); // se a placa de vídeo cair, volta pra imagem parada
    return () => {
      clearTimeout(ok);
      aeroStable();
      stop();
    };
  }, []);
  return <canvas ref={ref} className="wp-canvas" aria-hidden="true" />;
}
