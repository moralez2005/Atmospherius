import type { CSSProperties } from "react";
import type { APPS } from "@/config/apps";
import AppIcon from "./AppIcon";

type App = (typeof APPS)[number];

export default function DesktopIcon({
  app,
  index,
  selected,
  onSelect,
  onOpen,
}: {
  app: App;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}) {
  return (
    <button
      className="dk-icon"
      data-app={app.id}
      aria-pressed={selected}
      style={{ "--i": index } as CSSProperties}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
        onOpen(); // um clique abre
      }}
    >
      <span className="dk-icon-box">
        {app.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={app.image} alt="" />
        ) : (
          <AppIcon id={app.id} size={36} />
        )}
      </span>
      <span className="dk-icon-label">{app.label}</span>
    </button>
  );
}