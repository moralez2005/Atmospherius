"use client";

import { useEffect, useSyncExternalStore } from "react";
import { DEFAULT_VOLUME, STATIONS, type Track } from "@/config/tracks";
import { radioSound, setRadioBed, tuneSound } from "@/lib/radioFx";
import { DEFAULT_THEME, type ThemeId } from "@/config/themes";

/* ---------------- API de iframe do YouTube (só o que usamos) ---------------- */
type YTPlayer = {
  loadVideoById(o: { videoId: string; startSeconds?: number }): void;
  cueVideoById(o: { videoId: string; startSeconds?: number }): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setVolume(v: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  destroy(): void;
};
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      width: string | number;
      height: string | number;
      playerVars: Record<string, number | string>;
      events: {
        onReady: () => void;
        onStateChange: (e: { data: number }) => void;
        onError: (e: { data: number }) => void;
      };
    }
  ) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const ENDED = 0;
const PLAYING = 1;
const PAUSED = 2;
const BUFFERING = 3;

let apiPromise: Promise<YTNamespace> | null = null;
function loadApi(): Promise<YTNamespace> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (window.YT) resolve(window.YT);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    s.onerror = () => {
      apiPromise = null;
      reject(new Error("YouTube indisponível"));
    };
    document.head.appendChild(s);
  });
  return apiPromise;
}

/* ---------------- helpers ---------------- */
const VOL_KEY = "estetica-volume";
const SHUFFLE_KEY = "estetica-aleatorio";

