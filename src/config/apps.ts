export type AppId = "jogos" | "config";

// Só o necessário no desktop.
// Para usar um ícone seu, preencha `image`, ex.: "/assets/icons/jogos.png"
export const APPS: { id: AppId; label: string; image?: string }[] = [
  { id: "jogos", label: "Jogos" },
  { id: "config", label: "Estéticas" },
];
