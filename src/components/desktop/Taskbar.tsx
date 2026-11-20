"use client";

import { useEffect, useState } from "react";
import type { AppId } from "@/config/apps";

export type Task = { id: AppId; label: string; minimized: boolean; focused: boolean };

export default function Taskbar({
  menuOpen,
  onToggleMenu,
  tasks,
  onTask,
  playing,
  radioMin,
  onRadio,
  trackLabel,
}: {
  menuOpen: boolean;
  onToggleMenu: () => void;
  tasks: Task[];
  onTask: (id: AppId) => void;
  playing: boolean;
  radioMin: boolean;
  onRadio: () => void;
  trackLabel: string;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="dk-taskbar" onClick={(e) => e.stopPropagation()}>
      <button className="os-btn dk-start" aria-expanded={menuOpen} onClick={onToggleMenu}>
        <span className="dk-start-logo" />
        iniciar
      </button>

      <div className="dk-tasks">
        {tasks.map((t) => (
          <button
            key={t.id}
            className={`os-btn dk-task ${t.minimized ? "is-min" : ""}`}
            aria-pressed={t.focused}
            onClick={() => onTask(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="dk-tray">
        {/* equalizador = botão da rádio: abre/minimiza o player */}
        <button
          className={`dk-radio ${radioMin ? "is-min" : ""}`}
          aria-pressed={!radioMin}
          aria-label={radioMin ? "Abrir a rádio" : "Minimizar a rádio"}
          title={`${radioMin ? "Abrir a rádio" : "Minimizar a rádio"} · ${trackLabel}`}
          onClick={onRadio}
        >
          <span className={`dk-eq ${playing ? "on" : ""}`}>
            <i />
            <i />
            <i />
          </span>
        </button>
        <span className="dk-clock">
          <b>{now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</b>
          <small>
            {now.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}
          </small>
        </span>
      </div>
    </div>
  );
}