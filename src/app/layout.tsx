import type { Metadata } from "next";
import { Open_Sans, Orbitron, Quicksand, Rajdhani, VT323 } from "next/font/google";
import "./globals.css";
import { SYSTEM } from "@/config/system";

const pixel = VT323({ weight: "400", subsets: ["latin"], variable: "--f-pixel", display: "swap" });
const orb = Orbitron({ subsets: ["latin"], variable: "--f-orb", display: "swap" });
const raj = Rajdhani({ weight: ["500", "700"], subsets: ["latin"], variable: "--f-raj", display: "swap" });
const round = Quicksand({ subsets: ["latin"], variable: "--f-round", display: "swap" });
const sans = Open_Sans({ subsets: ["latin"], variable: "--f-sans", display: "swap" });

export const metadata: Metadata = {
  title: SYSTEM.name,
  description: `${SYSTEM.tagline}: um sistema operacional fictício com estéticas dos anos 80, 90 e 2000.`,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${pixel.variable} ${orb.variable} ${raj.variable} ${round.variable} ${sans.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}