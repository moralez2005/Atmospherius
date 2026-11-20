"use client";

import { useState } from "react";
import { THEMES, type ThemeId } from "@/config/themes";
import { getUiSound, setUiSound } from "@/lib/uiSound";
import { setAeroAnimated, useAeroAnimated } from "@/lib/aeroSettings";
import { useWidgets } from "./useWidgets";
import "./theme-selector.css";

export default function ThemeSelector({
  themeId,
  onTheme,
}: {
  themeId: ThemeId;
  onTheme: (id: ThemeId) => void;
}) {
  const [sfxOn, setSfxOn] = useState(getUiSound);
  const aeroOn = useAeroAnimated();
  const widgets = useWidgets();
  const moved = Object.keys(widgets.pos).length > 0;

  return (
    <div>
      <p className="ts-hint">Escolha a sua estética (a rádio muda junto):</p>
      <div className="ts-grid" role="radiogroup" aria-label="Tema">
        {(Object.keys(THEMES) as ThemeId[]).map((id) => (
          <button
            key={id}
            role="radio"
            aria-checked={id === themeId}
            className="ts-card"
            onClick={() => onTheme(id)}
          >
            <span
              data-theme={id}
              className="ts-preview"
              style={{ backgroundImage: `url(${THEMES[id].thumb}), var(--sky)` }}
            >
              <span className="ts-mini" />
              <span className="ts-chip" />
            </span>
            <span>{THEMES[id].name}</span>
          </button>
        ))}
      </div>
      <label className="ts-sfx">
        <input
          type="checkbox"
          checked={sfxOn}
          onChange={(e) => {
            setSfxOn(e.target.checked);
            setUiSound(e.target.checked);
          }}
        />
        Sons do sistema
      </label>
      {themeId === "frutiger" && (
        <label className="ts-sfx" title="Desligado, fica a imagem parada do parque.">
          <input type="checkbox" checked={aeroOn} onChange={(e) => setAeroAnimated(e.target.checked)} />
          Parque 3D animado
        </label>
      )}

      <p className="ts-hint ts-sub">Widgets (arraste para mover):</p>
      <div className="ts-widgets">
        <label className="ts-sfx">
          <input
            type="checkbox"
            checked={!widgets.radioMin}
            onChange={(e) => widgets.setRadioMin(!e.target.checked)}
          />
          Rádio na área de trabalho
        </label>
        <label className="ts-sfx">
          <input
            type="checkbox"
            checked={!widgets.clockHidden}
            onChange={(e) => widgets.setClockHidden(!e.target.checked)}
          />
          Relógio
        </label>
        <button
          className="os-btn ts-reset"
          disabled={!moved && !widgets.radioMin && !widgets.clockHidden}
          onClick={widgets.reset}
        >
          Reorganizar widgets
        </button>
      </div>
    </div>
  );
}