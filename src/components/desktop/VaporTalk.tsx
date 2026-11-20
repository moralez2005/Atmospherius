"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { createVaporWorld, pauseWallpaper, thinkerBox, type WorldState } from "@/lib/vaporWorld";
import { ARRIVE, BACK, DEBATES, readTime, songComment, type TLine, type Topic } from "./thinkerTalk";
import { usePlayer } from "./usePlayer";
import "./vapor-talk.css";

// Vaporwave: clicar no Pensador do papel de parede leva você pra dentro do tabuleiro.
// Você atravessa a grade rosa até a borda, senta do lado da estátua e vocês conversam
// sobre filosofia, games e música. Virando pra frente, o lago com o rio descendo a
// montanha, o sol listrado e os golfinhos.

/* ---------- aberto / fechado ---------- */
let open = false;
const subs = new Set<() => void>();
function setOpen(v: boolean) {
  open = v;
  subs.forEach((f) => f());
}
const useOpen = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => {
        subs.delete(f);
      };
    },
    () => open,
    () => false,
  );

// área clicável que acompanha O Pensador desenhado no papel de parede
export function ThinkerHotspot() {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let raf = 0;
    const follow = () => {
      const el = ref.current;
      if (el) {
        el.style.left = `${thinkerBox.x}px`;
        el.style.top = `${thinkerBox.y}px`;
        el.style.width = `${thinkerBox.w}px`;
        el.style.height = `${thinkerBox.h}px`;
      }
      raf = requestAnimationFrame(follow);
    };
    raf = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <button
      ref={ref}
      className="vt-hotspot"
      title="Sentar com O Pensador"
      aria-label="Sentar com O Pensador"
      onClick={(e) => {
        e.stopPropagation();
        setOpen(true);
      }}
    >
      <span>ｓｅｎｔａｒ　ｃｏｍ　Ｏ　Ｐｅｎｓａｄｏｒ</span>
    </button>
  );
}

const TOPICS: { id: Topic; label: string }[] = [
  { id: "filo", label: "Filosofia" },
  { id: "games", label: "Games" },
  { id: "musica", label: "Música" },
  { id: "arte", label: "Arte" },
  { id: "internet", label: "Internet" },
  { id: "vida", label: "Vida" },
];

function metBefore() {
  try {
    return localStorage.getItem("pensador-conheceu") === "1";
  } catch {
    return false;
  }
}
function markMet() {
  try {
    localStorage.setItem("pensador-conheceu", "1");
  } catch {}
}

export function VaporTalk() {
  const isOpen = useOpen();
  if (!isOpen) return null;
  return createPortal(<Scene />, document.body);
}

