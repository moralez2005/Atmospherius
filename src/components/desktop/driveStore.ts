import { useSyncExternalStore } from "react";

// Estado do "entrar no carro" do Synthwave, fora do React para o canvas ler a cada quadro.
let driving = false;
const listeners = new Set<() => void>();

// onde o carro está na tela (atualizado pelo canvas do fundo a cada quadro)
export const carBox = { x: 0, y: 0, w: 0, h: 0 };

export const isDriving = () => driving;

export function setDriving(v: boolean) {
  if (driving === v) return;
  driving = v;
  if (!v) {
    driveInput.view = "front";
    driveInput.lever = 0;
    driveInput.gasKey = 0;
    driveInput.brakeKey = 0;
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useDriving() {
  return useSyncExternalStore(subscribe, isDriving, () => false);
}

// para onde a pessoa está olhando: para-brisa, janela do lado, cabeça pra fora do teto solar
// ou o próprio rosto no retrovisor
export type DriveView = "front" | "window" | "roof" | "mirror";

export function setView(v: DriveView) {
  driveInput.view = driveInput.view === v ? "front" : v;
  listeners.forEach((l) => l());
}

export function useView() {
  return useSyncExternalStore(subscribe, () => driveInput.view, () => "front" as DriveView);
}

// comandos de quem está dirigindo (teclado, câmbio e botões do painel)
// e a telemetria que o canvas devolve (velocidade, giro, marcha) para o som e a tela
export const driveInput = {
  steer: 0,
  high: false,
  view: "front" as DriveView,
  lever: 0, // câmbio: 0 = solto; puxado pra trás até 1 = acelera; empurrado pra frente até -1 = freia
  gasKey: 0, // W / seta pra cima
  brakeKey: 0, // S / seta pra baixo
  // telemetria
  speed: 0, // 0..~3 (x100 = km/h)
  rpm: 0, // 0..1
  gear: 1,
};

export const throttle = () => Math.max(driveInput.gasKey, Math.max(0, driveInput.lever));
export const braking = () => Math.max(driveInput.brakeKey, Math.max(0, -driveInput.lever));
