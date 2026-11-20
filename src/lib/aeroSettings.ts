import { useSyncExternalStore } from "react";

// Parque 3D animado do Frutiger Aero: ligado por padrão (a versão nova é leve). Quem quiser
// a imagem parada do parque desliga nas configurações de Estéticas.
// (chaves novas: quem desligou ou travou com o parque antigo, que era pesado, ganha outra chance)
const KEY = "aero-parque-animado-v2";
const subs = new Set<() => void>();
let failed = false; // a placa de vídeo caiu nesta sessão: volta pra imagem parada

// proteção contra travamento em looping: antes de ligar o 3D a gente marca "tentando"; se o
// computador travar e a página abrir de novo com essa marca ainda lá, o 3D fica desligado
const TRY = "aero-parque-tentando-v2";
let checked = false;
function crashGuard() {
  if (checked) return;
  checked = true;
  try {
    if (localStorage.getItem(TRY) === "1") {
      localStorage.setItem(KEY, "0");
      localStorage.removeItem(TRY);
      failed = true;
    }
  } catch {}
}
// o parque avisa quando vai começar e quando já rodou alguns segundos sem problema
export function aeroStarting() {
  try {
    localStorage.setItem(TRY, "1");
  } catch {}
}
export function aeroStable() {
  try {
    localStorage.removeItem(TRY);
  } catch {}
}

export function getAeroAnimated() {
  crashGuard();
  if (failed) return false;
  try {
    return localStorage.getItem(KEY) !== "0";
  } catch {
    return true;
  }
}
export function setAeroAnimated(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {}
  if (on) failed = false;
  subs.forEach((f) => f());
}
export function aeroFailed() {
  failed = true;
  try {
    localStorage.setItem(KEY, "0");
  } catch {}
  subs.forEach((f) => f());
}
export function useAeroAnimated() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => {
        subs.delete(f);
      };
    },
    getAeroAnimated,
    () => false,
  );
}
