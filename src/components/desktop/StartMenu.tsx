import { APPS, type AppId } from "@/config/apps";
import AppIcon from "./AppIcon";
import { SYSTEM } from "@/config/system";

// Duas colunas (programas | atalhos do sistema) e rodapé com reiniciar.
// Nas estéticas de uma coluna só, as colunas ficam uma embaixo da outra.
const SIDE: AppId[] = ["config"];
const DESC: Record<AppId, string> = {
  jogos: "Memória, Truco e mais",
  config: "Temas, sons e widgets",
};

export default function StartMenu({
  onOpen,
  onReboot,
}: {
  onOpen: (id: AppId) => void;
  onReboot: () => void;
}) {
  const apps = APPS;
  const item = (a: (typeof apps)[number]) => (
    <button key={a.id} className="dk-menu-item" data-app={a.id} onClick={() => onOpen(a.id)}>
      <span className="dk-mini">
        <AppIcon id={a.id} size={16} />
      </span>
      <span className="dk-menu-lbl">
        {a.label}
        <small>{DESC[a.id]}</small>
      </span>
    </button>
  );
  return (
    <div className="os-window dk-menu" onClick={(e) => e.stopPropagation()}>
      <div className="dk-menu-head">
        <span className="dk-start-logo" />
        <span>
          {SYSTEM.name}
          <small>{SYSTEM.tagline}</small>
        </span>
      </div>
      <div className="dk-menu-cols">
        <div className="dk-menu-main">{apps.filter((a) => !SIDE.includes(a.id)).map(item)}</div>
        <div className="dk-menu-side">{apps.filter((a) => SIDE.includes(a.id)).map(item)}</div>
      </div>
      <div className="dk-menu-foot">
        <button className="dk-menu-item dk-menu-reboot" onClick={onReboot}>
          <span className="dk-mini">↻</span>
          Reiniciar
        </button>
      </div>
    </div>
  );
}
