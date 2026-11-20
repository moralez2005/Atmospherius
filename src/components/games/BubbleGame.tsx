"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { sfx } from "@/lib/uiSound";
import type { GameProps } from "./GameLauncher";

// Estoura-Bolhas: 45 segundos para estourar o máximo de bolhas.
// Bolha comum = 1 ponto, bolha com peixe = 3, bolha dourada = 5. Errar o clique quebra o combo.
const W = 520;
const H = 320;
const TIME = 45;
type Bubble = { id: number; x: number; y: number; r: number; vy: number; kind: "plain" | "fish" | "gold"; wob: number };
type Pop = { x: number; y: number; t: number; text: string };

export default function BubbleGame({ onBack, best, onScore }: GameProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"ready" | "play" | "over">("ready");
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(TIME);
  const [combo, setCombo] = useState(0);
  const [record, setRecord] = useState(false);
  const g = useRef({ bubbles: [] as Bubble[], pops: [] as Pop[], seq: 0, score: 0, combo: 0, t: 0, spawn: 0 });
  const fish = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = "/assets/fx/peixe-palhaco.png";
    fish.current = img;
  }, []);

  function start() {
    g.current = { bubbles: [], pops: [], seq: 0, score: 0, combo: 0, t: 0, spawn: 0 };
    setScore(0);
    setCombo(0);
    setLeft(TIME);
    setRecord(false);
    setState("play");
  }

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const c = ctx;
    let raf = 0;
    let last = performance.now();
    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = g.current;
      if (state === "play") {
        s.t += dt;
        const remain = Math.max(0, TIME - s.t);
        setLeft(Math.ceil(remain));
        if (remain <= 0 && s.t < 1e9) {
          s.t = 1e9; // fim de jogo só uma vez
          setState("over");
          setRecord(onScore(s.score));
        }
        s.spawn -= dt;
        if (s.spawn <= 0) {
          s.spawn = Math.max(0.18, 0.55 - s.t * 0.008);
          const roll = Math.random();
          const kind = roll < 0.07 ? "gold" : roll < 0.3 ? "fish" : "plain";
          const r = kind === "plain" ? 16 + Math.random() * 18 : 26;
          s.bubbles.push({ id: ++s.seq, x: 30 + Math.random() * (W - 60), y: H + r, r, vy: 40 + Math.random() * 50 + s.t * 1.5, kind, wob: Math.random() * 6 });
        }
        for (const b of s.bubbles) b.y -= b.vy * dt;
        s.bubbles = s.bubbles.filter((b) => b.y > -b.r);
      }
      for (const p of s.pops) p.t += dt;
      s.pops = s.pops.filter((p) => p.t < 0.6);

      // céu, sol e grama
      const sky = c.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#2f8fe6");
      sky.addColorStop(0.7, "#bfe6ff");
      sky.addColorStop(1, "#e9f7ff");
      c.fillStyle = sky;
      c.fillRect(0, 0, W, H);
      const sun = c.createRadialGradient(80, 40, 0, 80, 40, 90);
      sun.addColorStop(0, "rgba(255,255,255,0.95)");
      sun.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = sun;
      c.fillRect(0, 0, W, H);
      const grass = c.createLinearGradient(0, H - 50, 0, H);
      grass.addColorStop(0, "#8fd14f");
      grass.addColorStop(1, "#3f8f22");
      c.fillStyle = grass;
      c.beginPath();
      c.moveTo(0, H - 30);
      c.quadraticCurveTo(W * 0.4, H - 70, W, H - 36);
      c.lineTo(W, H);
      c.lineTo(0, H);
      c.fill();

      for (const b of s.bubbles) {
        const x = b.x + Math.sin(now / 400 + b.wob) * 6;
        if (b.kind === "fish" && fish.current?.complete) {
          c.drawImage(fish.current, x - b.r * 0.7, b.y - b.r * 0.45, b.r * 1.4, b.r * 0.9);
        }
        const body = c.createRadialGradient(x - b.r * 0.35, b.y - b.r * 0.35, 1, x, b.y, b.r);
        if (b.kind === "gold") {
          body.addColorStop(0, "rgba(255,255,220,0.95)");
          body.addColorStop(0.6, "rgba(255,210,63,0.55)");
          body.addColorStop(1, "rgba(255,160,40,0.8)");
        } else {
          body.addColorStop(0, "rgba(255,255,255,0.7)");
          body.addColorStop(0.7, "rgba(200,235,255,0.12)");
          body.addColorStop(1, "rgba(120,200,255,0.55)");
        }
        c.fillStyle = body;
        c.beginPath();
        c.arc(x, b.y, b.r, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = "rgba(255,255,255,0.8)";
        c.lineWidth = 1.2;
        c.stroke();
        c.fillStyle = "rgba(255,255,255,0.9)";
        c.beginPath();
        c.ellipse(x - b.r * 0.4, b.y - b.r * 0.45, b.r * 0.22, b.r * 0.12, -0.6, 0, Math.PI * 2);
        c.fill();
      }
      c.font = "700 16px sans-serif";
      c.textAlign = "center";
      for (const p of s.pops) {
        c.fillStyle = `rgba(20,90,160,${1 - p.t / 0.6})`;
        c.fillText(p.text, p.x, p.y - p.t * 40);
      }
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [state, onScore]);

  function click(e: PointerEvent<HTMLCanvasElement>) {
    if (state !== "play") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    const s = g.current;
    const hit = [...s.bubbles].reverse().find((b) => Math.hypot(b.x - x, b.y - y) < b.r + 4);
    if (!hit) {
      s.combo = 0;
      setCombo(0);
      return;
    }
    s.bubbles = s.bubbles.filter((b) => b !== hit);
    s.combo++;
    const base = hit.kind === "gold" ? 5 : hit.kind === "fish" ? 3 : 1;
    const pts = base * (s.combo >= 10 ? 3 : s.combo >= 5 ? 2 : 1);
    s.score += pts;
    s.pops.push({ x: hit.x, y: hit.y, t: 0, text: `+${pts}` });
    setScore(s.score);
    setCombo(s.combo);
    sfx("pop");
  }

  return (
    <div className="gx">
      <div className="gx-bar">
        <span>Pontos: {score}</span>
        <span>Combo: x{combo >= 10 ? 3 : combo >= 5 ? 2 : 1}</span>
        <span>Tempo: {left}s</span>
        <span>{best !== undefined ? `Recorde: ${best}` : "Sem recorde"}</span>
      </div>
      <div className="gx-stage">
        <canvas ref={canvas} width={W} height={H} onPointerDown={click} style={{ cursor: "crosshair", borderRadius: 8 }} />
        {state !== "play" && (
          <div className="gx-over">
            {state === "ready" ? (
              <>
                <b>Estoure as bolhas!</b>
                <span>comum +1 · com peixe +3 · dourada +5 · combo dobra os pontos</span>
              </>
            ) : (
              <>
                <b>Tempo! {score} pontos</b>
                {record && <span>Novo recorde! ★</span>}
              </>
            )}
            <button className="os-btn" onClick={start}>
              {state === "ready" ? "Começar" : "Jogar de novo"}
            </button>
          </div>
        )}
      </div>
      <div className="gx-actions">
        <p className="gx-help">Clique nas bolhas. Errar o clique zera o combo.</p>
        <button className="os-btn" onClick={onBack}>
          Voltar
        </button>
      </div>
    </div>
  );
}
