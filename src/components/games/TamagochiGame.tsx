"use client";

import { useEffect, useRef, useState } from "react";
import { sfx } from "@/lib/uiSound";
import type { GameProps } from "./GameLauncher";
import "./tamagochi.css";

// Tamagochi ＡＥＳＴＨＥＴＩＣ: um bichinho virtual num chaveiro em forma de ovo.
// Ele nasce, come, brinca, faz cocô, dorme, fica doente e cresce até virar adulto
// (o tipo de adulto depende de como foi cuidado). O bichinho fica salvo no navegador,
// separado por conta, e continua vivendo (mais devagar) enquanto você está fora.
// Recorde: a maior idade, em dias. 1 dia do bichinho = 4 minutos de verdade.

const DAY = 240; // segundos por "dia"
const HATCH = 12; // segundos até o ovo chocar
const OFFLINE_MAX = 2 * 60 * 60; // conta no máximo 2 h de ausência

type Stage = "ovo" | "bebe" | "crianca" | "jovem" | "adulto";
type Pet = {
  v: 1;
  name: string;
  age: number; // segundos vividos
  fome: number; // 100 = de barriga cheia
  alegria: number;
  energia: number;
  poops: number;
  nextPoop: number;
  sick: number; // doses de remédio que faltam
  peso: number;
  sleeping: boolean;
  care: number; // média de cuidado (decide o adulto)
  candy: number; // doce demais deixa doente
  neglect: number; // tempo largado com fome ou sujeira
  savedAt: number;
};

const STAGE_NAME: Record<Stage, string> = { ovo: "ovo", bebe: "bebê", crianca: "criança", jovem: "jovem", adulto: "adulto" };

function stageOf(p: Pet): Stage {
  if (p.age < HATCH) return "ovo";
  if (p.age < DAY) return "bebe";
  if (p.age < DAY * 3) return "crianca";
  if (p.age < DAY * 5) return "jovem";
  return "adulto";
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));

function newPet(name: string): Pet {
  return {
    v: 1, name: name.trim().slice(0, 12) || "Pixel", age: 0, fome: 80, alegria: 80, energia: 90,
    poops: 0, nextPoop: 150, sick: 0, peso: 5, sleeping: false, care: 80, candy: 0, neglect: 0, savedAt: Date.now(),
  };
}

// passa o tempo (dt em segundos); `slow` = enquanto estava fora (gasta a metade)
function tick(p: Pet, dt: number, slow = false) {
  const was = stageOf(p);
  p.age += dt;
  if (was === "ovo") return;
  const k = slow ? 0.5 : 1;
  if (p.sleeping) {
    p.energia = clamp(p.energia + dt / 3);
    p.fome = clamp(p.fome - (dt / 30) * k);
    if (p.energia >= 100) p.sleeping = false; // acorda sozinho descansado
  } else {
    p.energia = clamp(p.energia - (dt / 20) * k);
    p.fome = clamp(p.fome - (dt / 12) * k);
    p.alegria = clamp(p.alegria - (dt / (p.sick ? 7 : 15)) * k);
    p.nextPoop -= dt;
    if (p.nextPoop <= 0) {
      p.poops = Math.min(3, p.poops + 1);
      p.nextPoop = 110 + Math.random() * 120;
    }
    if (p.energia <= 0) {
      p.sleeping = true; // apagou de cansaço
      p.alegria = clamp(p.alegria - 10);
    }
  }
  p.candy = Math.max(0, p.candy - dt / 60);
  if (p.fome <= 0 || p.poops >= 2) p.neglect += dt;
  else p.neglect = Math.max(0, p.neglect - dt);
  if (!slow && !p.sick && (p.neglect > 60 || p.candy >= 4)) {
    p.sick = 2;
    p.neglect = 0;
    p.candy = 0;
  }
  const now = (p.fome + p.alegria + (100 - p.poops * 30) + (p.sick ? 0 : 100)) / 4;
  p.care += (now - p.care) * Math.min(1, dt / 600);
}

function needs(p: Pet) {
  if (stageOf(p) === "ovo" || p.sleeping) return false;
  return p.fome < 25 || p.alegria < 25 || p.poops > 0 || p.sick > 0;
}

