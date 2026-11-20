"use client";

import "./aero-scene.css";

// Frutiger Aero: por cima do parque 3D (lib/aeroPark.ts) ficam só as gotas no "vidro" da tela.
// (Peixes, bolhas e reflexo de lente agora fazem parte do próprio parque.)

// aleatório determinístico (sem Math.random no render)
const rnd = (i: number, s = 1) => {
  const x = Math.sin((i + 1) * 12.9898 * s + s * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const DROPS = Array.from({ length: 11 }, (_, i) => ({
  left: rnd(i, 31) * 100,
  top: rnd(i, 32) * 70,
  size: 6 + rnd(i, 33) * 14,
  slide: rnd(i, 34) > 0.6,
  delay: -rnd(i, 35) * 20,
}));

export default function AeroScene({ playing = false }: { playing?: boolean }) {
  return (
    <div className={`ae ${playing ? "is-playing" : ""}`}>
      {/* gotas no vidro */}
      {DROPS.map((d, i) => (
        <span
          key={i}
          className={`ae-drop ${d.slide ? "slides" : ""}`}
          style={{
            left: `${d.left}%`,
            top: `${d.top}%`,
            width: `${d.size}px`,
            height: `${d.size * 1.15}px`,
            animationDelay: `${d.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
