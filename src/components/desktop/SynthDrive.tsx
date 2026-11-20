"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { carSound, djVoice, rideSound } from "@/lib/radioFx";
import HoloGirl from "./HoloGirl";
import { getTalk, readTime, subscribeTalk } from "./gretaTalk";
import MirrorView from "./MirrorView";
import SynthScene from "./SynthScene";
import { carBox, driveInput, setDriving, setView, useDriving, useView, type DriveView } from "./driveStore";
import { usePlayer } from "./usePlayer";
import "./synth-drive.css";

// Synthwave: clicar no carro do fundo faz a pessoa "entrar" nele.
// Por dentro: estrada pelo para-brisa, retrovisor, quadro de instrumentos, volante,
// rádio, câmbio (puxar pra trás acelera), a copiloto holográfica no banco do passageiro
// e as vistas da janela e do teto solar.

// área clicável que acompanha o carro do fundo
export function CarHotspot() {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let raf = 0;
    const follow = () => {
      const el = ref.current;
      if (el) {
        el.style.transform = `translate(${carBox.x}px, ${carBox.y}px)`;
        el.style.width = `${carBox.w}px`;
        el.style.height = `${carBox.h}px`;
      }
      raf = requestAnimationFrame(follow);
    };
    raf = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <button
      ref={ref}
      className="sd-hotspot"
      title="Entrar no carro"
      aria-label="Entrar no carro"
      onClick={(e) => {
        e.stopPropagation();
        carSound("enter");
        setDriving(true);
      }}
    >
      <span>entrar no carro</span>
    </button>
  );
}

function CarRadio() {
  const p = usePlayer("synthwave");
  const t = p.track;
  const text = t ? `${t.title} — ${t.artist}` : "SEM SINAL";
  return (
    <div className="sd-radio" onClick={(e) => e.stopPropagation()}>
      <div className="sd-lcd">
        <div className="sd-lcd-top">
          <span>FM {p.station.dial}</span>
          <span>{p.station.name.toUpperCase()}</span>
          <span className={`sd-eq ${p.playing ? "on" : ""}`}>
            <i />
            <i />
            <i />
            <i />
          </span>
        </div>
        <div className="sd-mq">
          <span>
            <b>{text}</b>
            <b aria-hidden="true">{text}</b>
          </span>
        </div>
      </div>
      <div className="sd-deck">
        <span className="sd-slot" />
        <button onClick={p.toggle} aria-label={p.playing ? "Pausar" : "Tocar"}>
          {p.playing ? "❚❚" : "▶"}
        </button>
        <button onClick={p.next} aria-label="Próxima faixa">
          ▶▶|
        </button>
      </div>
    </div>
  );
}

// câmbio de verdade: puxar a manopla pra trás acelera; empurrar pra frente freia; soltou, volta pro meio
const NEUTRAL = 0.34; // posição do meio, em fração da altura do trilho

