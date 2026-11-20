"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_THEME, THEMES, type ThemeId } from "@/config/themes";

export const THEME_KEY = "vaporos-theme"; // mesma chave usada no Shell

const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};

export function useStoredTheme(): ThemeId {
  return useSyncExternalStore(
    subscribe,
    () => {
      const v = localStorage.getItem(THEME_KEY);
      return v && v in THEMES ? (v as ThemeId) : DEFAULT_THEME;
    },
    () => DEFAULT_THEME
  );
}