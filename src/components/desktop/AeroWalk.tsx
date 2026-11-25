"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { createAeroPark, type ParkHandle } from "@/lib/aeroPark";
import { conversation, NPCS } from "@/lib/aeroNpcs";
import { sfx } from "@/lib/uiSound";
import "./aero-walk.css";

// Frutiger Aero: passear pelo parque com um boneco de vidro e conversar com os outros
// (mesma ideia do carro no Synthwave e do Pensador no Vaporwave).
// O parque é o mesmo do papel de parede (lib/aeroPark.ts), em modo passeio.

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

export function AeroWalkHotspot() {
  return (
    <button
      className="aw-hotspot"
      title="Passear pelo parque e conversar com o pessoal"
      aria-label="Passear pelo parque"
      onClick={(e) => {
        e.stopPropagation();
        sfx("open");
        setOpen(true);
      }}
    >
      <span className="aw-hotspot-dot" aria-hidden="true" />
      Passear no parque
    </button>
  );
}

export function AeroWalk() {
  const isOpen = useOpen();
  if (!isOpen) return null;
  return createPortal(<Walk />, document.body);
}

const hourNow = () =>
  (window as unknown as { __aeroHour?: number }).__aeroHour ?? new Date().getHours() + new Date().getMinutes() / 60;

function Walk() {
  const ref = useRef<HTMLCanvasElement>(null);
  const park = useRef<ParkHandle | null>(null);
  const [near, setNear] = useState(-1);
  const [talk, setTalk] = useState<{ npc: number; lines: string[]; at: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const [help, setHelp] = useState(true);
  const counts = useRef(NPCS.map(() => 0));
  const pops = useRef(0);
  // as funções de teclado leem sempre o estado mais novo
  const st = useRef({ near, talk });
  st.current = { near, talk };

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    park.current = createAeroPark(cv, () => setFailed(true), {
      onNear: (i) => setNear(i),
      onPop: () => {
        pops.current++;
      },
    });
    const hide = setTimeout(() => setHelp(false), 9000);
    return () => {
      clearTimeout(hide);
      park.current?.();
      park.current = null;
    };
  }, []);

  function startTalk(i: number) {
    const lines = conversation(i, counts.current[i], hourNow(), pops.current);
    counts.current[i]++;
    sfx("talk");
    park.current?.talk(i);
    setTalk({ npc: i, lines, at: 0 });
    setHelp(false);
  }
  function endTalk() {
    park.current?.endTalk();
    setTalk(null);
  }
  function next() {
    const t = st.current.talk;
    if (!t) return;
    if (t.at + 1 < t.lines.length) {
      sfx("talk");
      setTalk({ ...t, at: t.at + 1 });
    }
    else endTalk();
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { near: n, talk: t } = st.current;
      if (e.key === "Escape") {
        e.preventDefault();
        if (t) endTalk();
        else setOpen(false);
      } else if (e.code === "KeyE" || e.key === "Enter" || (t && e.code === "Space")) {
        e.preventDefault();
        if (t) next();
        else if (n >= 0) startTalk(n);
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const npc = talk ? NPCS[talk.npc] : near >= 0 ? NPCS[near] : null;
  const color = (n: (typeof NPCS)[number]) => `rgb(${n.tint.map((v) => Math.round(Math.min(1, v) * 255)).join(",")})`;

  return (
    <div className="aw-overlay" role="dialog" aria-label="Passeio no parque">
      <canvas ref={ref} className="aw-canvas" aria-hidden="true" />
      <div className="aw-bar">
        <b>Parque</b>
        <small>W/S andar · A/D virar · Shift correr · E conversar · Esc sair</small>
        <button className="aw-close" onClick={() => setOpen(false)} aria-label="Sair do parque">
          Sair ✕
        </button>
      </div>

      {failed && (
        <div className="aw-panel aw-fail">
          A placa de vídeo não deu conta do parque 3D agora. Tente fechar outras abas e abrir de novo.
        </div>
      )}

      {help && !talk && !failed && (
        <div className="aw-panel aw-help">
          Ande pelo parque e chegue perto de alguém. Quando aparecer o nome, aperte <kbd>E</kbd> pra conversar.
          Clique nas bolhas de sabão pra estourar!
        </div>
      )}

      {!talk && npc && near >= 0 && (
        <button className="aw-prompt" onClick={() => startTalk(near)}>
          <kbd>E</kbd> conversar com <b style={{ color: color(npc) }}>{npc.name}</b>
        </button>
      )}

      {talk && npc && (
        <div className="aw-panel aw-talk" onClick={next} role="status" aria-live="polite">
          <div className="aw-name">
            <span className="aw-chip" style={{ background: color(npc) }} aria-hidden="true" />
            <b>{npc.name}</b>
            <small>vidro {npc.flavor.toLowerCase()}</small>
          </div>
          <p>{talk.lines[talk.at]}</p>
          <span className="aw-next">
            {talk.at + 1 < talk.lines.length ? "E ▸ continuar" : "E ▸ tchau!"}
          </span>
        </div>
      )}
    </div>
  );
}
