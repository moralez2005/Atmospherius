"use client";

import { useState, useSyncExternalStore } from "react";
import BootScreen from "@/components/boot/BootScreen";
import Desktop from "@/components/desktop/Desktop";
import { NOTICES, type Notice } from "@/config/messages";
import { DEFAULT_THEME, THEMES, type ThemeId } from "@/config/themes";
import { THEME_KEY } from "@/lib/theme";
import { APPS, type AppId } from "@/config/apps";
import { resetWelcome } from "@/lib/bootSound";

function loadTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const v = localStorage.getItem(THEME_KEY);
  return v && v in THEMES ? (v as ThemeId) : DEFAULT_THEME;
}

// ?erro=chave ou ?aviso=chave na URL vira uma caixa de diálogo no desktop
function readNotice(): Notice | null {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search);
  const key = q.get("erro") ?? q.get("aviso");
  if (!key) return null;
  return NOTICES[key] ?? (q.has("erro") ? NOTICES["erro-generico"] : null);
}

// O boot só roda uma vez por aba. Recarregar a página cai direto no desktop,
// sem ligar o computador de novo.
const BOOT_KEY = "estetica-booted";
const readBooted = () => {
  try {
    return sessionStorage.getItem(BOOT_KEY) === "1";
  } catch {
    return false;
  }
};
const saveBooted = (on: boolean) => {
  try {
    if (on) sessionStorage.setItem(BOOT_KEY, "1");
    else sessionStorage.removeItem(BOOT_KEY);
  } catch {}
};

// ?abrir=jogos: abre a janela direto (link direto pra um app)
const noop = () => () => {};
const readOpen = () => new URLSearchParams(window.location.search).get("abrir");

export default function Shell() {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const bootedBefore = useSyncExternalStore(noop, readBooted, () => false);
  const abrir = useSyncExternalStore(noop, readOpen, () => null);
  // "auto": decide pelo que já aconteceu na aba; "boot"/"desk": escolha explícita
  const [phase, setPhase] = useState<"auto" | "boot" | "desk">("auto");
  const [themeId, setThemeId] = useState<ThemeId>(loadTheme);
  const [notice, setNotice] = useState<Notice | null>(readNotice);

  function changeTheme(id: ThemeId) {
    setThemeId(id);
    localStorage.setItem(THEME_KEY, id);
  }
  function closeNotice() {
    setNotice(null);
    window.history.replaceState(null, "", "/");
  }
  function finishBoot() {
    saveBooted(true);
    setPhase("desk");
  }
  function reboot() {
    saveBooted(false);
    resetWelcome(); // reiniciar o sistema libera a tela de bem-vindo de novo
    window.history.replaceState(null, "", "/");
    setPhase("boot");
  }

  // só decide entre boot e desktop no navegador (evita piscar a tela de boot)
  if (!mounted) return <div className="h-screen w-screen bg-black" />;
  const showBoot = phase === "boot" || (phase === "auto" && !bootedBefore && !abrir);
  if (showBoot) return <BootScreen onDone={finishBoot} />;

  return (
    <Desktop
      themeId={themeId}
      onTheme={changeTheme}
      onReboot={reboot}
      notice={notice}
      onCloseNotice={closeNotice}
      autoOpen={APPS.some((a) => a.id === abrir) ? (abrir as AppId) : undefined}
    />
  );
}