function Scene() {
  const cv = useRef<HTMLCanvasElement>(null);
  const world = useRef<WorldState>({ look: 0, walk: 0, talk: 0 });
  const lookTarget = useRef(0);
  const [view, setView] = useState<"lago" | "pensador">("lago");
  const [seated, setSeated] = useState(false);
  const [line, setLine] = useState<(TLine & { id: number }) | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const lastLine = useRef(Date.now());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const talkUntil = useRef(0);
  const used = useRef(
    Object.fromEntries(Object.entries(DEBATES).map(([k, v]) => [k, Math.floor(Math.random() * v.length)])) as Record<Topic, number>,
  );
  const radio = usePlayer("vaporwave");

  // virar a cabeça: um movimento só, lento e suave (acelera e desacelera), sem "pular de janela"
  const lookAnim = useRef({ from: 0, start: 0 });
  const look = (v: "lago" | "pensador") => {
    const to = v === "lago" ? 0 : 1;
    if (to === lookTarget.current) return;
    setView(v);
    lookAnim.current = { from: world.current.look, start: performance.now() };
    lookTarget.current = to;
  };
  // modo contemplativo: só olhar o lago, a câmera chega perto e ninguém fala nada
  const [calm, setCalm] = useState(false);
  const calmRef = useRef(false);
  const zoomTarget = useRef(0);
  const enterCalm = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    busyRef.current = false;
    setBusy(false);
    setLine(null);
    talkUntil.current = 0;
    look("lago");
    calmRef.current = true;
    setCalm(true);
    zoomTarget.current = 1;
  };
  const leaveCalm = () => {
    calmRef.current = false;
    setCalm(false);
    zoomTarget.current = 0;
    lastLine.current = Date.now();
  };

  // uma conversa: fala por fala, com a "voz" de mármore dele
  const play = useRef((lines: TLine[]) => {
    busyRef.current = true;
    setBusy(true);
    let at = 0;
    lines.forEach((ln, i) => {
      timers.current.push(
        setTimeout(() => {
          const ms = readTime(ln.text);
          lastLine.current = Date.now();
          setLine({ ...ln, id: Date.now() + i });
          if (ln.who === "p") talkUntil.current = performance.now() + ms * 0.8; // só o brilho, sem voz
        }, at),
      );
      at += readTime(ln.text) + 450;
    });
    timers.current.push(
      setTimeout(() => {
        busyRef.current = false;
        setBusy(false);
        setLine(null);
        lastLine.current = Date.now();
      }, at),
    );
  }).current;

  const debate = useRef((topic: Topic) => {
    if (busyRef.current) return;
    const list = DEBATES[topic];
    play(list[used.current[topic]++ % list.length]);
  }).current;

  // canvas do mundo
  useEffect(() => {
    const canvas = cv.current;
    if (!canvas) return;
    const stop = createVaporWorld(canvas, () => world.current);
    pauseWallpaper(true);
    let raf = 0;
    const t0 = performance.now();
    let prev = t0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const w = world.current;
      const dt = Math.max(0, Math.min(0.1, (now - prev) / 1000));
      prev = now;
      w.walk = Math.max(0, Math.min(1, (now - t0) / 3600));
      const la = lookAnim.current;
      const u = Math.min(1, (now - la.start) / 1600);
      const e = u * u * u * (u * (u * 6 - 15) + 10); // smootherstep
      w.look = la.from + (lookTarget.current - la.from) * e;
      w.zoom = (w.zoom ?? 0) + (zoomTarget.current - (w.zoom ?? 0)) * Math.min(1, dt * 0.6);
      const target = now < talkUntil.current ? 0.6 + 0.4 * Math.abs(Math.sin(now / 90)) : 0;
      w.talk += (target - w.talk) * 0.2;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      stop();
      pauseWallpaper(false);
    };
  }, []);

  // chegada: atravessa o tabuleiro, senta, vira pro Pensador e ele puxa conversa
  useEffect(() => {
    const t1 = setTimeout(() => setSeated(true), 3600);
    const t2 = setTimeout(() => look("pensador"), 4200);
    const t3 = setTimeout(() => {
      if (metBefore()) play(BACK[Math.floor(Math.random() * BACK.length)]);
      else {
        markMet();
        play(ARRIVE);
      }
    }, 5200);
    const all = timers.current;
    return () => {
      [t1, t2, t3].forEach(clearTimeout);
      all.forEach(clearTimeout);
    };
  }, [play]);

  // ele comenta a música da Rádio Vapor que começou
  const lastTrack = useRef<string | null>(null);
  useEffect(() => {
    const t = radio.track;
    if (!t || !radio.playing || t.id === lastTrack.current) return;
    const first = lastTrack.current === null;
    lastTrack.current = t.id;
    if (first) return; // a que já tocava ele deixa quieta (a chegada já tem fala)
    const timer = setTimeout(() => !busyRef.current && !calmRef.current && play([{ who: "p", text: songComment(t) }]), 1500);
    return () => clearTimeout(timer);
  }, [radio.track, radio.playing, play]);

  // silêncio demais: ele puxa um assunto sozinho
  useEffect(() => {
    const iv = setInterval(() => {
      if (!seated || calmRef.current || busyRef.current || Date.now() - lastLine.current < 32000) return;
      debate(TOPICS[Math.floor(Math.random() * TOPICS.length)].id);
    }, 4000);
    return () => clearInterval(iv);
  }, [seated, debate]);

  // teclado: ← Pensador, → lago, 1 a 6 temas, Esc volta
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (calmRef.current) {
        // qualquer tecla sai do modo contemplativo
        e.preventDefault();
        leaveCalm();
        return;
      }
      if (e.key === "Escape") setOpen(false);
      else if (seated && (e.key === "o" || e.key === "O" || e.key === " ")) enterCalm();
      else if (e.key === "ArrowRight" || e.key === "d") look("lago");
      else if (e.key === "ArrowLeft" || e.key === "a") look("pensador");
      else if (seated && /^[1-6]$/.test(e.key)) debate(TOPICS[Number(e.key) - 1].id);
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [seated, debate]);

  return (
    <div
      className={`vt ${calm ? "is-calm" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        if (calmRef.current) leaveCalm();
      }}
    >
      <canvas ref={cv} className="vt-canvas" />
      <span className="vt-scan" aria-hidden="true" />
      <button className="vt-exit" onClick={() => setOpen(false)}>
        ⟵ voltar pro tabuleiro <small>Esc</small>
      </button>
      {radio.track && (
        <div className="vt-radio">
          ＲＡＤＩＯ ＶＡＰＯＲ {radio.station.dial} · {radio.track.title} — {radio.track.artist}
        </div>
      )}
      {!seated && <div className="vt-walk">ａｔｒａｖｅｓｓａｎｄｏ　ｏ　ｔａｂｕｌｅｉｒｏ．．．</div>}
      {seated && (
        <div className="vt-views">
          <button className={view === "pensador" ? "on" : ""} onClick={() => look("pensador")}>
            ← olhar O Pensador
          </button>
          <button className={view === "lago" ? "on" : ""} onClick={() => look("lago")}>
            olhar o lago →
          </button>
          <button className="vt-calm-btn" onClick={(e) => (e.stopPropagation(), enterCalm())}>
            ☾ só observar <small>O</small>
          </button>
        </div>
      )}
      {calm && <div className="vt-calm-hint">ｍｏｄｏ　ｃｏｎｔｅｍｐｌａｔｉｖｏ · clique ou qualquer tecla pra voltar</div>}
      {line && (
        <div key={line.id} className={`vt-say is-${line.who}`} role="status">
          <div className="vt-say-t">
            <span>{line.who === "p" ? "ｏ＿ｐｅｎｓａｄｏｒ．ｅｘｅ" : "ｖｏｃê．ｔｘｔ"}</span>
            <i>_ □ ×</i>
          </div>
          <p>{line.text}</p>
        </div>
      )}
      {seated && (
        <div className="vt-topics">
          <span>puxar assunto:</span>
          {TOPICS.map((tp, i) => (
            <button key={tp.id} disabled={busy} onClick={() => debate(tp.id)}>
              ☆ {tp.label} <small>{i + 1}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