const KEY = () => "estetica-tama";
function load(): Pet | null {
  try {
    const p = JSON.parse(localStorage.getItem(KEY()) ?? "null") as Pet | null;
    if (!p || p.v !== 1) return null;
    // o tempo que passou longe (com limite), em passos de 5 s
    let away = Math.min(OFFLINE_MAX, Math.max(0, (Date.now() - p.savedAt) / 1000));
    while (away > 0) {
      const d = Math.min(5, away);
      tick(p, d, true);
      away -= d;
    }
    return p;
  } catch {
    return null;
  }
}
function save(p: Pet | null) {
  try {
    if (!p) localStorage.removeItem(KEY());
    else localStorage.setItem(KEY(), JSON.stringify({ ...p, savedAt: Date.now() }));
  } catch {}
}

/* ---------------- pixel art (# = pixel aceso) ---------------- */
const S = (rows: string) => rows.trim().split("\n").map((r) => r.trim());
const SPR = {
  ovo: S(`
......####......
....##....##....
...#........#...
..#..##......#..
..#..##...#..#..
.#.........#..#.
.#..#.........#.
.#........##..#.
.#..##....##..#.
.#..##........#.
..#..........#..
..#...#......#..
...##......##...
.....######.....`),
  bebe: [
    S(`
................
................
................
.....######.....
....#......#....
...#........#...
...#.#....#.#...
...#........#...
...#..#..#..#...
...#...##...#...
....#......#....
.....######.....`),
    S(`
................
................
................
................
....########....
...#........#...
..#..#....#..#..
..#..........#..
..#...#..#...#..
..#....##....#..
...#........#...
....########....`),
  ],
  crianca: [
    S(`
....#......#....
....##....##....
....#.####.#....
...#........#...
..#..##..##..#..
..#..##..##..#..
..#..........#..
..#....##....#..
..#...#..#...#..
...#........#...
....#......#....
...#.#....#.#...
...##......##...`),
    S(`
................
....#......#....
....##....##....
....#.####.#....
...#........#...
..#..##..##..#..
..#..##..##..#..
..#..........#..
..#...####...#..
...#........#...
....#......#....
....##....##....
................`),
  ],
  jovem: [
    S(`
.......##.......
......#..#......
.....######.....
....#......#....
...#........#...
...#.##..##.#...
...#........#...
...#...##...#...
...#........#...
....#......#....
...##########...
..#.#......#.#..
....#......#....
....#..##..#....
....##....##....`),
    S(`
......##........
.....#..#.......
.....######.....
....#......#....
...#........#...
...#.##..##.#...
...#........#...
...#..####..#...
...#........#...
....#......#....
...##########...
....#......#.#..
..#.#......#....
....#..##..#....
....##....##....`),
  ],
  // adulto bem cuidado: busto de estátua clássica de óculos escuros (o ícone do vaporwave)
  estatua: [
    S(`
.....######.....
....#.#.#..##...
...#.#.#.#...#..
...#.........#..
...###########..
...#.###.###.#..
...#.........#..
...#....##...#..
....#.......#...
.....#.###.#....
......#...#.....
....##.....##...
...#.........#..
..#...........#.
..#############.`),
    S(`
.....######.....
....#.#.#..##...
...#.#.#.#...#..
...#.........#..
...###########..
...#.###.###.#..
...#.........#..
...#...####..#..
....#.......#...
.....#.....#....
......#...#.....
....##.....##...
...#.........#..
..#...........#.
..#############.`),
  ],
  // adulto meio largado: fantasminha com defeito de vídeo
  glitch: [
    S(`
................
.....######.....
....#......#....
...#.##..##.#...
...#.##..##.#...
...#........#...
...#..####..#...
...#........#...
...#........#...
...#.#.##.#.#...
...##.#..#.##...
.#............#.
....#......#....`),
    S(`
................
......######....
.....#......#...
....#.##..##.#..
...#..##..##.#..
...#........#...
...#..####..#...
..#.........#...
...#........#...
...#.#.##.#.#...
...##.#..#.##...
#.....#.........
.......#....#...`),
  ],
  poop: S(`
..#....
.#.#...
.###...
#...#..
#####..
#.#.#.#
#######`),
  heart: S(`
.##.##.
#######
#######
.#####.
..###..
...#...`),
  rice: S(`
...##...
..####..
.#....#.
#......#
#.####.#
#.####.#
.######.`),
  candy: S(`
#..##..#
.######.
.##.###.
.######.
#..##..#`),
  germ: S(`
#.#.#
.###.
##.##
.###.
#.#.#`),
  z: S(`
####
..#.
.#..
####`),
  arrow: S(`
...#...
..##...
.######
#######
.######
..##...
...#...`),
  note: S(`
..###
..#.#
..#.#
###.#
###..`),
};

