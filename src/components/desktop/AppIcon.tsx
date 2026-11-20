import type { ReactNode } from "react";
import type { AppId } from "@/config/apps";

const ICONS: Record<AppId, ReactNode> = {
  jogos: (
    <>
      <path
        d="M9 10h14a6 6 0 0 1 5.8 4.6l1.1 5.4a3.6 3.6 0 0 1-6.4 2.8L21 19H11l-2.5 3.8A3.6 3.6 0 0 1 2.1 20l1.1-5.4A6 6 0 0 1 9 10z"
        fill="#fff"
      />
      <path d="M11 13.2v5M8.5 15.7h5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="21" cy="14.8" r="1.5" fill="currentColor" />
      <circle cx="24" cy="17.4" r="1.5" fill="currentColor" />
    </>
  ),
  config: (
    <>
      <path d="M5 9h22M5 16h22M5 23h22" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="11" cy="9" r="3.4" fill="#fff" stroke="currentColor" strokeWidth="2" />
      <circle cx="21" cy="16" r="3.4" fill="#fff" stroke="currentColor" strokeWidth="2" />
      <circle cx="13" cy="23" r="3.4" fill="#fff" stroke="currentColor" strokeWidth="2" />
    </>
  ),
};

export default function AppIcon({ id, size = 32 }: { id: AppId; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      style={{ color: "var(--glyph, rgba(35,22,95,.82))" }}
    >
      {ICONS[id]}
    </svg>
  );
}