import type { ReactNode } from "react";
import type { Notice } from "@/config/messages";
import "./dialog.css";

export default function OsDialog({ notice, actions }: { notice: Notice; actions: ReactNode }) {
  const erro = notice.kind === "erro";
  return (
    <div className="os-window dlg" role="alertdialog" aria-modal="true" aria-label={notice.title}>
      <div className="os-titlebar">
        <span>{erro ? "Erro do sistema" : "Aviso do sistema"}</span>
      </div>
      <div className="os-body">
        <div className="dlg-row">
          <div className={`dlg-icon ${erro ? "is-erro" : ""}`}>{erro ? "!" : "i"}</div>
          <div>
            <div className="dlg-title">{notice.title}</div>
            <div className="dlg-text">{notice.text}</div>
          </div>
        </div>
        <div className="dlg-actions">{actions}</div>
      </div>
    </div>
  );
}