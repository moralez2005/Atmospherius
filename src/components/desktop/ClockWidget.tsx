"use client";

import { useEffect, useState } from "react";

const hello = (h: number) =>
  h < 5 ? "Boa madrugada" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";

export default function ClockWidget() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="os-window cw">
      <div className="os-titlebar">
        <span>Hoje</span>
      </div>
      <div className="os-body">
        <div className="cw-time">
          {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="cw-date">
          {now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <div className="cw-hi">
          {hello(now.getHours())}!
        </div>
      </div>
    </div>
  );
}