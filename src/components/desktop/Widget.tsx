"use client";

import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import type { Pos } from "./useWidgets";

// controles que continuam clicáveis (não começam arraste)
const INTERACTIVE = "button, input, select, textarea, label, a";
const TASKBAR = 60; // altura da barra de tarefas + folga

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, Math.max(min, max)));

// Envolve um widget do desktop e deixa arrastá-lo. Sem posição salva, ele fica na
// coluna da direita; depois de arrastado, fica onde foi solto (posição salva).
export default function Widget({
  pos,
  onDrop,
  children,
}: {
  pos?: Pos;
  onDrop: (p: Pos) => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // origem: posição do widget (relativa ao desktop) quando o arraste começou
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const [offset, setOffset] = useState<Pos | null>(null);

  function down(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || (e.target as HTMLElement).closest(INTERACTIVE)) return;
    const desk = e.currentTarget.closest(".os-desktop")?.getBoundingClientRect();
    const r = e.currentTarget.getBoundingClientRect();
    if (!desk) return;
    drag.current = { sx: e.clientX, sy: e.clientY, ox: r.left - desk.left, oy: r.top - desk.top, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function move(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    const x = e.clientX - d.sx;
    const y = e.clientY - d.sy;
    if (!d.moved && Math.hypot(x, y) < 5) return; // clique simples não move
    d.moved = true;
    setOffset({ x, y });
  }

  // posição final = origem + quanto o mouse andou (não depende do último desenho da tela)
  function up(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    drag.current = null;
    const el = ref.current;
    const desk = el?.closest(".os-desktop")?.getBoundingClientRect();
    if (d?.moved && el && desk) {
      onDrop({
        x: Math.round(clamp(d.ox + e.clientX - d.sx, 0, desk.width - el.offsetWidth)),
        y: Math.round(clamp(d.oy + e.clientY - d.sy, 0, desk.height - el.offsetHeight - TASKBAR)),
      });
    }
    setOffset(null);
  }

  // a posição salva é limitada à tela atual (caso a janela do navegador diminua)
  const style: CSSProperties = {
    ...(pos && {
      left: `clamp(0px, ${pos.x}px, calc(100% - 290px))`,
      top: `clamp(0px, ${pos.y}px, calc(100% - 200px))`,
    }),
    ...(offset && { transform: `translate(${offset.x}px, ${offset.y}px)` }),
  };

  return (
    <div
      ref={ref}
      className={`wg-drag ${pos ? "wg-free" : ""} ${offset ? "is-dragging" : ""}`}
      style={style}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      {children}
    </div>
  );
}