function GearLever() {
  const track = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLButtonElement>(null);
  const held = useRef(false);
  const [used, setUsed] = useState(false);
  const usedRef = useRef(false);

  useEffect(() => {
    let raf = 0;
    let shown = 0;
    const tick = () => {
      const el = knob.current;
      const tr = track.current;
      if (!usedRef.current && driveInput.gasKey) {
        usedRef.current = true;
        setUsed(true);
      }
      if (el && tr) {
        const want = held.current ? driveInput.lever : driveInput.gasKey ? 1 : driveInput.brakeKey ? -1 : 0;
        shown += (want - shown) * (held.current ? 1 : 0.25);
        const h = tr.clientHeight;
        const pos = NEUTRAL + (shown >= 0 ? shown * (1 - NEUTRAL) : shown * NEUTRAL);
        const y = (0.12 + pos * 0.76) * h;
        el.style.transform = `translate(-50%, calc(${y}px - 50%)) rotateX(${shown * 18}deg)`;
        tr.style.setProperty("--pull", String(Math.max(0, shown)));
        tr.style.setProperty("--push", String(Math.max(0, -shown)));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  function move(clientY: number) {
    const tr = track.current;
    if (!tr) return;
    const r = tr.getBoundingClientRect();
    const f = ((clientY - r.top) / r.height - 0.12) / 0.76;
    const v = f >= NEUTRAL ? (f - NEUTRAL) / (1 - NEUTRAL) : (f - NEUTRAL) / NEUTRAL;
    driveInput.lever = Math.max(-1, Math.min(1, v));
  }
  function release() {
    held.current = false;
    driveInput.lever = 0;
  }

  return (
    <div className="sd-lever">
      <span className="sd-lever-lbl is-brake">▲ freia</span>
      <div
        ref={track}
        className="sd-lever-track"
        onPointerDown={(e) => {
          e.preventDefault();
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          held.current = true;
          setUsed(true);
          move(e.clientY);
        }}
        onPointerMove={(e) => held.current && move(e.clientY)}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
      >
        <i className="sd-lever-slot" />
        <i className="sd-lever-n" style={{ top: `${(0.12 + NEUTRAL * 0.76) * 100}%` }}>
          N
        </i>
        <button
          ref={knob}
          className="sd-lever-knob"
          aria-label="Câmbio: puxe para trás para acelerar, empurre para frente para frear"
          tabIndex={-1}
        />
      </div>
      <span className="sd-lever-lbl is-gas">▼ acelera</span>
      {!used && <span className="sd-lever-tip">puxe pra trás ↓</span>}
    </div>
  );
}

function ViewButtons({ view }: { view: DriveView }) {
  return (
    <div className="sd-views">
      {view !== "front" && (
        <button onClick={() => setView("front")}>
          ◉ voltar pro volante <small>V</small>
        </button>
      )}
      <button className={view === "window" ? "is-on" : ""} aria-pressed={view === "window"} onClick={() => setView("window")}>
        ◧ olhar pela janela <small>J</small>
      </button>
      <button className={view === "roof" ? "is-on" : ""} aria-pressed={view === "roof"} onClick={() => setView("roof")}>
        ▣ teto solar <small>T</small>
      </button>
      <button className={view === "mirror" ? "is-on" : ""} aria-pressed={view === "mirror"} onClick={() => setView("mirror")}>
        ◫ espelho <small>E</small>
      </button>
    </div>
  );
}

const HELP: Record<DriveView, string> = {
  front: "câmbio pra trás ou W/↑ acelera · S/↓ freia · ← → ou arraste pra virar e trocar de faixa · H buzina · F farol alto",
  window: "W/↑ acelera · S/↓ freia · ← → vira · sinta o vento",
  roof: "a Greta está dirigindo · braços abertos · V volta pro volante",
  mirror: "seu reflexo no retrovisor · clique ou V pra voltar",
};

export function Cockpit({ playing }: { playing: boolean }) {
  const driving = useDriving();
  const view = useView();
  const radio = usePlayer("synthwave"); // a copiloto comenta a música que está tocando
  const drag = useRef<number | null>(null);

  // Esc sai do carro; trocar de estética também tira a pessoa do carro
  useEffect(() => {
    if (!driving) return;
    const down = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === "Escape") return exit();
      if (k === "ArrowLeft" || k === "a") driveInput.steer = -1;
      else if (k === "ArrowRight" || k === "d") driveInput.steer = 1;
      else if (k === "ArrowUp" || k === "w") driveInput.gasKey = 1;
      else if (k === "ArrowDown" || k === "s") driveInput.brakeKey = 1;
      else if (e.repeat) return;
      else if (k === "h") carSound("horn");
      else if (k === "f") toggleLights();
      else if (k === "j") setView("window");
      else if (k === "t") setView("roof");
      else if (k === "e") setView("mirror");
      else if (k === "v") setView("front");
      else return;
      if (k.startsWith("Arrow")) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (["ArrowLeft", "ArrowRight", "a", "d"].includes(k)) driveInput.steer = 0;
      if (k === "ArrowUp" || k === "w") driveInput.gasKey = 0;
      if (k === "ArrowDown" || k === "s") driveInput.brakeKey = 0;
    };
    // som do motor e do vento (começa depois da partida)
    const t = setTimeout(() => rideSound(true), 1100);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", releaseAll);
    return () => {
      clearTimeout(t);
      rideSound(false);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", releaseAll);
      releaseAll();
    };
  }, [driving]);
  useEffect(() => () => setDriving(false), []);

  if (!driving) return null;
  return createPortal(
    <div
      className={`sd-cockpit is-${view}`}
      onClick={(e) => e.stopPropagation()}
      // arrastar na cena (fora dos botões) vira o volante: dá pra fazer curva no mouse ou no dedo
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).tagName !== "CANVAS" || (e.target as HTMLElement).closest(".sd-holo")) return;
        drag.current = e.clientX;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (drag.current === null) return;
        driveInput.steer = Math.max(-1, Math.min(1, (e.clientX - drag.current) / 160));
      }}
      onPointerUp={() => {
        if (drag.current === null) return;
        drag.current = null;
        driveInput.steer = 0;
      }}
      onPointerCancel={() => {
        drag.current = null;
        driveInput.steer = 0;
      }}
    >
      <SynthScene playing={playing} cockpit />
      <HoloGirl playing={playing} track={radio.track} />
      <div className="sd-console">
        <CarRadio />
        <DashButtons />
      </div>
      <RadioDJ />
      <GearLever />
      {view === "mirror" && <MirrorView onClose={() => setView("front")} />}
      {view === "roof" && (
        <div className="sd-ai" role="status">
          <b>◈ Greta no controle</b>
          <span>Deixa o volante comigo, caçador. Abre os braços e sente a cidade.</span>
        </div>
      )}
      <TalkLine view={view} />
      <ViewButtons view={view} />
      <p className="sd-help">{HELP[view]}</p>
      <button className="sd-exit" onClick={exit}>
        ⟵ sair do carro <small>Esc</small>
      </button>
    </div>,
    document.body,
  );
}