function stamp(c: CanvasRenderingContext2D, spr: string[], x: number, y: number, px: number, flip = false) {
  spr.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      if (row[i] !== "#") continue;
      const xx = flip ? x + row.length - 1 - i : x + i;
      c.fillRect(xx * px + 1, (y + j) * px + 1, px - 1, px - 1);
    }
  });
}

type Anim = { kind: "eat" | "candy" | "clean" | "happy" | "no" | "med" | "hatch" | "sad"; t0: number };
type MiniGame = { round: number; wins: number; pick: -1 | 0 | 1 | null; dir: -1 | 1; at: number };

const ICONS = [
  { id: "comer", label: "Comer", glyph: "🍙" },
  { id: "brincar", label: "Brincar", glyph: "🎮" },
  { id: "limpar", label: "Limpar", glyph: "🛁" },
  { id: "remedio", label: "Remédio", glyph: "💊" },
  { id: "luz", label: "Dormir / acordar", glyph: "💡" },
] as const;
type IconId = (typeof ICONS)[number]["id"];

const COLS = 32;
const ROWS = 16;
const PX = 8;

export default function TamagochiGame({ onBack, best, onScore }: GameProps) {
  const [pet, setPet] = useState<Pet | null | undefined>(undefined); // undefined = carregando
  const petRef = useRef<Pet | null>(null);
  const [, force] = useState(0);
  const [sel, setSel] = useState(0);
  const [menu, setMenu] = useState<"food" | null>(null);
  const [game, setGame] = useState<MiniGame | null>(null);
  const gameRef = useRef<MiniGame | null>(null);
  const anim = useRef<Anim | null>(null);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [record, setRecord] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scoreRef = useRef(onScore);
  useEffect(() => {
    scoreRef.current = onScore;
  }, [onScore]);

  useEffect(() => {
    const p = load();
    petRef.current = p;
    setPet(p);
  }, []);
  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  // relógio do bichinho: 1 passo por segundo, salva sempre
  useEffect(() => {
    if (!pet) return;
    let lastDay = Math.floor(pet.age / DAY);
    let wasNeedy = needs(pet);
    let wasStage = stageOf(pet);
    const id = setInterval(() => {
      const p = petRef.current;
      if (!p) return;
      tick(p, 1);
      const st = stageOf(p);
      if (st !== wasStage) {
        anim.current = { kind: "hatch", t0: performance.now() };
        sfx("startup");
        setMsg(st === "bebe" ? `${p.name} nasceu!` : `${p.name} cresceu! Agora é ${STAGE_NAME[st]}.`);
        wasStage = st;
      }
      const day = Math.floor(p.age / DAY);
      if (day > lastDay) {
        lastDay = day;
        if (scoreRef.current(day)) setRecord(true);
      }
      const needy = needs(p);
      if (needy && !wasNeedy) sfx("notify"); // o "bip" de chamada
      wasNeedy = needy;
      save(p);
      force((n) => n + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [pet, email]);

  // tela de LCD
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const c = ctx;
    let raf = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const p = petRef.current;
      const t = now / 1000;
      const dark = !!p?.sleeping;
      c.fillStyle = dark ? "#2a2148" : "#d6f3ea";
      c.fillRect(0, 0, COLS * PX, ROWS * PX);
      // pixels apagados do LCD
      c.fillStyle = dark ? "rgba(255,255,255,0.03)" : "rgba(58,26,94,0.06)";
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) c.fillRect(x * PX + 1, y * PX + 1, PX - 1, PX - 1);
      if (!p) return;
      c.fillStyle = dark ? "#b9a8ff" : "#3a1a5e";
      const st = stageOf(p);
      const a = anim.current && now - anim.current.t0 < 2200 ? anim.current : null;
      const frame = Math.floor(t * 2) % 2;
      const g = gameRef.current;

      if (st === "ovo") {
        const wob = Math.sin(t * (p.age > HATCH - 4 ? 18 : 6)) > 0.3 ? 1 : 0;
        stamp(c, SPR.ovo, 9 + wob, 1, PX);
        return;
      }
      const sprites =
        st === "adulto" ? (p.care >= 55 ? SPR.estatua : SPR.glitch) : st === "jovem" ? SPR.jovem : st === "crianca" ? SPR.crianca : SPR.bebe;
      const spr = sprites[frame] ?? sprites[0];
      const top = ROWS - spr.length;

      // mini-jogo: o bichinho vai virar pra esquerda ou pra direita
      if (g) {
        const reveal = g.pick !== null;
        const look = reveal ? g.dir : 0;
        stamp(c, spr, 8 + look * 2, top, PX, look < 0);
        if (!reveal) {
          stamp(c, SPR.arrow, 1, 5, PX, true);
          stamp(c, SPR.arrow, 24, 5, PX);
          if (Math.floor(t * 3) % 2) {
            c.fillRect(15 * PX + 1, 0 * PX + 1, PX - 1, PX - 1);
            c.fillRect(16 * PX + 1, 0 * PX + 1, PX - 1, PX - 1);
          }
        } else {
          const ok = g.pick === g.dir;
          if (ok) stamp(c, SPR.heart, g.dir > 0 ? 24 : 1, 2, PX);
          else stamp(c, SPR.germ, g.dir > 0 ? 2 : 25, 3, PX);
        }
        return;
      }

      // anda de um lado pro outro (parado quando dorme, come ou está doente)
      // (com cocô no canto, ele anda num espaço menor)
      const maxX = p.poops === 0 ? 14 : p.poops < 3 ? 9 : 2;
      let x = Math.min(8, maxX);
      if (!p.sleeping && !a) x = Math.round(maxX / 2 + (Math.sin(t * 0.9) * maxX) / 2);
      let y = top;
      if (a?.kind === "happy" || a?.kind === "hatch") y = top - (Math.floor(t * 6) % 2);
      const shake = a?.kind === "no" ? (Math.floor(t * 10) % 2 ? 1 : -1) : 0;
      stamp(c, spr, x + shake, y, PX, !p.sleeping && Math.cos(t * 0.9) < 0);

      if (a) {
        const k = (now - a.t0) / 2200;
        if (a.kind === "eat" || a.kind === "candy") {
          const food = a.kind === "eat" ? SPR.rice : SPR.candy;
          const bites = Math.floor(k * 4);
          const cut = food.map((r) => r.slice(0, Math.max(0, r.length - bites * 2)));
          stamp(c, cut, 1, ROWS - food.length - 1, PX);
        } else if (a.kind === "clean") {
          const wx = Math.floor(k * COLS);
          for (let yy = 0; yy < ROWS; yy++) c.fillRect(wx * PX + 1, yy * PX + 1, PX - 1, PX - 1);
        } else if (a.kind === "happy" || a.kind === "hatch") {
          stamp(c, SPR.heart, 1, 1 + (Math.floor(t * 4) % 2), PX);
          stamp(c, SPR.note, 26, 2 + (Math.floor(t * 4 + 1) % 2), PX);
        } else if (a.kind === "med") {
          stamp(c, SPR.heart, 26, 2, PX);
        } else if (a.kind === "sad" || a.kind === "no") {
          c.fillRect(27 * PX + 1, 2 * PX + 1, PX - 1, PX * 3 - 1);
          c.fillRect(27 * PX + 1, 6 * PX + 1, PX - 1, PX - 1);
        }
      }
      // cocôs no canto direito (a não ser durante a limpeza)
      if (a?.kind !== "clean") {
        const spots = [[25, 9], [25, 1], [18, 9]];
        for (let i = 0; i < p.poops; i++) stamp(c, SPR.poop, spots[i][0], spots[i][1], PX);
      }
      if (p.sick) stamp(c, SPR.germ, x > 8 ? x - 6 : x + 16, 1 + frame, PX);
      if (p.sleeping) {
        const zz = Math.floor(t * 1.5) % 3;
        for (let i = 0; i <= zz; i++) stamp(c, SPR.z, 22 + i * 3, 6 - i * 3 + 1, PX);
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [pet]);

  function play(kind: Anim["kind"], text: string) {
    anim.current = { kind, t0: performance.now() };
    setMsg(text);
    sfx(kind === "no" || kind === "sad" ? "min" : "pop");
  }

  function update(fn: (p: Pet) => void) {
    const p = petRef.current;
    if (!p) return;
    fn(p);
    save(p);
    force((n) => n + 1);
  }

  function act(id: IconId) {
    const p = petRef.current;
    if (!p || game) return;
    setSel(ICONS.findIndex((i) => i.id === id));
    if (stageOf(p) === "ovo") return play("no", "Calma, o ovo ainda está chocando...");
    if (p.sleeping && id !== "luz") return play("no", `${p.name} está dormindo. Zzz...`);
    if (id === "comer") return setMenu(menu ? null : "food");
    setMenu(null);
    if (id === "brincar") {
      if (p.energia < 10) return play("no", `${p.name} está cansado demais pra brincar.`);
      setMsg("Pra que lado ele vai olhar? Escolha ◀ ou ▶");
      return setGame({ round: 1, wins: 0, pick: null, dir: Math.random() < 0.5 ? -1 : 1, at: 0 });
    }
    if (id === "limpar") {
      if (!p.poops) return play("no", "Já está tudo limpinho!");
      update((q) => (q.poops = 0));
      return play("clean", "Tudo limpo! ✨");
    }
    if (id === "remedio") {
      if (!p.sick) return play("no", `${p.name} não está doente.`);
      update((q) => (q.sick -= 1));
      return play("med", p.sick ? "Mais uma dose e ele sara." : `${p.name} sarou!`);
    }
    if (id === "luz") {
      if (p.sleeping) {
        update((q) => {
          q.sleeping = false;
          q.alegria = clamp(q.alegria - 5);
        });
        return play("sad", "Acordou meio emburrado...");
      }
      if (p.energia > 80) return play("no", `${p.name} ainda está sem sono.`);
      update((q) => (q.sleeping = true));
      return setMsg("Luz apagada. Boa noite! 🌙");
    }
  }

  function eat(kind: "eat" | "candy") {
    setMenu(null);
    const p = petRef.current;
    if (!p) return;
    if (kind === "eat") {
      if (p.fome >= 95) return play("no", "Está de barriga cheia!");
      update((q) => {
        q.fome = clamp(q.fome + 25);
        q.peso += 1;
      });
      return play("eat", "Nham nham! 🍙");
    }
    update((q) => {
      q.alegria = clamp(q.alegria + 15);
      q.fome = clamp(q.fome + 5);
      q.peso += 2;
      q.candy += 1;
    });
    play("candy", p.candy >= 3 ? "Doce demais faz mal, hein..." : "Docinho! 🍬");
  }

  function guess(side: -1 | 1) {
    const g = gameRef.current;
    if (!g || g.pick !== null) return;
    const ok = side === g.dir;
    const next = { ...g, pick: side, wins: g.wins + (ok ? 1 : 0) } as MiniGame;
    setGame(next);
    sfx(ok ? "pop" : "min");
    setMsg(ok ? `Acertou! (${next.wins}/${g.round})` : `Errou... (${next.wins}/${g.round})`);
    setTimeout(() => {
      if (next.round >= 5) {
        setGame(null);
        const won = next.wins >= 3;
        update((q) => {
          q.alegria = clamp(q.alegria + (won ? 30 : 10));
          q.energia = clamp(q.energia - 8);
          q.peso = Math.max(1, q.peso - 1);
        });
        play(won ? "happy" : "sad", won ? `Você ganhou ${next.wins} de 5! ${petRef.current?.name} adorou!` : `Só ${next.wins} de 5... mas foi divertido.`);
      } else {
        setGame({ round: next.round + 1, wins: next.wins, pick: null, dir: Math.random() < 0.5 ? -1 : 1, at: 0 });
        setMsg(`Rodada ${next.round + 1} de 5: ◀ ou ▶?`);
      }
    }, 1100);
  }

  // botões físicos: A = próximo ícone, B = confirmar, C = cancelar
  function btn(b: "A" | "B" | "C") {
    if (game) return b === "A" ? guess(-1) : b === "C" ? guess(1) : undefined;
    if (b === "A") return setSel((s) => (s + 1) % ICONS.length);
    if (b === "B") return menu ? eat("eat") : act(ICONS[sel].id);
    setMenu(null);
    setMsg("");
  }

  function hatchNew() {
    const p = newPet(name);
    petRef.current = p;
    save(p);
    setPet(p);
    setRecord(false);
    setMsg("Um ovo! Espere ele chocar...");
    sfx("pop");
  }

  function reset() {
    if (!window.confirm("Trocar por um ovo novo? O bichinho atual vai embora.")) return;
    save(email, null);
    petRef.current = null;
    setPet(null);
    setGame(null);
    setMenu(null);
    setMsg("");
  }

  const p = petRef.current;
  const st = p ? stageOf(p) : null;
  const days = p ? Math.floor(p.age / DAY) : 0;
  const hearts = (v: number) => "♥♥♥♥".slice(0, Math.ceil(v / 25)).padEnd(4, "♡");
  const call = p ? needs(p) : false;

  return (
    <div className="gx tm">
      <div className="tm-row">
        <div className="tm-egg">
          <span className="tm-chain" aria-hidden="true" />
          <span className="tm-brand">ＡＥＳＴＨＥＴＩＣ</span>
          <div className="tm-icons">
            {ICONS.map((ic, i) => (
              <button
                key={ic.id}
                className={`tm-ico ${i === sel ? "is-sel" : ""}`}
                title={ic.label}
                aria-label={ic.label}
                onClick={() => act(ic.id)}
                disabled={!p}
              >
                {ic.glyph}
              </button>
            ))}
            <span className={`tm-ico tm-call ${call ? "is-on" : ""}`} title="Chamando você!" aria-label={call ? "Precisa de atenção" : undefined}>
              !
            </span>
          </div>
          <div className="tm-screen">
            <canvas ref={canvas} width={COLS * PX} height={ROWS * PX} />
            {pet === null && (
              <div className="tm-new">
                <b>Um ovo apareceu!</b>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dê um nome" maxLength={12} />
                <button className="os-btn" onClick={hatchNew}>
                  Chocar 🥚
                </button>
              </div>
            )}
          </div>
          <div className="tm-btns">
            {(["A", "B", "C"] as const).map((b) => (
              <button key={b} onClick={() => btn(b)} aria-label={game ? (b === "A" ? "Esquerda" : b === "C" ? "Direita" : "B") : b === "A" ? "Próximo ícone" : b === "B" ? "Confirmar" : "Cancelar"}>
                <span>{b}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="tm-side">
          {p && st ? (
            <>
              <div className="tm-name">
                {p.name} <small>{STAGE_NAME[st]}{st === "adulto" ? (p.care >= 55 ? " · estátua vapor" : " · glitch") : ""}</small>
              </div>
              <ul className="tm-stats">
                <li><span>Fome</span><b>{hearts(p.fome)}</b></li>
                <li><span>Alegria</span><b>{hearts(p.alegria)}</b></li>
                <li><span>Energia</span><b>{hearts(p.energia)}</b></li>
                <li><span>Limpeza</span><b>{hearts(100 - p.poops * 34)}</b></li>
                <li><span>Idade</span><b>{days} {days === 1 ? "dia" : "dias"}</b></li>
                <li><span>Peso</span><b>{p.peso} g</b></li>
              </ul>
              {p.sick > 0 && <p className="tm-warn">Está doente! Dê remédio 💊</p>}
              {menu === "food" && (
                <div className="tm-menu">
                  <button className="os-btn" onClick={() => eat("eat")}>🍙 Refeição</button>
                  <button className="os-btn" onClick={() => eat("candy")}>🍬 Doce</button>
                </div>
              )}
              {game && (
                <div className="tm-menu">
                  <button className="os-btn" onClick={() => guess(-1)} disabled={game.pick !== null}>◀ Esquerda</button>
                  <button className="os-btn" onClick={() => guess(1)} disabled={game.pick !== null}>Direita ▶</button>
                </div>
              )}
            </>
          ) : (
            <p className="tm-msg">Cuide de um bichinho virtual: dê comida, brinque, limpe e coloque pra dormir.</p>
          )}
          <p className="tm-msg" aria-live="polite">
            {record ? "Novo recorde de idade! ★ " : ""}
            {msg || (best !== undefined ? `Recorde: ${best} ${best === 1 ? "dia" : "dias"} de vida` : "1 dia do bichinho = 4 minutos")}
          </p>
        </div>
      </div>
      <div className="gx-actions">
        {p ? (
          <button className="os-btn" onClick={reset}>
            Ovo novo
          </button>
        ) : (
          <span />
        )}
        <button className="os-btn" onClick={onBack}>
          Voltar
        </button>
      </div>
    </div>
  );
}
