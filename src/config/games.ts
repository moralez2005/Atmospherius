import type { ThemeId } from "@/config/themes";
import type { GameId } from "@/lib/types";

// theme: o jogo só roda naquela estética (sem theme = roda em todas)
export const GAMES: { id: GameId; name: string; desc: string; icon: string; theme?: ThemeId }[] = [
  { id: "memoria", name: "Jogo da Memória", desc: "Encontre todos os pares.", icon: "★" },
  { id: "truco", name: "Truco", desc: "Partida contra o computador.", icon: "♠" },
  { id: "cobrinha", name: "Cobrinha", desc: "No celular dos anos 2000.", icon: "✆", theme: "softclub" },
  { id: "outrun", name: "Outrun Neon", desc: "Desvie dos carros na grade neon.", icon: "🏁", theme: "synthwave" },
  { id: "bolhas", name: "Estoura-Bolhas", desc: "45 segundos de bolhas e peixes.", icon: "◎", theme: "frutiger" },
  { id: "tamagochi", name: "Tamagochi", desc: "Cuide do seu bichinho virtual.", icon: "♡", theme: "vaporwave" },
];
