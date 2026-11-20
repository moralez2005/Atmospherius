"use client";

import { useSyncExternalStore } from "react";

// Estado dos widgets do desktop, salvo no navegador.
export type WidgetId = "radio" | "clock";
export type Pos = { x: number; y: number };
export type WidgetsState = {
  radioMin: boolean; // rádio minimizada na barra de tarefas
  clockHidden: boolean; // relógio escondido
  pos: Partial<Record<WidgetId, Pos>>; // sem posição = coluna da direita
};

const KEY = "estetica-widgets";
const DEFAULT: WidgetsState = { radioMin: false, clockHidden: false, pos: {} };

let state: WidgetsState = DEFAULT;
let loaded = false;
const listeners = new Set<() => void>();

function get() {
  if (!loaded) {
    loaded = true;
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
      if (saved && typeof saved === "object") state = { ...DEFAULT, ...saved };
    } catch {}
  }
  return state;
}

function set(patch: Partial<WidgetsState>) {
  state = { ...get(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

export function useWidgets() {
  const s = useSyncExternalStore(subscribe, get, () => DEFAULT);
  return {
    ...s,
    setRadioMin: (radioMin: boolean) => set({ radioMin }),
    setClockHidden: (clockHidden: boolean) => set({ clockHidden }),
    setPos: (id: WidgetId, p: Pos) => set({ pos: { ...get().pos, [id]: p } }),
    // volta tudo ao lugar original: coluna da direita, rádio e relógio visíveis
    reset: () => set(DEFAULT),
  };
}

export type WidgetsApi = ReturnType<typeof useWidgets>;
