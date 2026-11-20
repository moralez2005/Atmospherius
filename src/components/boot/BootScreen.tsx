"use client";

import { useEffect, useState } from "react";
import { BOOT_MS, playBootSound } from "@/lib/bootSound";
import "./boot.css";
import { SYSTEM, SYSTEM_FULL } from "@/config/system";

const MESSAGES = [
  `iniciando ${SYSTEM_FULL.toLowerCase()}`,
  "memoria ........ 640k ok",
  "carregando esteticas: vapor, synth, aero, soft club",
  "afinando o radio da estetica",
  "pronto.",
];
const BLOCKS = 14;

export default function BootScreen({ onDone }: { onDone: () => void }) {
  const [started, setStarted] = useState(false);
  const [progress, setProgress] = useState(0);

  function start() {
    playBootSound(); // o clique libera o áudio no navegador
    setStarted(true);
  }

  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => setProgress((p) => Math.min(p + 10000 / BOOT_MS, 100)), 100);
    return () => clearInterval(id);
  }, [started]);

  useEffect(() => {
    if (progress < 100) return;
    const t = setTimeout(onDone, 600);
    return () => clearTimeout(t);
  }, [progress, onDone]);

  const filled = Math.floor((progress / 100) * BLOCKS);
  const last = Math.min(Math.floor(progress / (100 / MESSAGES.length)), MESSAGES.length - 1);

  return (
    <div data-theme="vaporwave" className="os-desktop os-fx boot-root">
      <div className="os-window boot-win">
        <div className="os-titlebar">
          <span>{SYSTEM.name}</span>
        </div>
        <div className="os-body boot-body">
          <div className="boot-scene" aria-hidden="true">
            <span className="boot-sun" />
            <span className="boot-floor" />
          </div>
          <div className="boot-logo">{SYSTEM.name}</div>
          <div className="boot-kana">
            {SYSTEM.kana} · v{SYSTEM.version}
          </div>

          {!started ? (
            <>
              <button className="os-btn boot-start" onClick={start}>
                ▶ LIGAR
              </button>
              <div className="boot-hint">clique para ligar o computador</div>
            </>
          ) : (
            <>
              <div className="boot-bar">
                {Array.from({ length: BLOCKS }, (_, i) => (
                  <div key={i} className={`boot-block ${i < filled ? "on" : ""}`} />
                ))}
              </div>
              <div className="boot-log">
                {MESSAGES.slice(0, last + 1).map((m) => (
                  <div key={m}>&gt; {m}</div>
                ))}
                <span className="boot-cursor" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}