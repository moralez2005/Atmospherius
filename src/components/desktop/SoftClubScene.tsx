"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { sfx } from "@/lib/uiSound";
import { markWelcomeSeen, welcomeSeen } from "@/lib/bootSound";
import "./softclub-scene.css";

// Gen X Soft Club com cara de computador do começo dos anos 2000:
// - tela de "bem-vindo" com som de inicialização ao entrar na estética
// - vinheta de coletânea de verão (CD cromado girando + letreiro) de tempos em tempos
// - um aviso por vez saindo da bandeja: balão do sistema, mensageiro ou recado
// - rastro de brilho no cursor
// Tudo genérico, sem logos nem nomes de marcas. Poucos elementos ao mesmo tempo.

type Note =
  | { kind: "balloon"; title: string; text: string }
  | { kind: "im"; who: string; text: string; nudge?: boolean; music?: boolean }
  | { kind: "scrap"; who: string; text: string };

const NOTES: Note[] = [
  { kind: "balloon", title: "Conectado à internet", text: "Conexão discada a 56,0 Kbps. Bom verão!" },
  { kind: "im", who: "~*Gaby*~", text: "acabou de entrar." },
  { kind: "scrap", who: "Lu ♥ Verão", text: "adoreeei as fotos da praia!!! saudades bjoo ★" },
  { kind: "im", who: "DJ Rafinha", text: "está ouvindo: Eletro Verão FM", music: true },
  { kind: "balloon", title: "Novo hardware encontrado", text: "Discman portátil — pronto para usar." },
  { kind: "im", who: "xX_Skater_Xx", text: "chamou sua atenção!", nudge: true },
  { kind: "scrap", who: "DJ Rafinha", text: "sábado tem festa, leva o CD de verão :D" },
  { kind: "balloon", title: "Atualizações automáticas", text: "Novos hits do verão prontos para tocar." },
];

const FIRST = 9000; // primeiro aviso (depois do bem-vindo e da vinheta)
const SHOW = 6500; // quanto tempo cada aviso fica na tela
const EVERY = 19000; // intervalo entre avisos

// carinha do mensageiro (genérica)
function Buddy({ tone }: { tone: "on" | "nudge" | "music" }) {
  const color = tone === "nudge" ? "#ff8a3d" : tone === "music" ? "#8a5cff" : "#2fae5a";
  return (
    <svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true">
      <circle cx="16" cy="16" r="14" fill={color} stroke="#fff" strokeWidth="2" />
      <circle cx="11.5" cy="13" r="2" fill="#fff" />
      <circle cx="20.5" cy="13" r="2" fill="#fff" />
      <path d="M10 19 Q16 25 22 19" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// tela de boas-vindas ao entrar na estética
function Welcome() {
  // se já tocou nesta inicialização, nem aparece (evita repetir ao trocar de estética,
  // voltar do /dashboard ou no Strict Mode do dev, que monta o efeito duas vezes)
  const [phase, setPhase] = useState<"in" | "out" | "gone">(() => (welcomeSeen() ? "gone" : "in"));
  useEffect(() => {
    if (!welcomeSeen()) {
      markWelcomeSeen();
      sfx("startup");
    }
    const a = setTimeout(() => setPhase("out"), 2300);
    const b = setTimeout(() => setPhase("gone"), 3100);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);
  if (phase === "gone") return null;
  // vai direto no <body> para cobrir também a barra de tarefas
  return createPortal(
    <div className={`sc-welcome ${phase === "out" ? "is-out" : ""}`} aria-hidden="true">
      <span className="sc-welcome-line" />
      <div className="sc-welcome-mid">
        <b>bem-vindo</b>
        <small>carregando suas configurações pessoais...</small>
      </div>
      <span className="sc-welcome-line is-bottom" />
    </div>,
    document.body,
  );
}

// avisos da bandeja: um por vez
function Notes() {
  const [n, setN] = useState(-1);
  const [on, setOn] = useState(false);
  useEffect(() => {
    let i = -1;
    let hide: ReturnType<typeof setTimeout> | undefined;
    let loop: ReturnType<typeof setInterval> | undefined;
    const show = () => {
      i = (i + 1) % NOTES.length;
      setN(i);
      setOn(true);
      if (NOTES[i].kind !== "balloon") sfx("notify");
      hide = setTimeout(() => setOn(false), SHOW);
    };
    const first = setTimeout(() => {
      show();
      loop = setInterval(show, EVERY);
    }, FIRST);
    return () => {
      clearTimeout(first);
      clearTimeout(hide);
      clearInterval(loop);
    };
  }, []);
  if (n < 0) return null;
  const note = NOTES[n];

  if (note.kind === "balloon") {
    return (
      <div key={n} className={`sc-balloon ${on ? "is-on" : ""}`} role="status">
        <b>
          <i>i</i>
          {note.title}
        </b>
        <p>{note.text}</p>
      </div>
    );
  }
  return (
    <div key={n} className={`sc-toast ${on ? "is-on" : ""} ${note.kind === "im" && note.nudge ? "is-nudge" : ""}`} role="status">
      <div className="sc-toast-t">{note.kind === "im" ? "mensageiro" : "novo recado"}</div>
      <div className="sc-toast-b">
        {note.kind === "im" ? (
          <Buddy tone={note.nudge ? "nudge" : note.music ? "music" : "on"} />
        ) : (
          <span className="sc-scrap-ico">✉</span>
        )}
        <span>
          <b>{note.who}</b>
          {` ${note.text}`}
        </span>
      </div>
    </div>
  );
}

// vinheta de coletânea de verão (CD cromado + letreiro)
function SummerSpot() {
  return (
    <div className="sc-spot">
      <span className="sc-spot-cd">
        <i />
      </span>
      <span className="sc-spot-txt">
        <b>ELETRO VERÃO</b>
        <em>os hits do verão · FM 2001</em>
      </span>
      <span className="sc-spot-shine" />
    </div>
  );
}

// rastro de brilhos atrás do cursor
type Spark = { id: number; x: number; y: number; c: number };
function CursorSparkles() {
  const [sparks, setSparks] = useState<Spark[]>([]);
  const seq = useRef(0);
  const last = useRef(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    function move(e: PointerEvent) {
      const now = performance.now();
      if (now - last.current < 70) return;
      last.current = now;
      const id = ++seq.current;
      setSparks((s) => [...s.slice(-7), { id, x: e.clientX, y: e.clientY, c: id % 4 }]);
      setTimeout(() => setSparks((s) => s.filter((p) => p.id !== id)), 700);
    }
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);
  return (
    <>
      {sparks.map((p) => (
        <span key={p.id} className={`sc-spark c${p.c}`} style={{ left: p.x, top: p.y }}>
          ✦
        </span>
      ))}
    </>
  );
}

export default function SoftClubScene({ playing = false }: { playing?: boolean }) {
  return (
    <div className={`sc ${playing ? "is-playing" : ""}`}>
      <SummerSpot />
      <Notes />
      <CursorSparkles />
      <Welcome />
    </div>
  );
}
