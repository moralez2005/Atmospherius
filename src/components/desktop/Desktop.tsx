"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import OsDialog from "@/components/OsDialog";
import { APPS, type AppId } from "@/config/apps";
import type { Notice } from "@/config/messages";
import { THEMES, type ThemeId } from "@/config/themes";
import { sfx } from "@/lib/uiSound";
import AppContent from "./AppContent";
import AppGlyph from "./AppGlyph";
import ClockWidget from "./ClockWidget";
import DesktopIcon from "./DesktopIcon";
import MusicPlayer from "./MusicPlayer";
import StartMenu from "./StartMenu";
import Taskbar from "./Taskbar";
import ThemeFX from "./ThemeFX";
import Window from "./Window";
import { attachRadio, usePlayer } from "./usePlayer";
import { useWidgets } from "./useWidgets";
import Widget from "./Widget";
import { useWindows } from "./useWindows";
import "./desktop.css";
import Wallpaper from "./Wallpaper";

type Props = {
  themeId: ThemeId;
  onTheme: (id: ThemeId) => void;
  onReboot: () => void;
  notice: Notice | null;
  onCloseNotice: () => void;
  autoOpen?: AppId;
};

type Toast = { id: number; title: string; text: string };
let toastSeq = 0;

const WIDTH: Partial<Record<AppId, number>> = { config: 460, jogos: 560 };

export default function Desktop({ themeId, onTheme, onReboot, notice, onCloseNotice, autoOpen }: Props) {
  const [selected, setSelected] = useState<AppId | null>(null);
  const [menu, setMenu] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const w = useWindows(autoOpen);
  const player = usePlayer(themeId);
  const widgets = useWidgets();

  const theme = THEMES[themeId];
  const label = (id: AppId) => APPS.find((a) => a.id === id)!.label;

  const notify = useCallback((title: string, text: string) => {
    const id = ++toastSeq;
    setToasts((t) => [...t.slice(-2), { id, title, text }]);
    sfx("notify");
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  // música: avisa quando uma faixa nova começa a tocar
  const lastTrack = useRef("");
  useEffect(() => {
    const t = player.track;
    if (player.playing && t && lastTrack.current !== t.id) {
      lastTrack.current = t.id;
      notify(`Tocando agora · ${player.station.name}`, `${t.title} — ${t.artist}`);
    }
  }, [player.playing, player.track, player.station, notify]);

  const openApp = (id: AppId) => {
    sfx("open");
    w.open(id);
    setMenu(false);
  };
  const minimizeRadio = () => {
    sfx("min");
    widgets.setRadioMin(true);
    notify("Rádio minimizada", "A música continua. Clique no equalizador da barra para abrir.");
  };
  const radioWidget = !widgets.radioMin && (
    <Widget key="radio" pos={widgets.pos.radio} onDrop={(p) => widgets.setPos("radio", p)}>
      <MusicPlayer p={player} themeId={themeId} onMinimize={minimizeRadio} />
    </Widget>
  );
  const clockWidget = !widgets.clockHidden && (
    <Widget key="clock" pos={widgets.pos.clock} onDrop={(p) => widgets.setPos("clock", p)}>
      <div className="wg">
        <ClockWidget />
        <div className="wg-ctl">
          <button
            className="wg-btn"
            aria-label="Esconder o relógio"
            title="Esconder (volta em Estéticas)"
            onClick={() => widgets.setClockHidden(true)}
          >
            ×
          </button>
        </div>
      </div>
    </Widget>
  );
  const changeTheme = (id: ThemeId) => {
    onTheme(id);
    notify("Tema alterado", THEMES[id].name);
  };

  return (
    <main
      data-theme={themeId}
      className={`os-desktop h-screen w-screen ${theme.placeholder ? "os-fx" : ""}`}
      onClick={() => {
        setSelected(null);
        setMenu(false);
      }}
    >
      <Wallpaper themeId={themeId} playing={player.playing} />
      <ThemeFX themeId={themeId} playing={player.playing} />

      <div className="dk-icons">
        {APPS.map((a, i) => (
          <DesktopIcon
            key={a.id}
            app={a}
            index={i}
            selected={selected === a.id}
            onSelect={() => setSelected(a.id)}
            onOpen={() => openApp(a.id)}
          />
        ))}
      </div>

      {/* iframe da rádio: fica sempre montado, mesmo com o player minimizado */}
      <div ref={attachRadio} className="mp-yt" aria-hidden="true" />

      {/* widgets: sem posição salva ficam na coluna da direita; arrastados, ficam soltos */}
      <div className="dk-side">
        {!widgets.pos.radio && radioWidget}
        {!widgets.pos.clock && clockWidget}
      </div>
      {widgets.pos.radio && radioWidget}
      {widgets.pos.clock && clockWidget}

      {w.wins.map((s) => (
        <Window
          key={s.id}
          title={label(s.id)}
          x={s.x}
          y={s.y}
          z={10 + w.order.indexOf(s.id)}
          width={WIDTH[s.id]}
          focused={w.focusedId === s.id}
          minimized={s.minimized}
          onFocus={() => w.focus(s.id)}
          onClose={() => {
            sfx("close");
            w.close(s.id);
          }}
          onMinimize={() => {
            sfx("min");
            w.minimize(s.id);
          }}
          onMove={(x, y) => w.move(s.id, x, y)}
        >
          <AppContent
            id={s.id}
            themeId={themeId}
            onTheme={changeTheme}
          />
        </Window>
      ))}

      {menu && <StartMenu onOpen={openApp} onReboot={onReboot} />}

      <div className="dk-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="os-window dk-toast">
            <span className="dk-toast-ico">
              <AppGlyph d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 11v6 M12 7.5h.01" size={22} />
            </span>
            <span>
              <b>{t.title}</b>
              {t.text}
            </span>
          </div>
        ))}
      </div>

      {notice && (
        <div className="dlg-overlay" onClick={(e) => e.stopPropagation()}>
          <OsDialog
            notice={notice}
            actions={
              <button className="os-btn" autoFocus onClick={onCloseNotice}>
                OK
              </button>
            }
          />
        </div>
      )}

      <Taskbar
        menuOpen={menu}
        onToggleMenu={() => setMenu((m) => !m)}
        tasks={w.wins.map((s) => ({
          id: s.id,
          label: label(s.id),
          minimized: s.minimized,
          focused: w.focusedId === s.id,
        }))}
        onTask={w.toggle}
        playing={player.playing}
        radioMin={widgets.radioMin}
        onRadio={() => widgets.setRadioMin(!widgets.radioMin)}
        trackLabel={player.track ? `${player.track.title} — ${player.track.artist}` : player.station.name}
      />
    </main>
  );
}