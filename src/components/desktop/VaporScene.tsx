"use client";

import { useEffect, useRef } from "react";
import "./vapor-scene.css";

// Vaporwave como fita VHS gasta: granulado, faixa de tracking, cortes de glitch com
// separação de cores e elementos surreais (janelas em cascata, letreiro LED,
// coluna grega flutuando, golfinho saltando). Glitch discreto: um surto curto de vez em quando (um pouco mais frequente com música).

// granulado de VHS: ruído em baixa resolução, trocado ~12 vezes por segundo
function Grain() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const w = (c.width = 220);
    const h = (c.height = 130);
    const img = ctx.createImageData(w, h);
    let id = 0;
    let last = 0;
    function draw(now: number) {
      id = requestAnimationFrame(draw);
      if (now - last < 80 || document.hidden) return;
      last = now;
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = Math.random() * 255;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
      }
      ctx!.putImageData(img, 0, 0);
    }
    id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, []);
  return <canvas ref={ref} className="vx-grain" />;
}

export default function VaporScene({ playing = false }: { playing?: boolean }) {
  return (
    <div className={`vx ${playing ? "is-playing" : ""}`}>
      {/* letreiro de LED */}
      <div className="vx-led">
        <div className="vx-led-t">Ｍｙ Ｃｏｍｐｕｔｅｒ</div>
        <div className="vx-led-b">
          <span>
            <b>ＨＥＬＬＯ ☆ ようこそ ☆ ＡＥＳＴＨＥＴＩＣ ☆ ＲＡＤＩＯ ＶＡＰＯＲ ☆ </b>
            <b aria-hidden="true">ＨＥＬＬＯ ☆ ようこそ ☆ ＡＥＳＴＨＥＴＩＣ ☆ ＲＡＤＩＯ ＶＡＰＯＲ ☆ </b>
          </span>
        </div>
      </div>

      {/* camadas da fita VHS por cima de tudo */}
      <Grain />
      <span className="vx-track" />
      <span className="vx-jitter" />
      <span className="vx-vignette" />
    </div>
  );
}
