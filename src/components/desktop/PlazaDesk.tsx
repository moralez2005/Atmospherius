"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePlayer } from "./usePlayer";
import "./plaza-desk.css";

// Plaza 2001 na área de trabalho do Soft Club: um shape encostado no gramado abre o jogo
// em tela cheia (mesma ideia do carro no Synthwave e do Pensador no Vaporwave).
// O jogo roda em public/games/plaza2001.html, dentro de um iframe.

let open = false;
const subs = new Set<() => void>();
const setOpen = (v: boolean) => {
  open = v;
  subs.forEach((f) => f());
};
const useOpen = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => open,
    () => false,
  );

export function PlazaHotspot() {
  return (
    <button
      className="pz-hotspot"
      title="Andar de skate na Plaza 2001"
      aria-label="Andar de skate na Plaza 2001"
      onClick={(e) => {
        e.stopPropagation();
        setOpen(true);
      }}
    >
      <svg viewBox="0 0 160 90" aria-hidden="true">
        <g transform="rotate(-14 80 45)">
          <rect x="18" y="56" width="10" height="8" rx="2" fill="#c9cfdc" />
          <rect x="122" y="56" width="10" height="8" rx="2" fill="#c9cfdc" />
          <circle cx="23" cy="68" r="7" fill="#ffd23f" stroke="#1b1530" strokeWidth="3" />
          <circle cx="127" cy="68" r="7" fill="#ffd23f" stroke="#1b1530" strokeWidth="3" />
          <path d="M8 46 Q4 56 16 56 H134 Q146 56 142 46 Z" fill="#ff6a1a" stroke="#1b1530" strokeWidth="4" strokeLinejoin="round" />
          <path d="M40 48 l6 6 l6 -6 l6 6 l6 -6" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          <circle cx="100" cy="51" r="5" fill="#ffd23f" stroke="#1b1530" strokeWidth="2" />
        </g>
      </svg>
      <span>PLAZA 2001 · andar de skate</span>
    </button>
  );
}

export function PlazaGame() {
  const isOpen = useOpen();
  if (!isOpen) return null;
  return createPortal(<Overlay />, document.body);
}

function Overlay() {
  const radio = usePlayer("softclub");

  // o jogo tem trilha própria: pausa a rádio da área de trabalho e devolve ao sair
  useEffect(() => {
    const wasPlaying = radio.playing;
    if (wasPlaying) radio.toggle();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
      if (wasPlaying) radio.toggle();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pz-overlay" role="dialog" aria-label="Plaza 2001">
      <div className="pz-bar">
        <b>PLAZA 2001</b>
        <small>clique no jogo para usar o teclado</small>
        <button className="pz-close" onClick={() => setOpen(false)} aria-label="Sair do jogo">
          Sair ✕
        </button>
      </div>
      <iframe className="pz-frame" src="/games/plaza2001.html?embed=1" title="Plaza 2001" allow="autoplay" />
    </div>
  );
}
