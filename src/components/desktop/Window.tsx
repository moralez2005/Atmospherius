"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";
import "./window.css";

type Props = {
  title: string;
  x: number;
  y: number;
  z: number;
  focused: boolean;
  minimized: boolean;
  width?: number;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onMove: (x: number, y: number) => void;
  children: ReactNode;
};

export default function Window({
  title, x, y, z, focused, minimized, width = 380,
  onFocus, onClose, onMinimize, onMove, children,
}: Props) {
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  function down(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("button")) return;
    drag.current = { dx: e.clientX - x, dy: e.clientY - y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const nx = Math.min(Math.max(0, e.clientX - drag.current.dx), window.innerWidth - 120);
    const ny = Math.min(Math.max(0, e.clientY - drag.current.dy), window.innerHeight - 90);
    onMove(nx, ny);
  }

  return (
    <div
      className={`os-window win ${focused ? "win-focus" : ""}`}
      style={{ left: x, top: y, width, zIndex: z, display: minimized ? "none" : undefined }}
      onPointerDown={onFocus}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="os-titlebar win-title"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={() => (drag.current = null)}
      >
        <button className="win-btn win-close" aria-label="Fechar" onClick={onClose}>
          ×
        </button>
        <span>{title}</span>
        <button className="win-btn win-min" aria-label="Minimizar" onClick={onMinimize}>
          –
        </button>
      </div>
      <div className="os-body win-body">{children}</div>
    </div>
  );
}