"use client";

import type { CSSProperties, ReactNode } from "react";
import type { ThemeId } from "@/config/themes";
import { Controls, Progress, fmt, playerStatus } from "./PlayerParts";
import type { PlayerApi } from "./usePlayer";
import "./player-skins.css";

type Skin = (props: { p: PlayerApi }) => ReactNode;

const pctOf = (p: PlayerApi) => (p.dur ? Math.min(1, p.pos / p.dur) : 0);
const num = (n: number) => String(n + 1).padStart(2, "0");

// texto que corre no visor quando não cabe
function Marquee({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className={`sk-marquee ${className}`}>
      <span>
        <b>{text}</b>
        <b aria-hidden="true">{text}</b>
      </span>
    </div>
  );
}

function Status({ p }: { p: PlayerApi }) {
  return (
    <div className={`mp-status ${p.needsTap ? "is-tap" : ""}`} aria-live="polite">
      {playerStatus(p)}
    </div>
  );
}

/* ============ SYNTHWAVE: toca-fitas de carro com fita cassete ============ */
const CarStereo: Skin = ({ p }) => {
  const k = pctOf(p);
  const t = p.track;
  return (
    <div className={`sk sk-car ${p.playing ? "is-on" : ""}`} style={{ "--k": k } as CSSProperties}>
      <div className="car-top">
        <span className="car-brand">NIGHTDRIVE</span>
        <span className="car-model">AUTO-REVERSE · DOLBY NR</span>
      </div>

      <div className="car-vfd">
        <div className="car-band">
          <span>
            FM <b>{p.station.dial}</b>
          </span>
          <span className="car-st">ST</span>
          <span className="car-trk">TRK {num(p.index)}</span>
        </div>
        <Marquee className="car-mq" text={t ? `${t.title} — ${t.artist}` : "SEM SINAL"} />
        <div className="car-time">
          {fmt(p.pos)} <span>/ {fmt(p.dur)}</span>
        </div>
      </div>

      <div className="car-slot">
        <div className="tape">
          <div className="tape-label">
            <b>C-90</b> {p.station.name.toUpperCase()}
          </div>
          <div className="tape-win">
            <span className="reel reel-l" />
            <span className="reel reel-r" />
          </div>
        </div>
      </div>

      <Progress p={p} />
      <Controls p={p} labels={{ shuffle: "SHUF", next: "▶▶|" }} />
      <Status p={p} />
    </div>
  );
};

/* ============ VAPORWAVE: CD Player.exe estilo Windows 95 ============ */
const VaporCd: Skin = ({ p }) => {
  const t = p.track;
  return (
    <div className={`sk sk-vapor ${p.playing ? "is-on" : ""}`}>
      <div className="vp-title">
        <span className="vp-ico" />
        <span className="vp-name">CDプレーヤー.exe</span>
      </div>
      <div className="vp-body">
        <div className="vp-row">
          <div className="vp-tray">
            <span className="vp-cd" />
          </div>
          <div className="vp-lcd">
            <div className="vp-osd">
              <span className="vp-play">{p.playing ? "PLAY ▶" : "PAUSE ❚❚"}</span>
              <span>[{num(p.index)}]</span>
            </div>
            <div className="vp-clock">{fmt(p.pos)}</div>
            <div className="vp-st">ＲＡＤＩＯ ＶＡＰＯＲ {p.station.dial}</div>
          </div>
        </div>
        <Marquee className="vp-mq" text={t ? `${t.title} ／ ${t.artist}` : "ＮＯ ＤＩＳＣ"} />
        <Progress p={p} />
        <Controls p={p} />
        <Status p={p} />
      </div>
    </div>
  );
};

/* ============ FRUTIGER AERO: media player de vidro ============ */
const AeroGlass: Skin = ({ p }) => {
  const t = p.track;
  return (
    <div className={`sk sk-aero ${p.playing ? "is-on" : ""}`}>
      <div className="ae-screen">
        <span className="ae-sun" />
        <span className="ae-hill" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="ae-bub" style={{ "--i": i } as CSSProperties} />
        ))}
        <div className="ae-now">
          <div className="ae-st">
            {p.station.name} · {p.station.dial}
          </div>
          <div className="ae-title">{t?.title ?? "—"}</div>
          <div className="ae-artist">{t?.artist}</div>
        </div>
      </div>
      <Progress p={p} />
      <Controls p={p} />
      <Status p={p} />
    </div>
  );
};

/* ============ GEN X SOFT CLUB + VERÃO ELETRO: discman com CD de coletânea ============ */
const Discman: Skin = ({ p }) => {
  const t = p.track;
  return (
    <div className={`sk sk-disc ${p.playing ? "is-on" : ""}`}>
      <div className="dm-lid">
        <div className="dm-cd">
          <span className="dm-sun" />
          <span className="dm-spk dm-spk-a" />
          <span className="dm-spk dm-spk-b" />
          <span className="dm-name">
            ELETRO
            <br />
            VERÃO
            <small>2001 · VOL.1</small>
          </span>
          <span className="dm-hole" />
        </div>
        <span className="dm-gloss" />
        <span className="dm-led" title={p.playing ? "tocando" : "parado"} />
        <span className="dm-skip">ANTI-SKIP 45s</span>
      </div>
      <div className="dm-lcd">
        <div className="dm-row">
          <span>TRK {num(p.index)}</span>
          <span>{p.shuffle ? "RND" : "ALL"}</span>
          <span>{fmt(p.pos)}</span>
        </div>
        <Marquee className="dm-mq" text={t ? `${t.artist} - ${t.title}` : "NO DISC"} />
      </div>
      <Progress p={p} />
      <Controls p={p} />
      <Status p={p} />
    </div>
  );
};

export const SKINS: Record<ThemeId, Skin> = {
  synthwave: CarStereo,
  vaporwave: VaporCd,
  frutiger: AeroGlass,
  softclub: Discman,
};
