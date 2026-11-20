import "./softclub-sky.css";

// Fundo do Gen X Soft Club: morro verde e céu azul de verão, no clima dos
// comerciais de computador do começo dos anos 2000. Desenho original (SVG + CSS),
// com nuvens passando e sombras de nuvem correndo pelo morro.

const CLOUDS = [
  { top: 8, w: 360, dur: 140, delay: -20 },
  { top: 18, w: 240, dur: 110, delay: -70 },
  { top: 4, w: 200, dur: 170, delay: -120 },
  { top: 26, w: 300, dur: 130, delay: -45 },
];

function Cloud({ w }: { w: number }) {
  return (
    <svg viewBox="0 0 300 110" width={w} height={(w * 110) / 300} aria-hidden="true">
      <defs>
        <filter id="scs-soft" x="-20%" y="-30%" width="140%" height="160%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <linearGradient id="scs-cloud" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dbeaf7" />
        </linearGradient>
      </defs>
      <g fill="url(#scs-cloud)" filter="url(#scs-soft)">
        <ellipse cx="80" cy="72" rx="62" ry="26" />
        <ellipse cx="130" cy="52" rx="52" ry="38" />
        <ellipse cx="185" cy="60" rx="56" ry="32" />
        <ellipse cx="230" cy="76" rx="50" ry="22" />
        <ellipse cx="150" cy="82" rx="110" ry="20" />
      </g>
    </svg>
  );
}

export default function SoftClubSky({ playing = false }: { playing?: boolean }) {
  return (
    <div className={`scs ${playing ? "is-playing" : ""}`} aria-hidden="true">
      {/* sol de verão com raios girando devagar */}
      <span className="scs-rays" />
      <span className="scs-sun" />

      {CLOUDS.map((c, i) => (
        <span
          key={i}
          className="scs-cloud"
          style={{ top: `${c.top}%`, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}
        >
          <Cloud w={c.w} />
        </span>
      ))}

      <svg className="scs-hills" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="scs-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a6d97a" />
            <stop offset="1" stopColor="#5f9f43" />
          </linearGradient>
          <linearGradient id="scs-near" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#86d24a" />
            <stop offset="0.35" stopColor="#4fa52b" />
            <stop offset="1" stopColor="#24611a" />
          </linearGradient>
          <radialGradient id="scs-lit" cx="0.42" cy="0.08" r="0.5">
            <stop offset="0" stopColor="#f6ffb0" stopOpacity="0.55" />
            <stop offset="1" stopColor="#f6ffb0" stopOpacity="0" />
          </radialGradient>
          {/* textura de grama (riscos finos) */}
          <filter id="scs-grass" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9 0.06" numOctaves="2" seed="7" />
            <feColorMatrix values="0 0 0 0 0.1  0 0 0 0 0.3  0 0 0 0 0.05  0 0 0 0.55 -0.12" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
        </defs>
        <path d="M0 640 C 260 575 520 600 780 615 S 1260 560 1600 590 L1600 900 L0 900 Z" fill="url(#scs-far)" />
        <g>
          <path
            id="scs-hill"
            d="M0 720 C 240 610 560 525 860 548 C 1120 568 1370 650 1600 640 L1600 900 L0 900 Z"
            fill="url(#scs-near)"
          />
          <path
            d="M0 720 C 240 610 560 525 860 548 C 1120 568 1370 650 1600 640 L1600 900 L0 900 Z"
            fill="url(#scs-lit)"
          />
          <path
            d="M0 720 C 240 610 560 525 860 548 C 1120 568 1370 650 1600 640 L1600 900 L0 900 Z"
            fill="#000"
            filter="url(#scs-grass)"
          />
        </g>
      </svg>

      {/* sombras de nuvem passando pelo morro */}
      <span className="scs-shadow" />
      <span className="scs-shadow scs-shadow-b" />
    </div>
  );
}
