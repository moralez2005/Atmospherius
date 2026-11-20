"use client";

import { useEffect, useRef, useState } from "react";
import type { GameProps } from "./GameLauncher";
import "./snake.css";

// Cobrinha na telinha de LCD de um celular dos anos 2000 (desenho próprio).
// Setas/WASD ou o teclado do celular (2, 4, 6, 8). Espaço pausa.
const COLS = 20;
const ROWS = 13;
const CELL = 14;
type P = { x: number; y: number };
type Dir = "up" | "down" | "left" | "right";
const STEP: Record<Dir, P> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };

function food(snake: P[]): P {
  for (;;) {
    const f = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    if (!snake.some((s) => s.x === f.x && s.y === f.y)) return f;
  }
}

export default function SnakeGame({ onBack, best, onScore }: GameProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [state, setState] = useState<"ready" | "play" | "pause" | "over">("ready");
  const [record, setRecord] = useState(false);
  const game = useRef({ snake: [] as P[], dir: "right" as Dir, next: "right" as Dir, food: { x: 0, y: 0 }, score: 0 });

  function reset() {
    const snake = [
      { x: 6, y: 6 },
      { x: 5, y: 6 },
      { x: 4, y: 6 },
    ];
    game.current = { snake, dir: "right", next: "right", food: food(snake), score: 0 };
    setScore(0);
    setRecord(false);
    setState("play");
  }

  function turn(d: Dir) {
    const g = game.current;
    if (d !== OPPOSITE[g.dir]) g.next = d;
  }

  // teclado
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: "up", w: "up", "2": "up",
        ArrowDown: "down", s: "down", "8": "down",
        ArrowLeft: "left", a: "left", "4": "left",
        ArrowRight: "right", d: "right", "6": "right",
      };
      if (map[e.key]) {
        e.preventDefault();
        const g = game.current;
        if (map[e.key] !== OPPOSITE[g.dir]) g.next = map[e.key];
      } else if (e.key === " ") {
        e.preventDefault();
        setState((s) => (s === "play" ? "pause" : s === "pause" ? "play" : s));
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  // desenho + passo do jogo
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    function draw() {
      const g = game.current;
      ctx!.fillStyle = "#9db86a";
      ctx!.fillRect(0, 0, COLS * CELL, ROWS * CELL);
      // "pixels" apagados do LCD
      ctx!.fillStyle = "rgba(60,80,30,0.08)";
      for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) ctx!.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
      ctx!.fillStyle = "#1f2a10";
      g.snake.forEach((s, i) => {
        const pad = i === 0 ? 1 : 2;
        ctx!.fillRect(s.x * CELL + pad, s.y * CELL + pad, CELL - pad * 2, CELL - pad * 2);
      });
      // comida piscando
      if (Math.floor(performance.now() / 300) % 2) {
        const f = g.food;
        ctx!.fillRect(f.x * CELL + 4, f.y * CELL + 1, CELL - 8, CELL - 2);
        ctx!.fillRect(f.x * CELL + 1, f.y * CELL + 4, CELL - 2, CELL - 8);
      }
    }
    let raf = 0;
    let last = 0;
    function loop(now: number) {
      raf = requestAnimationFrame(loop);
      const g = game.current;
      const speed = Math.max(70, 160 - g.score * 4); // vai acelerando
      if (state === "play" && now - last > speed) {
        last = now;
        g.dir = g.next;
        const head = { x: g.snake[0].x + STEP[g.dir].x, y: g.snake[0].y + STEP[g.dir].y };
        const hit =
          head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS || g.snake.some((s) => s.x === head.x && s.y === head.y);
        if (hit) {
          g.snake = [...g.snake]; // mantém o desenho
          last = Infinity; // não processa outro passo até reiniciar
          setState("over");
          setRecord(onScore(g.score));
        } else {
          g.snake.unshift(head);
          if (head.x === g.food.x && head.y === g.food.y) {
            g.score++;
            setScore(g.score);
            g.food = food(g.snake);
          } else g.snake.pop();
        }
      }
      draw();
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [state, onScore]);

  const pad = (label: string, d: Dir) => (
    <button className="sn-key" onClick={() => (state === "play" ? turn(d) : reset())}>
      {label}
    </button>
  );

  return (
    <div className="gx">
      <div className="sn-phone">
        <div className="sn-screen">
          <div className="sn-status">
            <span>▂▄▆█</span>
            <span>COBRINHA</span>
            <span>{String(score).padStart(4, "0")}</span>
          </div>
          <div className="gx-stage">
            <canvas ref={canvas} width={COLS * CELL} height={ROWS * CELL} />
            {state !== "play" && (
              <div className="sn-over">
                {state === "ready" && <b>Aperte Iniciar</b>}
                {state === "pause" && <b>Pausado</b>}
                {state === "over" && (
                  <>
                    <b>Fim de jogo! {score} pts</b>
                    {record && <span>Novo recorde! ★</span>}
                  </>
                )}
              </div>
            )}
          </div>
          <div className="sn-soft">
            <span>{best !== undefined ? `Recorde ${best}` : "Sem recorde"}</span>
            <span>Espaço: pausa</span>
          </div>
        </div>
        <div className="sn-pad">
          <span />
          {pad("2 ▲", "up")}
          <span />
          {pad("4 ◀", "left")}
          <button className="sn-key sn-ok" onClick={() => (state === "play" ? setState("pause") : state === "pause" ? setState("play") : reset())}>
            {state === "play" ? "5 ❚❚" : "5 ▶"}
          </button>
          {pad("6 ▶", "right")}
          <span />
          {pad("8 ▼", "down")}
          <span />
        </div>
      </div>
      <div className="gx-actions">
        <button className="os-btn" onClick={reset}>
          {state === "ready" ? "Iniciar" : "Jogar de novo"}
        </button>
        <button className="os-btn" onClick={onBack}>
          Voltar
        </button>
      </div>
    </div>
  );
}