function readNumber(key: string, fallback: number) {
  try {
    const v = Number(localStorage.getItem(key));
    return localStorage.getItem(key) !== null && Number.isFinite(v) ? v : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
function shuffled(n: number, first?: number) {
  const a = range(n);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  if (first !== undefined) a.splice(0, 0, ...a.splice(a.indexOf(first), 1));
  return a;
}

/* ---------------- estado exposto para a interface ---------------- */
export type RadioState = {
  theme: ThemeId;
  ready: boolean; // player do YouTube carregado
  failed: boolean; // sem internet ou YouTube bloqueado
  needsTap: boolean; // navegador bloqueou o autoplay: espera um clique
  playing: boolean;
  loading: boolean;
  shuffle: boolean;
  volume: number;
  index: number; // posição da faixa na lista da estética
  track: Track | null;
  pos: number;
  dur: number;
};

/* ---------------- motor: um rádio por página ---------------- */
// Fica fora do React para que trocar de tema, abrir janelas ou o StrictMode
// (que monta tudo duas vezes no dev) não reiniciem a música.
class Radio {
  private player: YTPlayer | null = null;
  private host: HTMLElement | null = null;
  private listeners = new Set<() => void>();
  private order: number[] = range(STATIONS[DEFAULT_THEME].tracks.length);
  private cursor = 0;
  private want = true; // tocar como fundo assim que possível
  private errors = 0;
  private poll: ReturnType<typeof setInterval> | undefined;
  private watchdog: ReturnType<typeof setTimeout> | undefined;
  private alive = 0; // invalida callbacks de players antigos
  private started = false; // já sorteou a primeira faixa nesta página

  state: RadioState = {
    theme: DEFAULT_THEME,
    ready: false,
    failed: false,
    needsTap: false,
    playing: false,
    loading: false,
    shuffle: false,
    volume: DEFAULT_VOLUME,
    index: 0,
    track: STATIONS[DEFAULT_THEME].tracks[0],
    pos: 0,
    dur: 0,
  };
  readonly serverState = this.state;

  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };
  get = () => this.state;
  getServer = () => this.serverState;

  private set(patch: Partial<RadioState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }
  // a próxima faixa da fila (o locutor anuncia antes de tocar)
  peekNext = () => {
    const n = this.tracks.length;
    return this.tracks[this.order[(this.cursor + 1) % n] ?? 0];
  };
  // abaixa a música enquanto o locutor fala (sem mexer no volume salvo)
  duck = (on: boolean) => {
    this.player?.setVolume(on ? Math.round(this.state.volume * 0.35) : this.state.volume);
  };

  private get tracks() {
    return STATIONS[this.state.theme].tracks;
  }
  private current() {
    const index = this.order[this.cursor] ?? 0;
    return { index, track: this.tracks[index] };
  }

  /* ----- ciclo de vida ----- */
  mount(host: HTMLElement) {
    this.host = host;
    const id = ++this.alive;
    const volume = Math.min(100, Math.max(0, readNumber(VOL_KEY, DEFAULT_VOLUME)));
    const shuffle = readNumber(SHUFFLE_KEY, 0) === 1;
    this.state = { ...this.state, volume, shuffle };
    // primeira vez na página: começa numa faixa sorteada (não sempre na mesma)
    if (!this.started) {
      this.started = true;
      this.startRandom();
    } else {
      this.set({ volume, shuffle });
    }

    loadApi()
      .then((YT) => {
        if (id !== this.alive || !this.host) return;
        const el = document.createElement("div");
        this.host.replaceChildren(el);
        this.player = new YT.Player(el, {
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin, // recomendado pela API do YouTube
          },
          events: {
            onReady: () => {
              if (id !== this.alive) return;
              this.player?.setVolume(this.state.volume);
              this.set({ ready: true, failed: false });
              this.load(this.want);
            },
            onStateChange: (e) => id === this.alive && this.onState(e.data),
            onError: () => id === this.alive && this.onError(),
          },
        });
      })
      .catch(() => {
        if (id === this.alive) this.set({ failed: true });
      });
  }

  unmount() {
    this.alive++;
    clearInterval(this.poll);
    clearTimeout(this.watchdog);
    this.player?.destroy();
    this.player = null;
    this.host?.replaceChildren();
    this.host = null;
    setRadioBed(null, 0);
    this.set({ ready: false, playing: false, loading: false });
  }

  /* ----- estação (uma por estética) ----- */
  setStation(theme: ThemeId) {
    if (theme === this.state.theme) return;
    if (this.state.ready) tuneSound(theme); // chiado de sintonia trocando de estação
    this.state = { ...this.state, theme }; // as faixas passam a ser as da estação nova
    this.startRandom();
    if (this.player && this.state.ready) this.load(this.want);
  }

  // Sorteia a faixa de início da estação atual. Sem aleatório, segue a ordem da
  // playlist a partir da faixa sorteada; com aleatório, a ordem toda é embaralhada.
  private startRandom() {
    const n = this.tracks.length;
    this.order = this.state.shuffle ? shuffled(n) : range(n);
    this.cursor = this.state.shuffle ? 0 : Math.floor(Math.random() * n);
    this.set({ pos: 0, dur: 0, ...this.current() });
  }

  /* ----- carregar faixa (sempre do começo) ----- */
  private load(autoplay: boolean) {
    const p = this.player;
    if (!p) return;
    const { index, track } = this.current();
    this.set({ index, track, pos: 0, dur: 0, loading: autoplay });
    if (autoplay) {
      p.loadVideoById({ videoId: track.id, startSeconds: 0 });
      this.armWatchdog();
    } else {
      p.cueVideoById({ videoId: track.id, startSeconds: 0 });
    }
  }

  // Navegadores só deixam tocar som depois de um clique na página.
  // Se o play não "pegar", espera o próximo clique/tecla em qualquer lugar.
  private armWatchdog() {
    clearTimeout(this.watchdog);
    this.watchdog = setTimeout(() => {
      const s = this.player?.getPlayerState();
      if (!this.want || s === PLAYING || s === BUFFERING) return;
      this.set({ needsTap: true, loading: false });
      const resume = () => {
        window.removeEventListener("pointerdown", resume, true);
        window.removeEventListener("keydown", resume, true);
        if (this.want && this.player) {
          this.player.playVideo();
          this.set({ needsTap: false });
        }
      };
      window.addEventListener("pointerdown", resume, true);
      window.addEventListener("keydown", resume, true);
    }, 2500);
  }

  private onState(s: number) {
    if (s === PLAYING) {
      this.errors = 0;
      this.set({ playing: true, loading: false, needsTap: false });
      setRadioBed(this.state.theme, this.state.volume);
      this.startPoll();
    } else if (s === PAUSED) {
      setRadioBed(null, 0);
      this.set({ playing: false, loading: false });
      this.tick();
    } else if (s === BUFFERING) {
      this.set({ loading: true });
    } else if (s === ENDED) {
      this.set({ playing: false });
      this.step(1, true);
    }
  }

  // vídeo removido ou que não deixa tocar fora do YouTube: pula
  private onError() {
    this.errors++;
    if (this.errors >= this.tracks.length) {
      this.set({ failed: true, playing: false, loading: false });
      return;
    }
    this.step(1, this.want);
  }

  private startPoll() {
    clearInterval(this.poll);
    this.tick();
    this.poll = setInterval(() => {
      if (!this.state.playing) return clearInterval(this.poll);
      this.tick();
    }, 500);
  }
  private tick() {
    const p = this.player;
    if (!p) return;
    const pos = p.getCurrentTime() || 0;
    const dur = p.getDuration() || 0;
    if (Math.floor(pos) !== Math.floor(this.state.pos) || Math.floor(dur) !== Math.floor(this.state.dur)) {
      this.set({ pos, dur });
    }
  }

  private step(delta: number, autoplay: boolean) {
    const n = this.tracks.length;
    this.cursor = (this.cursor + delta + n) % n;
    // fim da lista no modo aleatório: embaralha de novo
    if (this.cursor === 0 && delta > 0 && this.state.shuffle) this.order = shuffled(n);
    this.load(autoplay);
  }

  private reorder(shuffle: boolean, keepCurrent = true) {
    const n = this.tracks.length;
    const now = this.order[this.cursor] ?? 0;
    this.order = shuffle ? shuffled(n, keepCurrent ? now : undefined) : range(n);
    this.cursor = keepCurrent ? this.order.indexOf(now) : 0;
  }

  /* ----- controles ----- */
  toggle = () => {
    const p = this.player;
    if (!p || !this.state.ready) return;
    if (this.state.playing || this.state.loading) {
      this.want = false;
      radioSound(this.state.theme, "pause");
      clearTimeout(this.watchdog);
      p.pauseVideo();
      this.set({ loading: false, needsTap: false });
    } else {
      this.want = true;
      radioSound(this.state.theme, "play");
      p.playVideo();
      this.set({ needsTap: false });
    }
  };

  next = () => {
    radioSound(this.state.theme, "next");
    this.step(1, this.want);
  };

  seek = (frac: number) => {
    if (!this.player || !this.state.dur) return;
    const pos = frac * this.state.dur;
    this.player.seekTo(pos, true);
    this.set({ pos });
  };

  setVolume = (v: number) => {
    const volume = Math.round(Math.min(100, Math.max(0, v)));
    this.player?.setVolume(volume);
    save(VOL_KEY, String(volume));
    if (this.state.playing) setRadioBed(this.state.theme, volume);
    this.set({ volume });
  };

  toggleShuffle = () => {
    const shuffle = !this.state.shuffle;
    this.reorder(shuffle);
    save(SHUFFLE_KEY, shuffle ? "1" : "0");
    this.set({ shuffle });
  };
}

const radio = new Radio();

// Ref de callback da div onde o iframe do YouTube vive: liga o player quando a
// div aparece e desliga quando ela sai da tela (React 19 aceita o retorno de limpeza).
export function attachRadio(el: HTMLDivElement | null) {
  if (!el) return;
  radio.mount(el);
  return () => radio.unmount();
}

export function usePlayer(themeId: ThemeId) {
  const s = useSyncExternalStore(radio.subscribe, radio.get, radio.getServer);

  // troca a estação quando a estética muda (o player só toca depois de pronto)
  useEffect(() => {
    radio.setStation(themeId);
  }, [themeId]);

  return {
    ...s,
    station: STATIONS[s.theme],
    toggle: radio.toggle,
    next: radio.next,
    seek: radio.seek,
    setVolume: radio.setVolume,
    toggleShuffle: radio.toggleShuffle,
    peekNext: radio.peekNext,
    duck: radio.duck,
  };
}

export type PlayerApi = ReturnType<typeof usePlayer>;
