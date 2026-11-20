export type ThemeId = "vaporwave" | "synthwave" | "frutiger" | "softclub";

// thumb = miniatura da janela Estéticas, tirada do fundo de verdade (o fundo de quase todas é desenhado em código).
// crop = fração da altura (embaixo) que é faixa preta no PNG e deve ser cortada.
// Se refizer a imagem sem a faixa, coloque 0.
export const THEMES: Record<
  ThemeId,
  { name: string; wallpaper: string; thumb: string; placeholder: boolean; crop: number }
> = {
  vaporwave: { name: "Vaporwave", wallpaper: "/assets/wallpapers/vaporwave.png", thumb: "/assets/wallpapers/thumbs/vaporwave.jpg", placeholder: false, crop: 0.072 },
  synthwave: { name: "Synthwave", wallpaper: "/assets/wallpapers/synthwave.png", thumb: "/assets/wallpapers/thumbs/synthwave.jpg", placeholder: false, crop: 0.089 },
  frutiger: { name: "Frutiger Aero", wallpaper: "/assets/wallpapers/frutiger-parque.jpg", thumb: "/assets/wallpapers/thumbs/frutiger.jpg", placeholder: false, crop: 0 },
  softclub: { name: "Gen X Soft Club", wallpaper: "/assets/wallpapers/softclub.png", thumb: "/assets/wallpapers/thumbs/softclub.jpg", placeholder: false, crop: 0 },
};

export const DEFAULT_THEME: ThemeId = "vaporwave";