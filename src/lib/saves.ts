// Recordes dos jogos guardados no próprio navegador.
const KEY = "estetica-saves";

export type Saves = Partial<Record<string, number>>;

export function readSaves(): Saves {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Saves;
  } catch {
    return {};
  }
}

// grava se for recorde; lower = true quando menos é melhor (ex.: tempo, tentativas)
export function saveRecord(game: string, score: number, lower = false) {
  if (!lower && score <= 0) return false; // placar zerado não vira recorde
  const all = readSaves();
  const old = all[game];
  const better = old === undefined || (lower ? score < old : score > old);
  if (!better) return false;
  all[game] = score;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
  return true;
}
