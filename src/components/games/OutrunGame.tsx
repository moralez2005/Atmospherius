"use client";

import { useEffect, useRef, useState } from "react";
import { drawNeonCar, MY_CAR, TRAFFIC } from "@/lib/neonCar";
import type { GameProps } from "./GameLauncher";

// Outrun Neon: estrada de 3 faixas na grade neon; troque de faixa para desviar
// dos carros. A velocidade sobe com o tempo. Pontos = distância percorrida.
const W = 520;
const H = 320;
const HZ = 120; // linha do horizonte
type Car = { lane: number; z: number; pal: number };

export default function OutrunGame({ onBack, best, onScore }: GameProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"ready" | "play" | "over">("ready");
  const [dist, setDist] = useState(0);
  const [record, setRecord] = useState(false);
  const g = useRef({ lane: 1, x: 1, speed: 0, dist: 0, cars: [] as Car[], spawn: 0 });

  function start() {
    g.current = { lane: 1, x: 1, speed: 1, dist: 0, cars: [], spawn: 1.2 };
    setDist(0);
    setRecord(false);
    setState("play");
  }

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const s = g.current;
      if (["ArrowLeft", "a"].includes(e.key)) {
        e.preventDefault();
        s.lane = Math.max(0, s.lane - 1);
      } else if (["ArrowRight", "d"].includes(e.key)) {
        e.preventDefault();
        s.lane = Math.min(2, s.lane + 1);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const c = ctx;
    let raf = 0;
    let last = performance.now();
    const K = H - HZ;
    // posição x de uma faixa (0 a 2, pode ser fracionada) a uma profundidade
    const laneX = (lane: number, y: number) => W / 2 + (lane - 1) * ((y - HZ) / K) * 170;

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = g.current;
      if (state === "play") {
        s.speed = Math.min(3.2, s.speed + dt * 0.05);
        s.dist += s.speed * dt * 60;
        s.x += (s.lane - s.x) * Math.min(1, dt * 12);
        s.spawn -= dt * s.speed;
        if (s.spawn <= 0) {
          s.spawn = 0.9 + Math.random() * 0.9;
          s.cars.push({ lane: Math.floor(Math.random() * 3), z: 1, pal: Math.floor(Math.random() * TRAFFIC.length) });
        }
        for (const car of s.cars) car.z -= dt * 0.55 * s.speed; // z: 1 (longe) → 0 (no carro)
        s.cars = s.cars.filter((car) => car.z > -0.1);
        // batida: carro bem perto e na mesma faixa
        if (s.cars.some((car) => car.z < 0.09 && car.z > 0 && Math.abs(car.lane - s.x) < 0.6)) {
          s.cars = []; // evita contar a batida duas vezes
          setState("over");
          setRecord(onScore(Math.floor(s.dist)));
        }
        setDist(Math.floor(s.dist));
      }

      // céu e sol
      const sky = c.createLinearGradient(0, 0, 0, HZ);
      sky.addColorStop(0, "#07062a");
      sky.addColorStop(1, "#c2338f");
      c.fillStyle = sky;
      c.fillRect(0, 0, W, HZ);
      const sun = c.createLinearGradient(0, HZ - 70, 0, HZ);
      sun.addColorStop(0, "#ffe55a");
      sun.addColorStop(1, "#ff8a3d");
      c.fillStyle = sun;
      c.beginPath();
      c.arc(W / 2, HZ, 60, Math.PI, 0);
      c.fill();
      c.fillStyle = "#c2338f";
      for (let i = 0; i < 5; i++) c.fillRect(W / 2 - 60, HZ - 30 + i * 6, 120, 1 + i * 0.6);
      // chão em grade
      c.fillStyle = "#1a0630";
      c.fillRect(0, HZ, W, K);
      c.strokeStyle = "rgba(255,61,240,0.6)";
      c.lineWidth = 1;
      c.beginPath();
      const off = (s.dist * 0.02) % 1;
      for (let k = 0; k < 18; k++) {
        const z = 0.5 + k - off;
        if (z <= 0.5) continue;
        const y = HZ + K / z;
        c.moveTo(0, y);
        c.lineTo(W, y);
      }
      for (let i = -10; i <= 10; i++) {
        c.moveTo(W / 2 + i * 70, H);
        c.lineTo(W / 2, HZ);
      }
      c.stroke();
      // pista
      c.fillStyle = "rgba(10,3,24,0.85)";
      c.beginPath();
      c.moveTo(W / 2 - 2, HZ);
      c.lineTo(W / 2 + 2, HZ);
      c.lineTo(laneX(2.5, H), H);
      c.lineTo(laneX(-0.5, H), H);
      c.fill();
      c.strokeStyle = "#5ff3ff";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(W / 2, HZ);
      c.lineTo(laneX(-0.5, H), H);
      c.moveTo(W / 2, HZ);
      c.lineTo(laneX(2.5, H), H);
      c.stroke();
      // faixas tracejadas
      c.fillStyle = "rgba(255,230,140,0.85)";
      for (let k = 0; k < 14; k++) {
        const z = 0.6 + k * 0.8 - ((s.dist * 0.03) % 0.8);
        const y1 = HZ + K / (z + 0.3);
        const y2 = HZ + K / z;
        if (y2 > H + 20) continue;
        for (const l of [0.5, 1.5]) {
          c.beginPath();
          c.moveTo(laneX(l, y1) - 1, y1);
          c.lineTo(laneX(l, y1) + 1, y1);
          c.lineTo(laneX(l, y2) + 2, y2);
          c.lineTo(laneX(l, y2) - 2, y2);
          c.fill();
        }
      }
      // outros carros (do mais longe para o mais perto): o mesmo modelo do seu, em outras cores
      const t = now / 1000;
      for (const car of [...s.cars].sort((a, b) => b.z - a.z)) {
        if (car.z <= 0) continue;
        const zz = 0.18 + car.z * 6;
        const y = HZ + K / zz;
        const cw = 150 / zz;
        drawNeonCar(c, laneX(car.lane, y), y, cw, { palette: TRAFFIC[car.pal], t, reflection: false });
      }
      // seu carro (com fogo no escapamento quando está bem rápido)
      drawNeonCar(c, laneX(s.x, H - 6), H - 6, 124, {
        palette: MY_CAR,
        t,
        reflection: false,
        tilt: (s.lane - s.x) * 0.08,
        flame: state === "play" && s.speed > 2.2,
      });
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [state, onScore]);

  const move = (d: number) => {
    const s = g.current;
    s.lane = Math.max(0, Math.min(2, s.lane + d));
  };

  return (
    <div className="gx">
      <div className="gx-bar">
        <span>Distância: {dist} m</span>
        <span>{best !== undefined ? `Recorde: ${best} m` : "Sem recorde"}</span>
      </div>
      <div className="gx-stage">
        <canvas ref={canvas} width={W} height={H} />
        {state !== "play" && (
          <div className="gx-over">
            {state === "ready" ? (
              <b>Desvie dos carros trocando de faixa</b>
            ) : (
              <>
                <b>Batida! {dist} m</b>
                {record && <span>Novo recorde! ★</span>}
              </>
            )}
            <button className="os-btn" onClick={start}>
              {state === "ready" ? "Acelerar" : "Correr de novo"}
            </button>
          </div>
        )}
      </div>
      <div className="gx-actions">
        <button className="os-btn" onClick={() => move(-1)}>
          ◀ Esquerda
        </button>
        <p className="gx-help">Setas ← → ou A / D</p>
        <button className="os-btn" onClick={() => move(1)}>
          Direita ▶
        </button>
      </div>
      <div className="gx-actions">
        <span />
        <button className="os-btn" onClick={onBack}>
          Voltar
        </button>
      </div>
    </div>
  );
}