// DJ Nox, o locutor da Nightdrive FM: anuncia a música que começa e, de tempos em tempos,
// chama a próxima. A legenda aparece em cima do rádio e uma "voz" de rádio (sílabas sintetizadas)
// fala junto, com a música abaixando enquanto ele fala.
const NOW_LINES = [
  "Nightdrive FM, 84.0. A chuva não para, e nem a gente. Tocando agora: {artist}, {title}.",
  "São {hora} em Neo-Tóquio. Se você tá acordado, essa é pra você: {title}, {artist}.",
  "Pros taxistas, pros insones e pros caçadores da madrugada: {artist}, com {title}.",
  "Aumenta aí. {title}, {artist}, aqui na sua Nightdrive FM.",
  "Sem comercial, sem pressa, só neon. Agora é {artist}.",
  "Essa vai pra quem tá rodando a cidade sem destino. {title}, {artist}.",
];
const NEXT_LINES = [
  "Você tá ouvindo a Nightdrive FM. Daqui a pouco: {artist}, {title}. Não sai daí.",
  "{hora} no relógio da avenida. Na sequência, {title}. Segura o volante.",
  "Recado da rádio: bebe água, dorme um pouco. Depois dessa, {artist}.",
  "Nightdrive FM, a trilha da cidade que nunca dorme. Já já: {title}, de {artist}.",
];
function fill(line: string, t: { title: string; artist: string }) {
  const d = new Date();
  const hora = `${d.getHours()}h${String(d.getMinutes()).padStart(2, "0")}`;
  return line.replace("{title}", t.title).replace("{artist}", t.artist).replace("{hora}", hora);
}
const pickOne = (a: string[]) => a[Math.floor(Math.random() * a.length)];

function RadioDJ() {
  const p = usePlayer("synthwave");
  const [line, setLine] = useState<{ text: string; id: number } | null>(null);
  const api = useRef(p);
  api.current = p;
  const stopVoice = useRef<() => void>(() => {});
  const lastTrack = useRef<string | null>(null);
  const lastTalk = useRef(0);

  const speak = useRef((text: string) => {
    const ms = 1400 + text.length * 58;
    stopVoice.current();
    stopVoice.current = djVoice(ms);
    api.current.duck(true);
    lastTalk.current = Date.now();
    const id = Date.now();
    setLine({ text, id });
    setTimeout(() => {
      api.current.duck(false);
      setLine((l) => (l && l.id === id ? null : l));
    }, ms + 400);
  }).current;

  // música nova começando: ele anuncia (inclusive a que já tocava quando você entrou)
  useEffect(() => {
    const t = p.track;
    if (!t || !p.playing || t.id === lastTrack.current) return;
    const first = lastTrack.current === null;
    lastTrack.current = t.id;
    const timer = setTimeout(() => speak(fill(pickOne(NOW_LINES), t)), first ? 700 : 1200);
    return () => clearTimeout(timer);
  }, [p.track, p.playing, speak]);

  // de tempos em tempos, chama a próxima da fila
  useEffect(() => {
    const iv = setInterval(() => {
      if (!api.current.playing || Date.now() - lastTalk.current < 140000) return;
      speak(fill(pickOne(NEXT_LINES), api.current.peekNext()));
    }, 10000);
    return () => {
      clearInterval(iv);
      stopVoice.current();
      api.current.duck(false);
    };
  }, [speak]);

  if (!line) return null;
  return (
    <div key={line.id} className="sd-dj" role="status">
      <b>
        <i /> NO AR · DJ NOX · 84.0
      </b>
      <span>{line.text}</span>
    </div>
  );
}

// legenda da conversa: o caçador sempre; a Greta só quando o holograma dela não está à vista
function TalkLine({ view }: { view: DriveView }) {
  const talk = useSyncExternalStore(subscribeTalk, getTalk, getTalk);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!talk.text) return;
    setShown(talk.id);
    const t = setTimeout(() => setShown(0), readTime(talk.text) + 600);
    return () => clearTimeout(t);
  }, [talk]);
  const holoVisible = view === "front" || view === "mirror";
  if (shown !== talk.id || !talk.text || (talk.who === "g" && (holoVisible || view === "roof"))) return null;
  return (
    <p key={talk.id} className={`sd-talk is-${talk.who}`} role="status">
      <b>{talk.who === "h" ? "Caçador" : "◈ Greta"}</b>
      {talk.text}
    </p>
  );
}

function releaseAll() {
  driveInput.steer = 0;
  driveInput.gasKey = 0;
  driveInput.brakeKey = 0;
  driveInput.lever = 0;
}

function toggleLights() {
  driveInput.high = !driveInput.high;
  carSound("lights");
}

// botões físicos do painel: farol alto e buzina
function DashButtons() {
  const [high, setHigh] = useState(driveInput.high);
  return (
    <div className="sd-dash-btns">
      <button
        className={high ? "is-on" : ""}
        aria-pressed={high}
        onClick={() => {
          toggleLights();
          setHigh(driveInput.high);
        }}
      >
        ◖◗ farol alto
      </button>
      <button onClick={() => carSound("horn")}>♪ buzina</button>
    </div>
  );
}

function exit() {
  carSound("exit");
  setDriving(false);
}
