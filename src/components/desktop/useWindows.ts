"use client";

import { useCallback, useState } from "react";
import type { AppId } from "@/config/apps";

export type WinState = { id: AppId; minimized: boolean; x: number; y: number; z: number };

const nextZ = (w: WinState[]) => Math.max(0, ...w.map((x) => x.z)) + 1;
const raise = (w: WinState[], id: AppId) =>
  w.map((x) => (x.id === id ? { ...x, minimized: false, z: nextZ(w) } : x));
const topOf = (w: WinState[]) =>
  [...w].filter((x) => !x.minimized).sort((a, b) => b.z - a.z)[0]?.id;

export function useWindows(initial?: AppId) {
  const [wins, setWins] = useState<WinState[]>(() =>
    initial ? [{ id: initial, minimized: false, x: 110, y: 50, z: 1 }] : []
  );
  
  const open = useCallback(
    (id: AppId) =>
      setWins((w) =>
        w.some((x) => x.id === id)
          ? raise(w, id)
          : [...w, { id, minimized: false, x: 110 + (w.length % 6) * 30, y: 50 + (w.length % 6) * 30, z: nextZ(w) }]
      ),
    []
  );
  const focus = useCallback(
    (id: AppId) => setWins((w) => (topOf(w) === id ? w : raise(w, id))),
    []
  );
  const close = useCallback((id: AppId) => setWins((w) => w.filter((x) => x.id !== id)), []);
  const minimize = useCallback(
    (id: AppId) => setWins((w) => w.map((x) => (x.id === id ? { ...x, minimized: true } : x))),
    []
  );
  const move = useCallback(
    (id: AppId, x: number, y: number) =>
      setWins((w) => w.map((s) => (s.id === id ? { ...s, x, y } : s))),
    []
  );
  // clique na barra de tarefas: restaura / minimiza / foca
  const toggle = useCallback(
    (id: AppId) =>
      setWins((w) => {
        const t = w.find((x) => x.id === id);
        if (!t) return w;
        if (t.minimized) return raise(w, id);
        if (topOf(w) === id) return w.map((x) => (x.id === id ? { ...x, minimized: true } : x));
        return raise(w, id);
      }),
    []
  );

  const order = [...wins].sort((a, b) => a.z - b.z).map((x) => x.id);
  return { wins, order, focusedId: topOf(wins), open, focus, close, minimize, move, toggle };
}