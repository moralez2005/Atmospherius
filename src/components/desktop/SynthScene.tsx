"use client";

import { useEffect, useRef } from "react";
import { drawNeonCar, MY_CAR, TRAFFIC, type CarPalette } from "@/lib/neonCar";
import { createCity, drawRain, drawSideStreet, drawSkyline, drawStreet, flushLate } from "@/lib/neoCity";
import { bikeSound, rideUpdate, skidSound } from "@/lib/radioFx";
import { braking, carBox, driveInput, isDriving, throttle, type DriveView } from "./driveStore";

// Cena synthwave desenhada em canvas: céu estrelado, nuvens de neon, sol listrado,
// montanhas aramadas rolando, chão de grade andando e um carro dirigindo pro horizonte.
// Com música tocando, o carro acelera. Com `cockpit`, a mesma estrada é vista de
// dentro do carro: quem dirige acelera (câmbio puxado pra trás ou W), freia, troca
// de marcha sozinho, ultrapassa outros carros e pode olhar pela janela ou pôr a
// cabeça pra fora do teto solar para sentir o vento.

type Ridge = { x: number[]; h: number[]; mid: number[]; width: number };

// aleatório determinístico (a paisagem é sempre a mesma)
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function makeRidge(seed: number, points: number, peak: number, base: number, bigPeakAt?: number): Ridge {
  const r = rng(seed);
  const x: number[] = [];
  const h: number[] = [];
  const mid: number[] = [];
  for (let i = 0; i < points; i++) {
    x.push(i / points);
    let v = base + r() * (peak - base);
    if (bigPeakAt !== undefined) {
      const d = Math.abs(i / points - bigPeakAt);
      v = Math.max(v, peak * 1.9 * Math.max(0, 1 - d * 9)); // o pico grande do meio
    }
    h.push(v);
    mid.push(0.25 + r() * 0.45);
  }
  return { x, h, mid, width: 1 };
}

const FAR = makeRidge(7, 34, 0.13, 0.04);
const NEAR = makeRidge(42, 28, 0.2, 0.05, 0.5);
const STARS = (() => {
  const r = rng(99);
  return Array.from({ length: 140 }, () => ({ x: r(), y: r() * 0.55, s: 0.6 + r() * 1.4, p: r() * 6.28 }));
})();
const CLOUDS = (() => {
  const r = rng(5);
  return Array.from({ length: 4 }, (_, g) => ({
    x: r(),
    y: 0.08 + g * 0.11 + r() * 0.05,
    lines: Array.from({ length: 5 + Math.floor(r() * 4) }, (_, i) => ({
      dx: (r() - 0.5) * 0.08,
      dy: i * 0.016,
      len: 0.08 + r() * 0.16,
    })),
  }));
})();

// câmbio automático de 6 marchas: velocidade máxima de cada marcha (x100 km/h)
const GEAR_TOP = [0.55, 0.95, 1.4, 1.95, 2.6, 3.6];
// as primeiras marchas puxam menos: o arranque dura uns 4 s até 100 km/h, pra dar pra sentir
const GEAR_PULL = [0.62, 0.7, 0.72, 0.66, 0.58, 0.46]; // força de cada marcha (arranque forte, ~3,5 s até 100)
const CREEP = 0.2; // carro automático anda devagarinho sozinho (20 km/h)

type Car = { lane: number; z: number; v: number; pal: CarPalette; brake: number; lx?: number };

export default function SynthScene({ playing = false, cockpit = false }: { playing?: boolean; cockpit?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playingRef = useRef(playing);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const c = ctx;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0;
    let H = 0;
    let raf = 0;
    let last = performance.now();
    let dist = 0; // distância percorrida (move o chão)
    let speed = 0.6;
    let brake = 0;
    const sun = document.createElement("canvas");
    let left = 0;
    let top = 0;
    let userSteer = 0; // volante na mão de quem dirige (setas do teclado ou arrastando)
    let lat = 0; // quanto você saiu da sua faixa (negativo = esquerda); dá pra trocar de faixa à vontade
    let roll = 0; // inclinação da cabeça/carro nas curvas
    let skidAt = 0;
    let gear = 1;
    let rpm = 0.3;
    let shiftFlash = 0; // luz da borboleta do volante na troca de marcha
    let trip = 0; // km rodados desde que entrou
    let view: DriveView = driveInput.view;
    let fade = cockpit ? 1 : 0; // escurece rápido ao trocar de vista
    // riscos de velocidade nas laterais do para-brisa
    const streaks = Array.from({ length: 34 }, () => ({ a: Math.random() * Math.PI * 2, d: Math.random(), s: 0.6 + Math.random() }));
    // partículas de vento (janela e teto solar)
    // partículas de vento em 3D passando pela câmera (teto solar)
    const air = Array.from({ length: 110 }, () => ({ x: (Math.random() - 0.5) * 12, y: Math.random() * 4.5 - 0.6, z: 1 + Math.random() * 30, s: Math.random() }));
    let rise = 0; // 0 = sentado no volante, 1 = com a cabeça pra fora do teto solar
    const city = createCity(); // Neo-Tóquio em volta da estrada (no papel de parede e dentro do carro)
    // a cidade é desenhada em baixa resolução e ampliada com pixels marcados (pixel art)
    const PIX = 3;
    const pix = document.createElement("canvas");
    const pc = pix.getContext("2d")!;
    function pixelate(draw: (ctx: CanvasRenderingContext2D) => void) {
      pc.setTransform(1, 0, 0, 1, 0, 0);
      pc.clearRect(0, 0, pix.width, pix.height);
      pc.setTransform(1 / PIX, 0, 0, 1 / PIX, 0, 0);
      draw(pc);
      c.save();
      c.imageSmoothingEnabled = false;
      c.drawImage(pix, 0, 0, W, H);
      c.restore();
    }
    let frameDt = 0;
    let drawLat = 0;
    let push = 0; // força do arranque sentida no corpo (empurra no banco)
    let prevSpeed = 0.6;
    // outros carros na faixa da esquerda (z = distância à frente; negativo = atrás)
    const traffic: Car[] = [
      { lane: -0.5, z: 7, v: 0.9, pal: TRAFFIC[0], brake: 0 },
      { lane: -0.5, z: 16, v: 1.25, pal: TRAFFIC[1], brake: 0 },
      { lane: -0.5, z: -5, v: 1.7, pal: TRAFFIC[2], brake: 0 },
    ];
    let nextPal = 3;
    // motos de luz costurando entre os carros, deixando rastro de LED
    // (desenho original, inspirado no clima de Tron e Akira)
    type Bike = { x: number; z: number; v: number; rgb: string; ph: number; trail: { x: number; z: number; a: number }[] };
    const BIKE_RGB = ["255,40,60", "95,243,255", "255,150,40"];
    const bikes: Bike[] = [
      // começam bem lá atrás: nada de moto passando zunindo toda vez que você entra no carro
      { x: 0, z: -60, v: 2.4, rgb: BIKE_RGB[0], ph: 0, trail: [] },
      { x: 0, z: -95, v: 2.0, rgb: BIKE_RGB[1], ph: 2, trail: [] },
    ];
    let nextBike = 2;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = canvas!.clientWidth;
      H = canvas!.clientHeight;
      canvas!.width = Math.round(W * dpr);
      canvas!.height = Math.round(H * dpr);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      pix.width = Math.ceil(W / PIX);
      pix.height = Math.ceil(H / PIX);
      const box = canvas!.getBoundingClientRect();
      left = box.left;
      top = box.top;
    }

    function drawSun(R: number, t: number) {
      const size = Math.ceil(R * 2);
      sun.width = size;
      sun.height = size;
      const s = sun.getContext("2d")!;
      const g = s.createLinearGradient(0, 0, 0, size);
      g.addColorStop(0, "#ffe55a");
      g.addColorStop(0.55, "#ffc93c");
      g.addColorStop(1, "#ff9f2e");
      s.fillStyle = g;
      s.beginPath();
      s.arc(R, R, R, 0, Math.PI * 2);
      s.fill();
      // listras a partir do meio do sol (ficam visíveis acima das montanhas),
      // cada vez mais grossas para baixo e descendo devagar
      s.globalCompositeOperation = "destination-out";
      const n = 8;
      const shift = (t * 0.03) % (1 / n);
      for (let i = 0; i < n + 1; i++) {
        const f = i / n + shift;
        if (f > 1) continue;
        const y = R * 0.42 + f * R * 1.58;
        const gap = 2 + f * R * 0.11;
        s.fillRect(0, y, size, gap);
      }
      s.globalCompositeOperation = "source-over";
    }

    function drawRidge(r: Ridge, horizon: number, scale: number, offset: number, alpha: number, fill: CanvasGradient) {
      const span = W * 1.7;
      const shift = ((offset % span) + span) % span;
      for (let copy = -1; copy <= 1; copy++) {
        const ox = copy * span - shift;
        const px = (i: number) => ox + (i / r.x.length) * span;
        const top = (i: number) => horizon - r.h[i % r.h.length] * H * scale;
        // preenchimento
        c.beginPath();
        c.moveTo(px(0), horizon);
        for (let i = 0; i <= r.x.length; i++) c.lineTo(px(i), top(i));
        c.lineTo(px(r.x.length), horizon);
        c.closePath();
        c.fillStyle = fill;
        c.fill();
        // malha de triângulos
        c.beginPath();
        for (let i = 0; i < r.x.length; i++) {
          const ax = px(i);
          const bx = px(i + 1);
          const mx = (ax + bx) / 2;
          const my = horizon - (horizon - Math.min(top(i), top(i + 1))) * r.mid[i];
          c.moveTo(ax, horizon);
          c.lineTo(ax, top(i));
          c.lineTo(mx, my);
          c.lineTo(ax, horizon);
          c.moveTo(ax, top(i));
          c.lineTo(bx, top(i + 1));
          c.lineTo(mx, my);
          c.lineTo(bx, horizon);
          c.moveTo(ax, horizon);
          c.lineTo(mx, my);
        }
        c.strokeStyle = `rgba(65, 240, 255, ${alpha * 0.25})`;
        c.lineWidth = 4;
        c.stroke();
        c.strokeStyle = `rgba(110, 248, 255, ${alpha})`;
        c.lineWidth = 1.2;
        c.stroke();
      }
    }

    function roundRect(x: number, y: number, w: number, h: number, r: number) {
      r = Math.max(0, Math.min(r, w / 2, h / 2));
      c.beginPath();
      c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r);
      c.arcTo(x, y, x + w, y, r);
      c.closePath();
    }

    function neonStroke(color: string, width = 1.6) {
      c.save();
      c.globalCompositeOperation = "lighter";
      c.strokeStyle = color.replace("A", "0.22");
      c.lineWidth = width * 5;
      c.stroke();
      c.strokeStyle = color.replace("A", "0.95");
      c.lineWidth = width;
      c.stroke();
      c.restore();
    }

    /* ---------------- mundo: céu, sol, montanhas e grade ---------------- */
    function drawSky(t: number, horizon: number, drift: number) {
      const sky = c.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, "#06061e");
      sky.addColorStop(0.45, "#18238a");
      sky.addColorStop(0.8, "#6a2bbf");
      sky.addColorStop(1, "#e43fb4");
      c.fillStyle = sky;
      c.fillRect(0, 0, W, horizon + 1);
      // estrelas piscando
      for (const s of STARS) {
        const a = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.8 + s.p));
        c.fillStyle = `rgba(255,255,255,${a})`;
        const x = ((((s.x - drift * 0.15) % 1) + 1) % 1) * W;
        c.fillRect(x, s.y * horizon, s.s, s.s);
      }
      // nuvens de neon passando
      c.lineCap = "round";
      for (const cl of CLOUDS) {
        const baseX = ((((cl.x - t * 0.006 - drift) % 1.3) + 1.3) % 1.3) - 0.15;
        for (const l of cl.lines) {
          const x0 = (baseX + l.dx) * W;
          const y = (cl.y + l.dy) * H;
          if (y > horizon - 20) continue;
          const g = c.createLinearGradient(x0, 0, x0 + l.len * W, 0);
          g.addColorStop(0, "rgba(95,243,255,0)");
          g.addColorStop(0.3, "rgba(95,243,255,0.9)");
          g.addColorStop(1, "rgba(95,243,255,0)");
          c.strokeStyle = g;
          c.lineWidth = 3;
          c.beginPath();
          c.moveTo(x0, y);
          c.lineTo(x0 + l.len * W, y);
          c.stroke();
        }
      }
    }

    function drawFog(horizon: number) {
      const K = H - horizon;
      // névoa no horizonte esconde as linhas que se juntam
      const fog = c.createLinearGradient(0, horizon, 0, horizon + K * 0.25);
      fog.addColorStop(0, "rgba(61,15,94,1)");
      fog.addColorStop(1, "rgba(61,15,94,0)");
      c.fillStyle = fog;
      c.fillRect(0, horizon, W, K * 0.25);
      // linha do horizonte brilhando
      const hl = c.createLinearGradient(0, horizon - 8, 0, horizon + 8);
      hl.addColorStop(0, "rgba(255,120,240,0)");
      hl.addColorStop(0.5, "rgba(255,200,255,0.95)");
      hl.addColorStop(1, "rgba(255,120,240,0)");
      c.fillStyle = hl;
      c.fillRect(0, horizon - 8, W, 16);
    }

    function drawWorld(t: number, horizon: number, steer: number, vpX: number, road: boolean, beams = true) {
      drawSky(t, horizon, steer * 0.01);

      // sol com brilho (pulsa com a música)
      const R = Math.min(W * 0.13, H * 0.24);
      const sunX = W / 2 - steer * W * 0.012;
      const sunY = horizon - R * 0.62;
      const pulse = playingRef.current ? 1 + Math.max(0, Math.sin(t * Math.PI * 2 * 2.13)) * 0.08 : 1;
      const halo = c.createRadialGradient(sunX, sunY, R * 0.6, sunX, sunY, R * 2.2 * pulse);
      halo.addColorStop(0, "rgba(255,180,60,0.55)");
      halo.addColorStop(1, "rgba(255,80,180,0)");
      c.fillStyle = halo;
      c.fillRect(sunX - R * 2.5, sunY - R * 2.5, R * 5, R * 5);
      drawSun(R, t);
      c.drawImage(sun, sunX - R, sunY - R);

      // montanhas (duas camadas em paralaxe)
      const farFill = c.createLinearGradient(0, horizon - H * 0.15, 0, horizon);
      farFill.addColorStop(0, "#1b0f45");
      farFill.addColorStop(1, "#2a1460");
      drawRidge(FAR, horizon, 1, dist * 6 + steer * 30, 0.45, farFill);
      const nearFill = c.createLinearGradient(0, horizon - H * 0.3, 0, horizon);
      nearFill.addColorStop(0, "#120a30");
      nearFill.addColorStop(1, "#1d0b44");
      drawRidge(NEAR, horizon, 1, dist * 14 + steer * 60, 0.9, nearFill);
      pixelate((pctx) => drawSkyline(pctx, W, H, horizon, steer * W * 0.02, t, city));

      // chão
      const floor = c.createLinearGradient(0, horizon, 0, H);
      floor.addColorStop(0, "#3d0f5e");
      floor.addColorStop(1, "#13031f");
      c.fillStyle = floor;
      c.fillRect(0, horizon, W, H - horizon);

      // grade em perspectiva
      const K = H - horizon;
      c.beginPath();
      const off = dist % 1;
      for (let k = 0; k < 40; k++) {
        const z = 0.55 + k - off;
        if (z <= 0.5) continue;
        const y = horizon + K / z;
        if (y < horizon + 1) break;
        c.moveTo(0, y);
        c.lineTo(W, y);
      }
      const camX = steer * 0.6;
      for (let i = -24; i <= 24; i++) {
        const xw = i * 0.55 - camX;
        c.moveTo(vpX + xw * K * 1.15, H);
        c.lineTo(vpX, horizon);
      }
      c.strokeStyle = "rgba(255, 61, 240, 0.18)";
      c.lineWidth = 6;
      c.stroke();
      c.strokeStyle = "rgba(255, 110, 245, 0.9)";
      c.lineWidth = 1.4;
      c.stroke();
      // reflexo da cidade no chão (o buffer de pixels ainda guarda o horizonte)
      c.save();
      c.beginPath();
      c.rect(0, horizon, W, H - horizon);
      c.clip();
      c.globalAlpha = 0.22;
      c.imageSmoothingEnabled = false;
      c.translate(0, horizon * 2);
      c.scale(1, -1);
      c.drawImage(pix, 0, 0, W, H);
      c.restore();
      // a névoa e a linha do horizonte ficam atrás da rua (antes ela cortava os prédios e as pessoas)
      drawFog(horizon);
      if (road) drawRoad(t, horizon, vpX, steer, beams);
      drawRain(c, W, H, frameDt, city, rise > 0.5 ? 1 : 0.6);
    }

    /* ---------------- dirigir: acelerador, freio e marchas ---------------- */
    function updateDrive(dt: number) {
      // no teto solar a IA assume o volante e acelera até a velocidade de cruzeiro
      const ai = view === "roof";
      const gas = ai ? Math.max(throttle(), speed < 2.7 ? 0.9 : 0.35) : throttle();
      const brk = ai ? 0 : braking();
      const drag = 0.01 * speed + 0.025 * speed * speed;
      if (!gas && !brk) {
        // sem pé em nada: vai perdendo velocidade até o "creep" do câmbio automático
        if (speed > CREEP) speed = Math.max(CREEP, speed - (0.12 + drag) * dt);
        else speed = Math.min(CREEP, speed + 0.4 * dt);
      } else {
        const acc = gas * GEAR_PULL[gear - 1] * 0.75 - drag * 0.8 - brk * 1.7;
        speed = Math.max(0, Math.min(3.6, speed + acc * dt));
      }
      brake = Math.max(brk, brake - dt * 3);
      // marcha automática
      let g = GEAR_TOP.findIndex((top) => speed < top) + 1;
      if (g === 0) g = 6;
      if (g !== gear) {
        gear = g;
        shiftFlash = 1;
      }
      shiftFlash = Math.max(0, shiftFlash - dt * 2.5);
      const lo = gear > 1 ? GEAR_TOP[gear - 2] : 0;
      const f = (speed - lo) / (GEAR_TOP[gear - 1] - lo);
      const target = speed < 0.02 ? 0.12 + gas * 0.6 : 0.28 + f * 0.66 + gas * 0.04;
      rpm += (target - rpm) * Math.min(1, dt * 8);
      trip += (speed * 100 * dt) / 3600;
      driveInput.speed = speed;
      driveInput.rpm = rpm;
      driveInput.gear = gear;
      const wind = (speed / 3) * (view === "front" ? 0.25 : view === "window" ? 0.35 : 1.3);
      rideUpdate(rpm, gas, wind, speed);
    }

    // os outros carros andam na própria velocidade: mais rápido que eles, você ultrapassa
    function updateTraffic(dt: number) {
      for (const car of traffic) {
        car.z += (car.v - speed) * dt * 2.2;
        // você invadiu a faixa deles? quem está perto desvia pra faixa que você deixou livre
        const dodge = drawLat < -0.55 && car.z > 0.6 && car.z < 7 ? 0.45 : car.lane;
        car.lx = (car.lx ?? car.lane) + (dodge - (car.lx ?? car.lane)) * Math.min(1, dt * 1.8);
        car.brake = Math.max(0, car.brake - dt * 1.5);
        if (Math.random() < dt * 0.05) car.brake = 1;
        if (car.z > 24 || car.z < -9) {
          // some de vista: volta do outro lado com outra cor e velocidade
          const ahead = car.z < -9;
          car.z = ahead ? 20 + Math.random() * 4 : -8;
          car.v = ahead ? 0.5 + Math.random() * 1.2 : speed + 0.3 + Math.random() * 0.8;
          car.pal = TRAFFIC[nextPal++ % TRAFFIC.length];
        }
      }
      // motos: mais rápidas que todo mundo, costurando de um lado pro outro
      for (const b of bikes) {
        const before = b.z;
        b.z += (b.v - speed) * dt * 2.2;
        if (cockpit && before < -1.2 && b.z >= -1.2) bikeSound(); // vem zunindo por trás e passa do seu lado
        b.ph += dt * (1.6 + b.v * 0.3);
        // perto de você ela vai pela faixa do meio; longe, costura entre as faixas
        const near = Math.max(0, Math.min(1, (b.z - 1.2) / 2.5));
        b.x = Math.sin(b.ph) * 0.42 * near + (1 - near) * -0.05;
        // o rastro fica parado no mundo (você passa por ele), e vai apagando
        for (const p of b.trail) {
          p.z -= speed * dt * 2.2;
          p.a -= dt * 0.6;
        }
        b.trail.push({ x: b.x, z: b.z, a: 1 });
        b.trail = b.trail.filter((p) => p.a > 0 && p.z > 0.45).slice(-80);
        if (b.z > 26 || b.z < -120) {
          b.z = -40 - Math.random() * 50; // a próxima demora um pouco pra aparecer
          b.v = speed + 1.1 + Math.random() * 1.2;
          b.rgb = BIKE_RGB[nextBike++ % BIKE_RGB.length];
          b.trail = [];
        }
      }
    }

    // moto de luz original: casco fechado e comprido, rodas sem cubo (só o aro aceso),
    // piloto deitado em cima. Montada em 3D de verdade com a mesma projeção da pista,
    // então de longe você vê a traseira e, quando ela costura pro lado, aparece o perfil.
    type At = (sd: number, z: number, hh: number) => readonly [number, number];
    // perfil do casco (dz pra frente, altura), traseira em dz=0
    const SHELL: [number, number][] = [
      [0.02, 0.2], [-0.04, 0.42], [0.18, 0.58], [0.62, 0.6], [1.0, 0.52], [1.32, 0.6],
      [1.78, 0.62], [2.12, 0.42], [2.16, 0.22], [1.82, 0.12], [1.5, 0.2], [0.6, 0.2], [0.3, 0.12],
    ];
    const WR = 0.29; // raio das rodas
    function drawBike3D(at: At, vpX: number, sx: number, z0: number, rgb: string, t: number, lean: number, cw: number, sc: number) {
      const w = 0.026 * (0.4 + 0.6 * sc); // meia largura do casco (estreita: é moto, não carro)
      const [cx] = at(sx, z0, 0);
      const side = cx < vpX ? 1 : -1; // lado que a gente enxerga
      const lw = Math.max(0.8, cw / 45);
      const S = 0.62 * sc; // a moto é baixinha: ~60% da altura do olho
      const P = (sd: number, dz: number, hh: number) => at(sx + sd + lean * hh * 0.025, z0 + dz * S, hh * S);
      c.save();
      // poça de luz no chão
      const [gx, gy] = at(sx, z0 + 0.6, 0);
      const glow = c.createRadialGradient(gx, gy, 0, gx, gy, cw * 1.6);
      glow.addColorStop(0, `rgba(${rgb},0.4)`);
      glow.addColorStop(1, `rgba(${rgb},0)`);
      c.fillStyle = glow;
      c.beginPath();
      c.ellipse(gx, gy, cw * 1.6, cw * 0.35, 0, 0, Math.PI * 2);
      c.fill();
      // rodas sem cubo: aro preto grosso + anel de luz com segmentos girando
      for (const wz of [WR, 2.16 - WR - 0.02]) {
        const ring = (r: number, sd: number) => {
          c.beginPath();
          for (let i = 0; i <= 28; i++) {
            const a = (i / 28) * Math.PI * 2;
            const [x, y] = P(sd, wz + Math.cos(a) * r, WR + Math.sin(a) * r);
            if (i) c.lineTo(x, y);
            else c.moveTo(x, y);
          }
        };
        ring(WR, side * w * 0.6);
        c.fillStyle = "#020104";
        c.fill();
        ring(WR * 0.74, side * w * 0.6);
        c.fillStyle = "rgba(10,4,24,0.9)";
        c.fill();
        ring(WR * 0.8, side * w * 0.62);
        neonStroke(`rgba(${rgb},A)`, lw * 1.3);
        // marcas no aro girando (é o que dá a sensação de velocidade)
        c.save();
        c.globalCompositeOperation = "lighter";
        for (let k = 0; k < 6; k++) {
          const a = t * 14 + (k / 6) * Math.PI * 2;
          const [x, y] = P(side * w * 0.64, wz + Math.cos(a) * WR * 0.9, WR + Math.sin(a) * WR * 0.9);
          c.fillStyle = "rgba(255,255,255,0.8)";
          c.fillRect(x - lw, y - lw, lw * 2, lw * 2);
        }
        c.restore();
      }
      // casco: lateral visível, tampa traseira e o topo
      const sideFace = (sd: number) => {
        c.beginPath();
        SHELL.forEach(([dz, hh], i) => {
          const [x, y] = P(sd, dz, hh);
          if (i) c.lineTo(x, y);
          else c.moveTo(x, y);
        });
        c.closePath();
      };
      sideFace(side * w);
      const [, ty] = P(0, 1, 0.62);
      const [, by] = P(0, 1, 0.12);
      const body = c.createLinearGradient(0, ty, 0, by);
      body.addColorStop(0, "#2b1d52");
      body.addColorStop(0.5, "#0d0820");
      body.addColorStop(1, "#040209");
      c.fillStyle = body;
      c.fill();
      neonStroke(`rgba(${rgb},A)`, lw);
      // veio de luz correndo pela lateral (o "núcleo" aceso)
      c.beginPath();
      [[0.1, 0.36], [0.7, 0.4], [1.2, 0.36], [1.9, 0.4]].forEach(([dz, hh], i) => {
        const [x, y] = P(side * w * 1.01, dz, hh);
        if (i) c.lineTo(x, y);
        else c.moveTo(x, y);
      });
      neonStroke(`rgba(${rgb},A)`, lw * 1.6);
      // tampa traseira (o que mais aparece de trás)
      const rear: [number, number][] = [[0.02, 0.2], [-0.04, 0.42], [0.18, 0.58]];
      c.beginPath();
      rear.forEach(([dz, hh], i) => {
        const [x, y] = P(-w, dz, hh);
        if (i) c.lineTo(x, y);
        else c.moveTo(x, y);
      });
      for (let i = rear.length - 1; i >= 0; i--) {
        const [x, y] = P(w, rear[i][0], rear[i][1]);
        c.lineTo(x, y);
      }
      c.closePath();
      c.fillStyle = "#160d30";
      c.fill();
      neonStroke(`rgba(${rgb},A)`, lw * 0.8);
      // lanterna: barra cheia de lado a lado
      const [l0x, l0y] = P(-w * 0.9, -0.03, 0.38);
      const [l1x, l1y] = P(w * 0.9, -0.03, 0.38);
      c.save();
      c.shadowColor = `rgb(${rgb})`;
      c.shadowBlur = Math.min(30, cw * 0.7);
      c.strokeStyle = `rgb(${rgb})`;
      c.lineWidth = Math.max(1.5, lw * 2.4);
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(l0x, l0y);
      c.lineTo(l1x, l1y);
      c.stroke();
      c.strokeStyle = "rgba(255,255,255,0.9)";
      c.lineWidth = Math.max(0.6, lw);
      c.stroke();
      c.restore();
      // topo do casco
      c.beginPath();
      const top: [number, number][] = [[0.18, 0.58], [0.62, 0.6], [1.0, 0.52]];
      top.forEach(([dz, hh], i) => {
        const [x, y] = P(-w, dz, hh);
        if (i) c.lineTo(x, y);
        else c.moveTo(x, y);
      });
      for (let i = top.length - 1; i >= 0; i--) {
        const [x, y] = P(w, top[i][0], top[i][1]);
        c.lineTo(x, y);
      }
      c.closePath();
      c.fillStyle = "#120a2a";
      c.fill();
      // espinha de luz no topo do casco
      c.beginPath();
      top.forEach(([dz, hh], i) => {
        const [x, y] = P(0, dz, hh + 0.005);
        if (i) c.lineTo(x, y);
        else c.moveTo(x, y);
      });
      neonStroke(`rgba(${rgb},A)`, lw * 0.8);
      // piloto deitado: costas, ombros e capacete com viseira
      const back: [number, number, number][] = [[-0.035, 0.55, 0.62], [0.035, 0.55, 0.62], [0.04, 1.35, 0.84], [-0.04, 1.35, 0.84]];
      c.beginPath();
      back.forEach(([sd, dz, hh], i) => {
        const [x, y] = P(sd, dz, hh);
        if (i) c.lineTo(x, y);
        else c.moveTo(x, y);
      });
      c.closePath();
      c.fillStyle = "#08050f";
      c.fill();
      c.beginPath();
      const [s0x, s0y] = P(0, 0.6, 0.66);
      const [s1x, s1y] = P(0, 1.3, 0.87);
      c.moveTo(s0x, s0y);
      c.lineTo(s1x, s1y);
      neonStroke(`rgba(${rgb},A)`, lw * 0.9);
      const [hx, hy] = P(0, 1.5, 0.92);
      const [, hy2] = P(0, 1.5, 1.05);
      const hr = Math.abs(hy - hy2);
      c.beginPath();
      c.arc(hx, hy, hr, 0, Math.PI * 2);
      c.fillStyle = "#0e0a1e";
      c.fill();
      c.beginPath();
      c.arc(hx, hy, hr, Math.PI * 1.1, Math.PI * 1.9);
      neonStroke("rgba(220,240,255,A)", Math.max(0.6, lw * 0.9));
      c.beginPath();
      c.arc(hx, hy, hr * 0.98, Math.PI * 0.15, Math.PI * 0.85);
      neonStroke(`rgba(${rgb},A)`, Math.max(0.6, lw * 0.7));
      c.restore();
    }

    // a mesma moto de perfil, passando colada na janela
    function drawBikeSide(x: number, y: number, len: number, rgb: string, t: number) {
      const u = len / 2.2;
      const X = (dz: number) => x + (dz - 1.08) * u; // frente pra direita
      const Y = (hh: number) => y - hh * u;
      c.save();
      // rastro de luz saindo de trás
      const tr = c.createLinearGradient(X(0) - len * 1.6, 0, X(0), 0);
      tr.addColorStop(0, `rgba(${rgb},0)`);
      tr.addColorStop(1, `rgba(${rgb},0.75)`);
      c.fillStyle = tr;
      c.fillRect(X(0) - len * 1.6, Y(0.42), len * 1.6, u * 0.36);
      c.fillStyle = "rgba(255,255,255,0.7)";
      c.fillRect(X(0) - len * 0.9, Y(0.36), len * 0.9, Math.max(2, u * 0.03));
      for (const wz of [WR, 2.16 - WR - 0.02]) {
        c.beginPath();
        c.arc(X(wz), Y(WR), WR * u, 0, Math.PI * 2);
        c.fillStyle = "#020104";
        c.fill();
        c.beginPath();
        c.arc(X(wz), Y(WR), WR * u * 0.8, 0, Math.PI * 2);
        c.fillStyle = "#0a0418";
        c.fill();
        neonStroke(`rgba(${rgb},A)`, Math.max(2, u * 0.035));
        c.save();
        c.globalCompositeOperation = "lighter";
        for (let k = 0; k < 8; k++) {
          const a = t * 18 + (k / 8) * Math.PI * 2;
          c.beginPath();
          c.arc(X(wz), Y(WR), WR * u * 0.9, a, a + 0.25);
          c.strokeStyle = "rgba(255,255,255,0.75)";
          c.lineWidth = Math.max(2, u * 0.03);
          c.stroke();
        }
        c.restore();
      }
      c.beginPath();
      SHELL.forEach(([dz, hh], i) => (i ? c.lineTo(X(dz), Y(hh)) : c.moveTo(X(dz), Y(hh))));
      c.closePath();
      const body = c.createLinearGradient(0, Y(0.62), 0, Y(0.12));
      body.addColorStop(0, "#33235e");
      body.addColorStop(0.45, "#110a28");
      body.addColorStop(1, "#040209");
      c.fillStyle = body;
      c.fill();
      neonStroke(`rgba(${rgb},A)`, Math.max(2, u * 0.025));
      c.beginPath();
      [[0.1, 0.36], [0.7, 0.4], [1.2, 0.36], [1.9, 0.4]].forEach(([dz, hh], i) => (i ? c.lineTo(X(dz), Y(hh)) : c.moveTo(X(dz), Y(hh))));
      neonStroke(`rgba(${rgb},A)`, Math.max(3, u * 0.04));
      // piloto: perna dobrada, tronco deitado, braço no guidão e capacete
      c.beginPath();
      c.moveTo(X(0.45), Y(0.6));
      c.lineTo(X(0.8), Y(0.36));
      c.lineTo(X(1.05), Y(0.34));
      c.lineTo(X(1.0), Y(0.5));
      c.lineTo(X(1.35), Y(0.82));
      c.lineTo(X(1.6), Y(0.62));
      c.lineTo(X(1.72), Y(0.64));
      c.lineTo(X(1.42), Y(0.92));
      c.quadraticCurveTo(X(0.9), Y(0.9), X(0.45), Y(0.68));
      c.closePath();
      c.fillStyle = "#08050f";
      c.fill();
      neonStroke(`rgba(${rgb},A)`, Math.max(1.5, u * 0.015));
      c.beginPath();
      c.ellipse(X(1.55), Y(0.95), u * 0.15, u * 0.12, -0.2, 0, Math.PI * 2);
      c.fillStyle = "#0e0a1e";
      c.fill();
      c.beginPath();
      c.ellipse(X(1.6), Y(0.94), u * 0.1, u * 0.05, -0.2, 0, Math.PI * 2);
      c.fillStyle = `rgba(${rgb},0.85)`;
      c.fill();
      // farol único na ponta
      c.save();
      c.shadowColor = "#fff";
      c.shadowBlur = 25;
      c.fillStyle = "#fff";
      c.fillRect(X(2.1), Y(0.45), u * 0.06, u * 0.08);
      c.restore();
      c.restore();
    }

    /* ---------------- vista de dentro do carro ---------------- */
    // estrada de duas faixas (você na da direita), faixa tracejada, faróis e os outros carros
    function drawRoad(t: number, hz: number, vpX: number, steer: number, beams = true) {
      const K = H - hz;
      // dentro do carro a pista é larga e você vai na faixa da direita; no papel de parede ela
      // é mais estreita e o carro de fora roda na faixa da direita também
      const half = cockpit ? W * 1.1 : W * 0.42;
      // drawLat: você trocando de faixa (a pista desliza por baixo do carro)
      const bx = cockpit ? W / 2 - half * 0.5 - steer * W * 0.06 - drawLat * half * 0.5 : W / 2 + steer * W * 0.07 - half * 0.5;
      const scale = half / (W * 1.1); // tamanho dos carros e motos acompanha a largura da pista
      const xAt = (y: number, side: number) => {
        const k = (y - hz) / K;
        return vpX + (bx + side * half - vpX) * k;
      };
      c.beginPath();
      c.moveTo(vpX - 1, hz);
      c.lineTo(vpX + 1, hz);
      c.lineTo(bx + half, H);
      c.lineTo(bx - half, H);
      c.closePath();
      const asphalt = c.createLinearGradient(0, hz, 0, H);
      asphalt.addColorStop(0, "rgba(20,6,40,0.6)");
      asphalt.addColorStop(1, "rgba(10,3,24,0.92)");
      c.fillStyle = asphalt;
      c.fill();
      for (const side of [-1, 1]) {
        c.beginPath();
        c.moveTo(vpX, hz);
        c.lineTo(bx + side * half, H);
        neonStroke("rgba(95,243,255,A)", 1.6);
      }
      // faixa tracejada no meio, passando com a velocidade
      c.fillStyle = "rgba(255,230,140,0.9)";
      const off = (dist * 2) % 1;
      for (let k = 0; k < 30; k++) {
        const z1 = 0.5 + k * 0.5 - off * 0.5;
        const z2 = z1 + 0.22;
        if (z1 <= 0.45) continue;
        const y1 = hz + K / z2;
        const y2 = Math.min(H, hz + K / z1);
        if (y2 - y1 < 0.6) continue;
        const w1 = (W * 0.006) / z2;
        const w2 = (W * 0.006) / z1;
        const x1 = xAt(y1, 0);
        const x2 = xAt(y2, 0);
        c.beginPath();
        c.moveTo(x1 - w1, y1);
        c.lineTo(x1 + w1, y1);
        c.lineTo(x2 + w2, y2);
        c.lineTo(x2 - w2, y2);
        c.fill();
      }
      // prédios de Neo-Tóquio colados na estrada, com o neon refletindo no asfalto molhado
      {
        const P = {
          px: (sd: number, z: number) => vpX + (bx + sd * half - vpX) / z,
          py: (hh: number, z: number) => hz + (K * (1 - hh)) / z,
        };
        pixelate((pctx) => drawStreet(pctx, t, dist, P, (x, y, w, h, rgb) => {
          c.save();
          c.globalCompositeOperation = "lighter";
          const rg = c.createLinearGradient(0, y, 0, y + h);
          rg.addColorStop(0, `rgba(${rgb},0.28)`);
          rg.addColorStop(1, `rgba(${rgb},0)`);
          c.fillStyle = rg;
          c.fillRect(x - w / 2, y, w, h);
          c.restore();
        }));
        flushLate(c); // texto dos outdoors nítido por cima da pixelização
      }
      // carros da outra faixa: mesmo modelo do seu, em outras cores (do mais longe pro mais perto)
      // rastros de luz das motos: uma parede baixa de LED (Tron) + o risco vermelho da lanterna (Akira)
      const at = (sd: number, z: number, hh: number) => [vpX + (bx + sd * half - vpX) / z, hz + (K * (1 - hh)) / z] as const;
      c.save();
      c.globalCompositeOperation = "lighter";
      for (const b of bikes) {
        const tr = b.trail.filter((p) => p.z > 0.6);
        for (let i = 1; i < tr.length; i++) {
          const p0 = tr[i - 1];
          const p1 = tr[i];
          const [x0, y0] = at(p0.x, p0.z, 0);
          const [x1, y1] = at(p1.x, p1.z, 0);
          const bh = 0.62 * scale; // mesma escala da moto
          const [x0t, y0t] = at(p0.x, p0.z, 0.3 * bh);
          const [x1t, y1t] = at(p1.x, p1.z, 0.3 * bh);
          c.beginPath();
          c.moveTo(x0, y0);
          c.lineTo(x1, y1);
          c.lineTo(x1t, y1t);
          c.lineTo(x0t, y0t);
          c.closePath();
          c.fillStyle = `rgba(${b.rgb},${0.5 * p1.a})`;
          c.fill();
          const [xa, ya] = at(p0.x, p0.z, 0.38 * bh);
          const [xb, yb] = at(p1.x, p1.z, 0.38 * bh);
          c.beginPath();
          c.moveTo(xa, ya);
          c.lineTo(xb, yb);
          c.strokeStyle = `rgba(${b.rgb},${0.95 * p1.a})`;
          c.lineWidth = Math.max(1.5, (10 * scale) / p1.z);
          c.stroke();
        }
      }
      c.restore();
      // carros e motos, do mais longe pro mais perto
      const ents: { z: number; draw: () => void }[] = [];
      for (const car of traffic) {
        if (car.z < 1.05) continue;
        ents.push({
          z: car.z,
          draw: () => {
            const y = hz + K / car.z;
            const cw = ((W * 0.5) / car.z) * scale;
            drawNeonCar(c, xAt(y, car.lx ?? car.lane), y, cw, { palette: car.pal, brake: car.brake, t, reflection: cw > 120 });
          },
        });
      }
      for (const b of bikes) {
        if (b.z < 0.9) continue;
        const lean = Math.cos(b.ph) * Math.max(0, Math.min(1, (b.z - 1.2) / 2.5));
        ents.push({ z: b.z, draw: () => drawBike3D(at, vpX, b.x, b.z, b.rgb, t, lean, ((W * 0.21) / b.z) * scale, scale) });
      }
      ents.sort((a, b) => b.z - a.z).forEach((e) => e.draw());
      if (!beams) return;
      // luz dos faróis na pista (mais forte com o farol alto)
      c.save();
      c.globalCompositeOperation = "lighter";
      const beam = driveInput.high ? 0.28 : 0.12;
      for (const side of [-1, 1]) {
        c.beginPath();
        const ny = H * 0.6;
        const fy = hz + K * (driveInput.high ? 0.03 : 0.06);
        const camX = W / 2 - steer * W * 0.06;
        const nx = vpX + (camX - vpX) * ((ny - hz) / K);
        c.moveTo(nx + side * W * 0.03, ny);
        c.lineTo(vpX + side * W * 0.004, fy);
        c.lineTo(vpX + side * W * 0.05, fy);
        c.lineTo(nx + side * W * 0.34, ny);
        c.closePath();
        const g = c.createLinearGradient(0, ny, 0, fy);
        g.addColorStop(0, `rgba(220,240,255,${beam})`);
        g.addColorStop(1, "rgba(220,240,255,0)");
        c.fillStyle = g;
        c.fill();
      }
      c.restore();
    }

    // farol de um carro que vem atrás, visto num espelho
    function headlights(gx: number, gy: number, gap: number, sz: number) {
      for (const side of [-1, 1]) {
        const x = gx + side * gap;
        const g = c.createRadialGradient(x, gy, 0, x, gy, sz * 3);
        g.addColorStop(0, "rgba(255,255,240,0.95)");
        g.addColorStop(0.3, "rgba(170,230,255,0.5)");
        g.addColorStop(1, "rgba(170,230,255,0)");
        c.fillStyle = g;
        c.fillRect(x - sz * 3, gy - sz * 3, sz * 6, sz * 6);
      }
    }

    // retrovisores laterais (vista simplificada da pista atrás)
    function drawSideMirror(x: number, y: number, w: number, h: number, flip: number) {
      c.save();
      roundRect(x, y, w, h, h * 0.4);
      c.fillStyle = "#06031a";
      c.fill();
      roundRect(x + 4, y + 4, w - 8, h - 8, h * 0.35);
      c.clip();
      const g = c.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, "#0a0828");
      g.addColorStop(0.5, "#6a2a9e");
      g.addColorStop(0.52, "#2a0b45");
      g.addColorStop(1, "#14052a");
      c.fillStyle = g;
      c.fillRect(x, y, w, h);
      const hz = y + h * 0.5;
      const vp = x + w * (flip > 0 ? 0.25 : 0.75);
      c.strokeStyle = "rgba(255,110,245,0.7)";
      c.lineWidth = 1;
      c.beginPath();
      const off = 1 - ((dist * 1.3) % 1);
      for (let k = 0; k < 8; k++) {
        const z = 0.6 + k - off;
        if (z <= 0.5) continue;
        const yy = hz + (h * 0.5) / z;
        c.moveTo(x, yy);
        c.lineTo(x + w, yy);
      }
      for (let i = -5; i <= 5; i++) {
        c.moveTo(vp + i * w * 0.25, y + h);
        c.lineTo(vp, hz);
      }
      c.stroke();
      if (flip < 0) {
        // carro da faixa da esquerda chegando (ou ficando pra trás) no espelho esquerdo
        for (const car of traffic) {
          if (car.z > 0.6 || car.z < -4) continue;
          const k = 1 - Math.min(1, -car.z / 4);
          headlights(vp + w * 0.08 * (1 - k) - k * w * 0.35, hz + h * 0.06 + k * h * 0.25, 3 + k * w * 0.12, 1.5 + k * h * 0.12);
        }
      }
      c.restore();
      roundRect(x, y, w, h, h * 0.4);
      neonStroke("rgba(255,61,240,A)", 1.3);
    }

    // retrovisor: a pista ficando para trás, com os faróis de quem vem atrás
    function drawMirror(t: number, steer: number) {
      const mw = Math.min(W * 0.26, 420);
      const mh = mw * 0.3;
      const mx = W / 2 - mw / 2;
      const my = H * 0.075;
      // haste presa no teto
      c.fillStyle = "#07041a";
      c.fillRect(W / 2 - 5, 0, 10, my + 4);
      c.save();
      c.translate(W / 2, my + mh / 2);
      c.rotate(steer * 0.01);
      c.translate(-W / 2, -(my + mh / 2));
      roundRect(mx, my, mw, mh, mh * 0.35);
      c.fillStyle = "#0a0620";
      c.fill();
      c.save();
      roundRect(mx + 5, my + 5, mw - 10, mh - 10, mh * 0.3);
      c.clip();
      const hz = my + mh * 0.5;
      const sky = c.createLinearGradient(0, my, 0, hz);
      sky.addColorStop(0, "#04041a");
      sky.addColorStop(1, "#7a2a9e");
      c.fillStyle = sky;
      c.fillRect(mx, my, mw, hz - my);
      for (let i = 0; i < 18; i++) {
        c.fillStyle = `rgba(255,255,255,${0.3 + 0.5 * Math.abs(Math.sin(t + i))})`;
        c.fillRect(mx + ((i * 97) % mw), my + 6 + ((i * 37) % (mh * 0.35)), 1.4, 1.4);
      }
      c.fillStyle = "#2a0b45";
      c.fillRect(mx, hz, mw, my + mh - hz);
      // grade indo embora (as linhas sobem em direção ao horizonte)
      const K = my + mh - hz;
      const vp = W / 2 + steer * mw * 0.06;
      c.beginPath();
      const off = 1 - (dist % 1);
      for (let k = 0; k < 14; k++) {
        const z = 0.55 + k - off;
        if (z <= 0.5) continue;
        const y = hz + K / z;
        c.moveTo(mx, y);
        c.lineTo(mx + mw, y);
      }
      for (let i = -12; i <= 12; i++) {
        c.moveTo(vp + i * K * 0.7, my + mh);
        c.lineTo(vp, hz);
      }
      c.strokeStyle = "rgba(255,110,245,0.75)";
      c.lineWidth = 1;
      c.stroke();
      // quem vem atrás na faixa da esquerda aparece do lado direito do espelho
      for (const car of traffic) {
        if (car.z > -0.3 || car.z < -8) continue;
        const k = 1 - -car.z / 8;
        headlights(vp + k * mw * 0.32, hz + k * K * 0.45, 3 + k * mw * 0.07, 2 + k * mh * 0.14);
      }
      // moto chegando: um farol só, costurando
      for (const b of bikes) {
        if (b.z > -0.3 || b.z < -8) continue;
        const k = 1 - -b.z / 8;
        headlights(vp - b.x * k * mw * 0.3, hz + k * K * 0.45, 0, 1.5 + k * mh * 0.1);
      }
      // reflexo do vidro
      c.fillStyle = "rgba(255,255,255,0.06)";
      c.beginPath();
      c.moveTo(mx + mw * 0.15, my);
      c.lineTo(mx + mw * 0.35, my);
      c.lineTo(mx + mw * 0.2, my + mh);
      c.lineTo(mx, my + mh);
      c.fill();
      c.restore();
      roundRect(mx, my, mw, mh, mh * 0.35);
      neonStroke("rgba(255,61,240,A)", 1.6);
      // dadinhos pendurados balançando (mais com a velocidade e nas curvas)
      const swing = Math.sin(t * 2.1) * (0.15 + speed * 0.08) + steer * 0.15 - (throttle() - braking()) * 0.25;
      c.save();
      c.translate(W / 2 + mw * 0.3, my + mh);
      c.rotate(swing);
      c.strokeStyle = "#c9b8ff";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(-10, mh * 0.55);
      c.moveTo(0, 0);
      c.lineTo(10, mh * 0.62);
      c.stroke();
      for (const [dx, dy, a] of [[-10, mh * 0.55, -0.3], [10, mh * 0.62, 0.25]]) {
        c.save();
        c.translate(dx, dy);
        c.rotate(a);
        const d = mh * 0.22;
        roundRect(-d / 2, 0, d, d, 3);
        c.fillStyle = "#ff4fb8";
        c.fill();
        c.fillStyle = "#fff";
        for (const [px, py] of [[0.3, 0.3], [0.7, 0.7], [0.5, 0.5]]) {
          c.beginPath();
          c.arc(-d / 2 + px * d, py * d, d * 0.08, 0, Math.PI * 2);
          c.fill();
        }
        c.restore();
      }
      c.restore();
      c.restore();
    }

    // mostrador analógico; red = a partir de onde o arco fica vermelho
    function drawGauge(x: number, y: number, r: number, value: number, label: string, readout: string, color: string, red = 2) {
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      const face = c.createRadialGradient(x, y - r * 0.3, r * 0.1, x, y, r);
      face.addColorStop(0, "#140a35");
      face.addColorStop(1, "#05020f");
      c.fillStyle = face;
      c.fill();
      neonStroke(`rgba(${color},A)`, 1.4);
      const a0 = Math.PI * 0.75;
      const a1 = Math.PI * 2.25;
      // marcas
      for (let i = 0; i <= 20; i++) {
        const f = i / 20;
        const a = a0 + (a1 - a0) * f;
        const big = i % 2 === 0;
        c.strokeStyle = f >= red ? "rgba(255,70,100,0.9)" : big ? "rgba(220,210,255,0.85)" : "rgba(200,190,255,0.45)";
        c.lineWidth = big ? 1.6 : 1;
        c.beginPath();
        c.moveTo(x + Math.cos(a) * r * (big ? 0.76 : 0.82), y + Math.sin(a) * r * (big ? 0.76 : 0.82));
        c.lineTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9);
        c.stroke();
      }
      if (red < 1) {
        c.beginPath();
        c.arc(x, y, r * 0.94, a0 + (a1 - a0) * red, a1);
        c.strokeStyle = "rgba(255,50,90,0.7)";
        c.lineWidth = r * 0.06;
        c.stroke();
      }
      // arco aceso até o valor
      c.beginPath();
      c.arc(x, y, r * 0.64, a0, a0 + (a1 - a0) * value);
      neonStroke(`rgba(${value >= red ? "255,60,90" : color},A)`, 2.2);
      // ponteiro
      const a = a0 + (a1 - a0) * value;
      c.beginPath();
      c.moveTo(x - Math.cos(a) * r * 0.12, y - Math.sin(a) * r * 0.12);
      c.lineTo(x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86);
      neonStroke("rgba(255,80,110,A)", 2);
      c.beginPath();
      c.arc(x, y, r * 0.08, 0, Math.PI * 2);
      c.fillStyle = "#1a0c3d";
      c.fill();
      c.fillStyle = "#e9e3ff";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.font = `700 ${Math.round(r * 0.3)}px monospace`;
      c.fillText(readout, x, y + r * 0.42);
      c.font = `600 ${Math.round(r * 0.15)}px sans-serif`;
      c.fillStyle = "rgba(200,190,255,0.8)";
      c.fillText(label, x, y + r * 0.66);
    }

    // quadro de instrumentos atrás do volante: luzes de troca, conta-giros, marcha e velocímetro
    function drawCluster(t: number) {
      const x0 = W * 0.15;
      const y0 = H * 0.64;
      const w = W * 0.3;
      const h = H * 0.15;
      // capuz do painel
      c.beginPath();
      c.moveTo(x0 - w * 0.04, y0 + h * 0.35);
      c.quadraticCurveTo(x0 - w * 0.02, y0 - h * 0.12, x0 + w * 0.12, y0 - h * 0.14);
      c.lineTo(x0 + w * 0.88, y0 - h * 0.14);
      c.quadraticCurveTo(x0 + w * 1.02, y0 - h * 0.12, x0 + w * 1.04, y0 + h * 0.35);
      c.closePath();
      c.fillStyle = "#0a0420";
      c.fill();
      neonStroke("rgba(255,61,240,A)", 1.2);
      roundRect(x0, y0, w, h, h * 0.22);
      const bg = c.createLinearGradient(0, y0, 0, y0 + h);
      bg.addColorStop(0, "#0b0626");
      bg.addColorStop(1, "#030110");
      c.fillStyle = bg;
      c.fill();
      neonStroke("rgba(95,243,255,A)", 1.2);

      // luzes de troca de marcha (acendem com o giro; piscam azul no limite)
      const n = 12;
      const lit = Math.round(Math.max(0, (rpm - 0.5) / 0.42) * n);
      const blink = rpm > 0.92 && Math.floor(t * 12) % 2 === 0;
      for (let i = 0; i < n; i++) {
        const lx = x0 + w * 0.25 + (i * w * 0.5) / (n - 1);
        const ly = y0 + h * 0.1;
        const col = blink ? "80,160,255" : i < 5 ? "80,255,140" : i < 9 ? "255,220,60" : "255,60,90";
        const on = blink || i < lit;
        c.beginPath();
        c.arc(lx, ly, Math.max(2, h * 0.032), 0, Math.PI * 2);
        c.fillStyle = on ? `rgb(${col})` : "rgba(80,70,120,0.4)";
        c.shadowColor = on ? `rgb(${col})` : "transparent";
        c.shadowBlur = on ? 10 : 0;
        c.fill();
      }
      c.shadowBlur = 0;

      const r = Math.min(h * 0.4, w * 0.15);
      const kmh = speed * 100 + (speed > 0.05 ? Math.sin(t * 3) * 0.6 : 0);
      drawGauge(x0 + w * 0.17, y0 + h * 0.56, r, Math.min(1, rpm), "RPM x1000", (rpm * 9).toFixed(1), "255,61,240", 0.8);
      drawGauge(x0 + w * 0.83, y0 + h * 0.56, r, Math.min(1, kmh / 330), "KM/H", String(Math.max(0, Math.round(kmh))), "95,243,255");

      // tela do meio: marcha grande, relógio, acelerador/freio e hodômetro
      const sx = x0 + w * 0.34;
      const sy = y0 + h * 0.2;
      const sw = w * 0.32;
      const sh = h * 0.7;
      roundRect(sx, sy, sw, sh, 6);
      c.fillStyle = "#04020f";
      c.fill();
      c.strokeStyle = "rgba(139,77,255,0.6)";
      c.lineWidth = 1;
      c.stroke();
      c.textAlign = "center";
      c.textBaseline = "middle";
      const now = new Date();
      c.font = `700 ${Math.round(sh * 0.13)}px monospace`;
      c.fillStyle = "#ff4fb8";
      c.fillText(
        `${String(now.getHours()).padStart(2, "0")}${now.getSeconds() % 2 ? ":" : " "}${String(now.getMinutes()).padStart(2, "0")}`,
        sx + sw / 2,
        sy + sh * 0.13,
      );
      const gearTxt = speed < 0.02 && !throttle() ? "N" : String(gear);
      c.font = `800 ${Math.round(sh * 0.48)}px monospace`;
      c.fillStyle = shiftFlash > 0 ? `rgba(255,255,255,${0.6 + shiftFlash * 0.4})` : "#5ff3ff";
      c.shadowColor = "#5ff3ff";
      c.shadowBlur = 12 + shiftFlash * 20;
      c.fillText(gearTxt, sx + sw / 2, sy + sh * 0.47);
      c.shadowBlur = 0;
      c.font = `600 ${Math.round(sh * 0.085)}px sans-serif`;
      c.fillStyle = "rgba(200,190,255,0.7)";
      c.fillText("MARCHA", sx + sw / 2, sy + sh * 0.72);
      // barras de acelerador (verde) e freio (vermelho)
      const bw = sw * 0.36;
      const by = sy + sh * 0.83;
      for (const [v, col, bx] of [
        [throttle(), "80,255,140", sx + sw * 0.08],
        [braking(), "255,60,90", sx + sw * 0.56],
      ] as const) {
        c.fillStyle = "rgba(80,70,120,0.4)";
        c.fillRect(bx, by, bw, sh * 0.05);
        c.fillStyle = `rgb(${col})`;
        c.fillRect(bx, by, bw * v, sh * 0.05);
      }
      c.font = `600 ${Math.round(sh * 0.075)}px monospace`;
      c.fillStyle = "rgba(200,190,255,0.55)";
      c.fillText(`ODO ${trip.toFixed(1).padStart(6, "0")} km`, sx + sw / 2, sy + sh * 0.94);
    }

    /* ---------------- traje do piloto: o sobretudo do caçador com filetes de luz ---------------- */
    // Mangas do mesmo sobretudo verde-escuro que aparece no espelho (com volume: sombreamento
    // cilíndrico + reflexo), emendas e filetes de luz ciano; luvas de couro preto.
    const SUIT = { dark: "#0b0d09", mid: "#2b3026", spec: "#56604a", line: "95,243,255" };
    const GLOVE = { dark: "#040405", mid: "#18181d", spec: "#4a4c5e" };
    // tubo afunilado de A até B (larguras wa e wb), com "plates" emendas de armadura
    function tronLimb(ax: number, ay: number, bx: number, by: number, wa: number, wb: number, plates = 2) {
      const ang = Math.atan2(by - ay, bx - ax);
      const nx = Math.cos(ang + Math.PI / 2);
      const ny = Math.sin(ang + Math.PI / 2);
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      c.beginPath();
      c.moveTo(ax + nx * wa, ay + ny * wa);
      c.lineTo(bx + nx * wb, by + ny * wb);
      c.arc(bx, by, wb, ang + Math.PI / 2, ang - Math.PI / 2, true);
      c.lineTo(ax - nx * wa, ay - ny * wa);
      c.closePath();
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      const wm = (wa + wb) / 2;
      const g = c.createLinearGradient(mx + nx * wm, my + ny * wm, mx - nx * wm, my - ny * wm);
      g.addColorStop(0, SUIT.dark);
      g.addColorStop(0.26, SUIT.mid);
      g.addColorStop(0.4, SUIT.spec);
      g.addColorStop(0.52, SUIT.mid);
      g.addColorStop(1, SUIT.dark);
      c.fillStyle = g;
      c.fill();
      // luz de contorno (como se a cidade neon iluminasse a borda)
      c.beginPath();
      c.moveTo(ax - nx * wa * 0.96, ay - ny * wa * 0.96);
      c.lineTo(bx - nx * wb * 0.96, by - ny * wb * 0.96);
      c.strokeStyle = "rgba(255,61,240,0.35)";
      c.lineWidth = 1.5;
      c.stroke();
      // emendas das placas (curvas, porque o braço é redondo)
      for (let i = 1; i <= plates; i++) {
        const f = i / (plates + 1);
        const px = ax + (bx - ax) * f;
        const py = ay + (by - ay) * f;
        const w = wa + (wb - wa) * f;
        c.beginPath();
        c.moveTo(px + nx * w, py + ny * w);
        c.quadraticCurveTo(px + dx * w * 0.35, py + dy * w * 0.35, px - nx * w, py - ny * w);
        c.strokeStyle = "rgba(0,0,0,0.7)";
        c.lineWidth = 2.5;
        c.stroke();
        c.beginPath();
        c.moveTo(px + nx * w * 0.9 + dx * 3, py + ny * w * 0.9 + dy * 3);
        c.quadraticCurveTo(px + dx * (w * 0.35 + 3), py + dy * (w * 0.35 + 3), px - nx * w * 0.9 + dx * 3, py - ny * w * 0.9 + dy * 3);
        c.strokeStyle = "rgba(120,140,200,0.35)";
        c.lineWidth = 1;
        c.stroke();
      }
      // filete de luz ao longo do braço, com um "degrau" de circuito no meio
      const o1 = 0.42;
      const k1 = 0.45;
      const k2 = 0.55;
      c.beginPath();
      c.moveTo(ax + nx * wa * o1 + dx * 4, ay + ny * wa * o1 + dy * 4);
      c.lineTo(ax + (bx - ax) * k1 + nx * wm * o1, ay + (by - ay) * k1 + ny * wm * o1);
      c.lineTo(ax + (bx - ax) * k2 + nx * wm * o1 * 0.4, ay + (by - ay) * k2 + ny * wm * o1 * 0.4);
      c.lineTo(bx + nx * wb * o1 * 0.4 - dx * wb, by + ny * wb * o1 * 0.4 - dy * wb);
      neonStroke(`rgba(${SUIT.line},A)`, 1.8);
    }
    // anel de luz no punho
    function tronCuff(x: number, y: number, ang: number, w: number) {
      c.save();
      c.translate(x, y);
      c.rotate(ang);
      c.beginPath();
      c.ellipse(0, 0, w * 0.32, w, 0, 0, Math.PI * 2);
      c.fillStyle = "#0a0d1c";
      c.fill();
      neonStroke(`rgba(${SUIT.line},A)`, 2.4);
      c.restore();
    }
    // dedo em cápsula com volume e uma linha de luz na articulação
    function tronFinger(x: number, y: number, len: number, w: number, ang: number, glow = true) {
      c.save();
      c.translate(x, y);
      c.rotate(ang);
      roundRect(0, -w / 2, len, w, w / 2);
      const g = c.createLinearGradient(0, -w / 2, 0, w / 2);
      g.addColorStop(0, GLOVE.spec);
      g.addColorStop(0.35, GLOVE.mid);
      g.addColorStop(1, GLOVE.dark);
      c.fillStyle = g;
      c.fill();
      if (glow) {
        c.beginPath();
        c.moveTo(len * 0.55, -w / 2 + 1);
        c.lineTo(len * 0.55, w / 2 - 1);
        neonStroke(`rgba(${SUIT.line},A)`, 1.2);
      }
      c.restore();
    }
    // hexágono de luz nas costas da mão
    function tronHex(x: number, y: number, r: number) {
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        if (i) c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        else c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      c.closePath();
      neonStroke(`rgba(${SUIT.line},A)`, 1.4);
    }

    // luva segurando o aro, com o antebraço vindo de baixo da tela
    function gripHand(hx: number, hy: number, a: number, wr: number, side: number) {
      const ex = hx + side * W * 0.07;
      const ey = H + wr * 0.4;
      const w0 = wr * 0.13;
      const ang = Math.atan2(hy - ey, hx - ex);
      const wx = hx - Math.cos(ang) * wr * 0.1;
      const wy = hy - Math.sin(ang) * wr * 0.1;
      tronLimb(ex, ey, wx, wy, w0 * 1.3, w0, 2);
      tronCuff(wx, wy, ang, w0 * 1.05);
      c.save();
      c.translate(hx, hy);
      c.rotate(a + Math.PI / 2); // eixo x ao longo do aro
      const L = wr * 0.2;
      // costas da mão (abaixo do aro, do nosso lado)
      c.beginPath();
      c.ellipse(0, L * 0.18, L * 0.66, L * 0.52, 0, 0, Math.PI * 2);
      const g = c.createRadialGradient(-L * 0.2, 0, L * 0.05, 0, L * 0.18, L * 0.7);
      g.addColorStop(0, GLOVE.spec);
      g.addColorStop(0.45, GLOVE.mid);
      g.addColorStop(1, GLOVE.dark);
      c.fillStyle = g;
      c.fill();
      tronHex(0, L * 0.2, L * 0.17);
      // dedos fechados por cima do aro, com um pontinho de luz em cada junta
      for (let i = 0; i < 4; i++) {
        const fx = -L * 0.45 + i * L * 0.3;
        tronFinger(fx, L * 0.05, L * 0.62, L * 0.26, -Math.PI / 2);
        c.beginPath();
        c.arc(fx, -L * 0.02, L * 0.035, 0, Math.PI * 2);
        c.fillStyle = `rgb(${SUIT.line})`;
        c.shadowColor = `rgb(${SUIT.line})`;
        c.shadowBlur = 8;
        c.fill();
        c.shadowBlur = 0;
      }
      // polegar por dentro do aro
      tronFinger(-L * 0.2, L * 0.42, L * 0.6, L * 0.24, 0.1, false);
      c.restore();
    }

    function drawWheel(steer: number) {
      const wx = W * 0.3;
      const wy = H * 1.1;
      const wr = Math.min(H * 0.26, W * 0.18);
      c.save();
      c.translate(wx, wy);
      c.rotate(Math.max(-2.2, Math.min(2.2, steer)) * 0.35);
      // aro grosso de "couro" com costura neon
      c.beginPath();
      c.arc(0, 0, wr, 0, Math.PI * 2);
      c.strokeStyle = "#0b0520";
      c.lineWidth = wr * 0.15;
      c.stroke();
      c.beginPath();
      c.arc(0, 0, wr - wr * 0.04, Math.PI * 1.05, Math.PI * 1.95);
      c.strokeStyle = "rgba(120,90,200,0.35)";
      c.lineWidth = wr * 0.03;
      c.stroke();
      c.beginPath();
      c.arc(0, 0, wr + wr * 0.075, Math.PI * 1.1, Math.PI * 1.9);
      neonStroke("rgba(95,243,255,A)", 1.4);
      // faixa de centro (meio-dia), como nos volantes de corrida
      c.beginPath();
      c.arc(0, 0, wr, Math.PI * 1.47, Math.PI * 1.53);
      c.strokeStyle = "#ff3df0";
      c.lineWidth = wr * 0.15;
      c.stroke();
      // raios
      c.fillStyle = "#0e0628";
      for (const a of [Math.PI * 1.04, Math.PI * 1.96, Math.PI * 0.5]) {
        c.save();
        c.rotate(a);
        c.beginPath();
        c.moveTo(wr * 0.2, -wr * 0.1);
        c.lineTo(wr * 0.95, -wr * 0.05);
        c.lineTo(wr * 0.95, wr * 0.05);
        c.lineTo(wr * 0.2, wr * 0.1);
        c.closePath();
        c.fill();
        c.strokeStyle = "rgba(255,61,240,0.35)";
        c.lineWidth = 1;
        c.stroke();
        c.restore();
      }
      // borboletas de troca de marcha atrás do aro (piscam ao trocar)
      for (const side of [-1, 1]) {
        c.save();
        c.rotate(side < 0 ? Math.PI * 1.17 : Math.PI * 1.83);
        roundRect(wr * 0.62, -wr * 0.05, wr * 0.22, wr * 0.1, 4);
        c.fillStyle = "#1a0c3d";
        c.fill();
        c.strokeStyle = `rgba(95,243,255,${0.35 + shiftFlash * 0.65})`;
        c.lineWidth = 1.2;
        c.stroke();
        c.restore();
      }
      // botões nos raios
      for (const [bx, by, col] of [[-0.42, -0.06, "255,61,240"], [-0.55, -0.02, "95,243,255"], [0.42, -0.06, "95,243,255"], [0.55, -0.02, "255,61,240"]] as const) {
        c.beginPath();
        c.arc(bx * wr, by * wr, wr * 0.028, 0, Math.PI * 2);
        c.fillStyle = `rgba(${col},0.85)`;
        c.fill();
      }
      // centro com emblema de pôr do sol (original)
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const px = Math.cos(a) * wr * 0.26;
        const py = Math.sin(a) * wr * 0.22;
        if (i) c.lineTo(px, py);
        else c.moveTo(px, py);
      }
      c.closePath();
      c.fillStyle = "#120830";
      c.fill();
      neonStroke("rgba(255,61,240,A)", 1.2);
      c.save();
      c.beginPath();
      c.arc(0, wr * 0.03, wr * 0.09, Math.PI, 0);
      c.closePath();
      c.clip();
      const sg = c.createLinearGradient(0, -wr * 0.06, 0, wr * 0.03);
      sg.addColorStop(0, "#ffe55a");
      sg.addColorStop(1, "#ff3df0");
      c.fillStyle = sg;
      c.fillRect(-wr * 0.1, -wr * 0.07, wr * 0.2, wr * 0.1);
      c.fillStyle = "#120830";
      for (let i = 0; i < 3; i++) c.fillRect(-wr * 0.1, -wr * 0.005 + i * wr * 0.012, wr * 0.2, wr * 0.005);
      c.restore();
      c.restore();
      // mãos no volante (10 e 2 horas), girando junto
      for (const [base, side] of [[Math.PI * 1.2, -1], [Math.PI * 1.8, 1]]) {
        const a = base + steer * 0.35;
        gripHand(wx + Math.cos(a) * wr, wy + Math.sin(a) * wr, a, wr, side);
      }
    }

    function drawCockpit(t: number, steer: number) {
      // capô em cunha visto de dentro, com faixa e emblema
      c.beginPath();
      c.moveTo(W * 0.1, H * 0.74);
      c.lineTo(W * 0.37, H * 0.6);
      c.lineTo(W * 0.63, H * 0.6);
      c.lineTo(W * 0.9, H * 0.74);
      c.closePath();
      const hood = c.createLinearGradient(0, H * 0.6, 0, H * 0.74);
      hood.addColorStop(0, "#2a1158");
      hood.addColorStop(1, "#0b0420");
      c.fillStyle = hood;
      c.fill();
      neonStroke("rgba(255,61,240,A)", 1.6);
      c.beginPath();
      c.moveTo(W * 0.43, H * 0.6);
      c.lineTo(W * 0.36, H * 0.74);
      c.moveTo(W * 0.57, H * 0.6);
      c.lineTo(W * 0.64, H * 0.74);
      c.strokeStyle = "rgba(95,243,255,0.25)";
      c.lineWidth = 1;
      c.stroke();
      // faixa dupla no meio do capô
      c.fillStyle = "rgba(255,61,240,0.18)";
      for (const s of [-1, 1]) {
        c.beginPath();
        c.moveTo(W * (0.5 + s * 0.006), H * 0.6);
        c.lineTo(W * (0.5 + s * 0.016), H * 0.6);
        c.lineTo(W * (0.5 + s * 0.045), H * 0.74);
        c.lineTo(W * (0.5 + s * 0.017), H * 0.74);
        c.closePath();
        c.fill();
      }
      // reflexo do céu correndo pelo capô (sensação de velocidade)
      c.save();
      c.beginPath();
      c.moveTo(W * 0.1, H * 0.74);
      c.lineTo(W * 0.37, H * 0.6);
      c.lineTo(W * 0.63, H * 0.6);
      c.lineTo(W * 0.9, H * 0.74);
      c.closePath();
      c.clip();
      c.globalCompositeOperation = "lighter";
      const ry = H * 0.6 + ((dist * 0.7) % 1) * H * 0.14;
      const rg = c.createLinearGradient(0, ry - 8, 0, ry + 8);
      rg.addColorStop(0, "rgba(255,120,240,0)");
      rg.addColorStop(0.5, "rgba(255,120,240,0.18)");
      rg.addColorStop(1, "rgba(255,120,240,0)");
      c.fillStyle = rg;
      c.fillRect(0, ry - 8, W, 16);
      c.restore();

      // painel
      c.beginPath();
      c.moveTo(0, H * 0.72);
      c.bezierCurveTo(W * 0.25, H * 0.66, W * 0.75, H * 0.66, W, H * 0.72);
      c.lineTo(W, H);
      c.lineTo(0, H);
      c.closePath();
      const dash = c.createLinearGradient(0, H * 0.66, 0, H);
      dash.addColorStop(0, "#1a0c3d");
      dash.addColorStop(0.25, "#0c0522");
      dash.addColorStop(1, "#040110");
      c.fillStyle = dash;
      c.fill();
      c.beginPath();
      c.moveTo(0, H * 0.72);
      c.bezierCurveTo(W * 0.25, H * 0.66, W * 0.75, H * 0.66, W, H * 0.72);
      neonStroke("rgba(95,243,255,A)", 1.6);
      // costura e friso de luz ao longo do painel
      c.beginPath();
      c.moveTo(0, H * 0.75);
      c.bezierCurveTo(W * 0.25, H * 0.69, W * 0.75, H * 0.69, W, H * 0.75);
      c.setLineDash([6, 6]);
      c.strokeStyle = "rgba(255,61,240,0.35)";
      c.lineWidth = 1;
      c.stroke();
      c.setLineDash([]);

      // colunas e teto
      c.fillStyle = "#06031a";
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(W * 0.1, 0);
      c.lineTo(W * 0.03, H * 0.73);
      c.lineTo(0, H * 0.73);
      c.closePath();
      c.fill();
      c.beginPath();
      c.moveTo(W * 0.1, 0);
      c.lineTo(W * 0.03, H * 0.73);
      neonStroke("rgba(255,61,240,A)", 1.4);
      c.beginPath();
      c.moveTo(W, 0);
      c.lineTo(W * 0.9, 0);
      c.lineTo(W * 0.97, H * 0.73);
      c.lineTo(W, H * 0.73);
      c.closePath();
      c.fill();
      c.beginPath();
      c.moveTo(W * 0.9, 0);
      c.lineTo(W * 0.97, H * 0.73);
      neonStroke("rgba(255,61,240,A)", 1.4);
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(W, 0);
      c.lineTo(W, H * 0.05);
      c.quadraticCurveTo(W / 2, H * 0.1, 0, H * 0.05);
      c.closePath();
      c.fill();
      c.beginPath();
      c.moveTo(W, H * 0.05);
      c.quadraticCurveTo(W / 2, H * 0.1, 0, H * 0.05);
      neonStroke("rgba(255,61,240,A)", 1.4);

      drawMirror(t, steer);
      const smw = Math.min(W * 0.09, 150);
      const smh = smw * 0.6;
      drawSideMirror(W * 0.008, H * 0.6, smw, smh, -1);
      drawSideMirror(W * 0.992 - smw, H * 0.6, smw, smh, 1);

      // luz ambiente do painel (pulsa com a música)
      const beat = playingRef.current ? 0.5 + 0.5 * Math.abs(Math.sin(t * Math.PI * 2.13)) : 0.35;
      c.save();
      c.globalCompositeOperation = "lighter";
      const amb = c.createLinearGradient(0, H * 0.68, 0, H * 0.8);
      amb.addColorStop(0, `rgba(139,77,255,${0.18 * beat})`);
      amb.addColorStop(1, "rgba(139,77,255,0)");
      c.fillStyle = amb;
      c.fillRect(0, H * 0.68, W, H * 0.12);
      c.restore();

      // saídas de ar à direita do rádio
      for (const vx of [0.715, 0.8]) {
        const x = W * vx;
        const y = H * 0.71;
        const vw = W * 0.07;
        const vh = H * 0.045;
        roundRect(x, y, vw, vh, 6);
        c.fillStyle = "#05020f";
        c.fill();
        neonStroke("rgba(95,243,255,A)", 1);
        c.strokeStyle = "rgba(120,110,190,0.6)";
        c.lineWidth = 1;
        c.beginPath();
        for (let i = 1; i < 4; i++) {
          c.moveTo(x + 6, y + (vh * i) / 4);
          c.lineTo(x + vw - 6, y + (vh * i) / 4);
        }
        c.stroke();
      }

      // console central (o rádio e o câmbio de verdade são botões por cima do canvas)
      c.beginPath();
      c.moveTo(W * 0.46, H);
      c.lineTo(W * 0.475, H * 0.72);
      c.lineTo(W * 0.92, H * 0.73);
      c.lineTo(W * 0.95, H);
      c.closePath();
      c.fillStyle = "rgba(6,3,20,0.55)";
      c.fill();

      // riscos de velocidade nas laterais (mais fortes quanto mais rápido)
      c.save();
      c.globalCompositeOperation = "lighter";
      for (const st of streaks) {
        st.d += 0.012 * Math.max(0.15, speed) * st.s;
        if (st.d > 1) {
          st.d = 0;
          st.a = Math.random() * Math.PI * 2;
        }
        const r0 = Math.min(W, H) * (0.35 + st.d * 0.6);
        const r1 = r0 + 30 * speed * st.s;
        const cx0 = W / 2;
        const cy0 = H * 0.45;
        const x0 = cx0 + Math.cos(st.a) * r0 * 1.6;
        const y0 = cy0 + Math.sin(st.a) * r0 * 0.6;
        if (y0 > H * 0.6 || x0 < W * 0.11 || x0 > W * 0.89 || Math.abs(x0 - cx0) < W * 0.32) continue;
        c.strokeStyle = `rgba(200,220,255,${Math.min(0.6, 0.12 * speed) * st.d})`;
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(x0, y0);
        c.lineTo(cx0 + Math.cos(st.a) * r1 * 1.6, cy0 + Math.sin(st.a) * r1 * 0.6);
        c.stroke();
      }
      c.restore();

      drawCluster(t);
      drawWheel(steer);

      // reflexo leve no para-brisa
      c.save();
      c.globalCompositeOperation = "lighter";
      const glare = c.createLinearGradient(W * 0.55, 0, W * 0.8, H * 0.6);
      glare.addColorStop(0, "rgba(255,255,255,0)");
      glare.addColorStop(0.5, "rgba(255,180,255,0.05)");
      glare.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = glare;
      c.fillRect(0, 0, W, H * 0.7);
      c.restore();
    }

    // bem rápido, as bordas escurecem e puxam pro rosa
    // riscos de velocidade saindo do ponto de fuga (mais fortes no arranque e no alto da velocidade)
    const kickLines = Array.from({ length: 70 }, () => ({ a: Math.random() * Math.PI * 2, r: Math.random(), s: 0.5 + Math.random() }));
    function speedStreaks(dt: number) {
      const v = Math.max(0, Math.min(1, (speed - 1.5) / 1.8)) * 0.8 + Math.max(0, push) * 0.5;
      if (v <= 0.02) return;
      const cx = W / 2;
      const cy = H * 0.5;
      const R = Math.hypot(W, H) * 0.6;
      c.save();
      c.globalCompositeOperation = "lighter";
      c.lineCap = "round";
      for (const p of kickLines) {
        p.r += dt * (0.4 + speed * 0.6) * p.s * (0.3 + p.r);
        if (p.r > 1.1) {
          p.r = 0.15 + Math.random() * 0.2;
          p.a = Math.random() * Math.PI * 2;
        }
        const r0 = p.r * R;
        const r1 = r0 + R * 0.08 * (0.5 + speed * 0.3) * p.s;
        const al = Math.min(1, p.r * 1.6) * v * 0.45;
        c.strokeStyle = p.s > 1.3 ? `rgba(255,120,240,${al})` : `rgba(200,240,255,${al})`;
        c.lineWidth = 0.6 + p.r * 1.6;
        c.beginPath();
        c.moveTo(cx + Math.cos(p.a) * r0, cy + Math.sin(p.a) * r0 * 0.6);
        c.lineTo(cx + Math.cos(p.a) * r1, cy + Math.sin(p.a) * r1 * 0.6);
        c.stroke();
      }
      c.restore();
    }

    function speedVignette() {
      const v = Math.max(0, Math.min(1, (speed - 1.6) / 1.4));
      if (v <= 0) return;
      const g = c.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.3, W / 2, H * 0.45, Math.max(W, H) * 0.75);
      g.addColorStop(0, "rgba(40,0,60,0)");
      g.addColorStop(1, `rgba(40,0,60,${0.55 * v})`);
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
    }

    /* ---------------- braço pra fora do teto solar (traje Tron) ---------------- */
    // ombro → cotovelo → pulso; a mão aberta "surfa" no vento com o ângulo `tilt`
    function drawArm(sx: number, sy: number, ex: number, ey: number, wx: number, wy: number, tilt: number, flip: number) {
      const w0 = Math.min(W, H) * 0.1;
      tronLimb(sx, sy, ex, ey, w0 * 0.8, w0 * 0.55, 2);
      // cotovelo com uma joelheira de luz
      const eg = c.createRadialGradient(ex - w0 * 0.15, ey - w0 * 0.15, 2, ex, ey, w0 * 0.58);
      eg.addColorStop(0, SUIT.spec);
      eg.addColorStop(0.5, SUIT.mid);
      eg.addColorStop(1, SUIT.dark);
      c.beginPath();
      c.arc(ex, ey, w0 * 0.56, 0, Math.PI * 2);
      c.fillStyle = eg;
      c.fill();
      c.beginPath();
      c.arc(ex, ey, w0 * 0.2, 0, Math.PI * 2);
      neonStroke(`rgba(${SUIT.line},A)`, 1.6);
      tronLimb(ex, ey, wx, wy, w0 * 0.46, w0 * 0.32, 1);
      const ang = Math.atan2(wy - ey, wx - ex);
      tronCuff(wx, wy, ang, w0 * 0.36);
      // luva aberta: palma com volume e dedos em cápsula
      c.save();
      c.translate(wx, wy);
      c.rotate(ang + tilt);
      c.scale(1, flip);
      c.scale(1.5, 1.5); // mão do tamanho certo pro antebraço
      const L = w0 * 1.15;
      roundRect(-w0 * 0.05, -w0 * 0.27, L * 0.5, w0 * 0.54, w0 * 0.16);
      const pg = c.createLinearGradient(0, -w0 * 0.27, 0, w0 * 0.27);
      pg.addColorStop(0, GLOVE.spec);
      pg.addColorStop(0.4, GLOVE.mid);
      pg.addColorStop(1, GLOVE.dark);
      c.fillStyle = pg;
      c.fill();
      tronHex(L * 0.2, 0, w0 * 0.12);
      for (let i = 0; i < 4; i++) {
        const fy = -w0 * 0.19 + i * w0 * 0.127;
        tronFinger(L * 0.44, fy, L * (0.5 - Math.abs(i - 1.3) * 0.06), w0 * 0.115, (i - 1.5) * 0.06);
      }
      tronFinger(L * 0.12, -w0 * 0.24, L * 0.38, w0 * 0.12, -0.6, false);
      c.restore();
    }

    /* ---------------- olhando pela janela (lado esquerdo) ---------------- */
    // a frente do carro fica à direita da tela: tudo passa da direita para a esquerda
    function drawWindowView(t: number) {
      const hz = H * 0.5;
      const K = H - hz;
      drawSky(t, hz, dist * 0.02);
      // brilho do sol lá na frente (fora da tela, à direita)
      const sg = c.createRadialGradient(W * 1.05, hz, 0, W * 1.05, hz, W * 0.55);
      sg.addColorStop(0, "rgba(255,170,60,0.55)");
      sg.addColorStop(1, "rgba(255,80,180,0)");
      c.fillStyle = sg;
      c.fillRect(0, 0, W, hz);
      const farFill = c.createLinearGradient(0, hz - H * 0.15, 0, hz);
      farFill.addColorStop(0, "#1b0f45");
      farFill.addColorStop(1, "#2a1460");
      drawRidge(FAR, hz, 1, dist * 40, 0.45, farFill);
      const nearFill = c.createLinearGradient(0, hz - H * 0.3, 0, hz);
      nearFill.addColorStop(0, "#120a30");
      nearFill.addColorStop(1, "#1d0b44");
      drawRidge(NEAR, hz, 1, dist * 110, 0.9, nearFill);
      const floor = c.createLinearGradient(0, hz, 0, H);
      floor.addColorStop(0, "#3d0f5e");
      floor.addColorStop(1, "#13031f");
      c.fillStyle = floor;
      c.fillRect(0, hz, W, K);
      // grade de lado: linhas paralelas à estrada paradas, as outras passando
      c.beginPath();
      for (let k = 0; k < 18; k++) {
        const y = hz + K / (1 + k * 0.9);
        c.moveTo(0, y);
        c.lineTo(W, y);
      }
      const sp = 0.55;
      const off = (dist * 2.2) % sp;
      for (let i = -40; i <= 40; i++) {
        const xw = i * sp - off;
        c.moveTo(W / 2 + xw * K * 1.15, H);
        c.lineTo(W / 2, hz);
      }
      c.strokeStyle = "rgba(255, 61, 240, 0.18)";
      c.lineWidth = 6;
      c.stroke();
      c.strokeStyle = "rgba(255, 110, 245, 0.9)";
      c.lineWidth = 1.4;
      c.stroke();
      drawFog(hz);
      pixelate((pctx) => drawSkyline(pctx, W, H, hz, ((dist * 40) % (W * 0.6)) - W * 0.3, t, city));
      pixelate((pctx) => drawSideStreet(pctx, W, H, hz, t, dist));
      drawRain(c, W, H, frameDt, city, 0.7, 0.9);

      // postes de neon na beira da estrada passando rapidinho (com rastro)
      const gap = W * 1.5;
      const px = W * 1.3 - ((dist * W * 0.55) % gap);
      for (const base of [px, px + gap]) {
        for (let k = 3; k >= 0; k--) {
          const x = base + k * speed * W * 0.012;
          c.globalAlpha = k ? 0.15 : 1;
          c.fillStyle = "#0a0420";
          c.fillRect(x - W * 0.008, H * 0.05, W * 0.016, hz + K * 0.35 - H * 0.05);
          c.fillRect(x - W * 0.008, H * 0.05, W * 0.09, H * 0.012);
          c.fillStyle = "#ff4fb8";
          c.shadowColor = "#ff4fb8";
          c.shadowBlur = 25;
          c.fillRect(x + W * 0.05, H * 0.062, W * 0.04, H * 0.008);
          c.shadowBlur = 0;
        }
        c.globalAlpha = 1;
      }

      // carro da faixa ao lado passando colado na janela (de perfil)
      for (const car of traffic) {
        if (car.z < -1.6 || car.z > 1.6) continue;
        drawCarSide(W / 2 + car.z * W * 0.75, H * 0.78, W * 0.95, car.pal, t);
      }
      // moto cortando pela sua janela (vem de trás, passa voando)
      for (const b of bikes) {
        if (b.z < -1.4 || b.z > 1.4) continue;
        drawBikeSide(W / 2 + b.z * W * 0.9, H * 0.645, W * 0.34, b.rgb, t); // na faixa de lá: roda rente à soleira
      }


      // porta por dentro: moldura da janela, friso neon, maçaneta e alto-falante
      c.save();
      c.beginPath();
      c.rect(0, 0, W, H);
      c.moveTo(W * 0.05, H * 0.66);
      c.lineTo(W * 0.05, H * 0.16);
      c.quadraticCurveTo(W * 0.06, H * 0.08, W * 0.16, H * 0.08);
      c.lineTo(W * 0.74, H * 0.08);
      c.quadraticCurveTo(W * 0.8, H * 0.08, W * 0.84, H * 0.2);
      c.lineTo(W * 0.95, H * 0.66);
      c.closePath();
      const door = c.createLinearGradient(0, 0, 0, H);
      door.addColorStop(0, "#0a0522");
      door.addColorStop(0.7, "#120830");
      door.addColorStop(1, "#05020f");
      c.fillStyle = door;
      c.fill("evenodd");
      c.restore();
      c.beginPath();
      c.moveTo(W * 0.05, H * 0.66);
      c.lineTo(W * 0.05, H * 0.16);
      c.quadraticCurveTo(W * 0.06, H * 0.08, W * 0.16, H * 0.08);
      c.lineTo(W * 0.74, H * 0.08);
      c.quadraticCurveTo(W * 0.8, H * 0.08, W * 0.84, H * 0.2);
      c.lineTo(W * 0.95, H * 0.66);
      neonStroke("rgba(255,61,240,A)", 1.6);
      // vidro abaixado aparecendo na soleira
      const gl = c.createLinearGradient(0, H * 0.655, 0, H * 0.68);
      gl.addColorStop(0, "rgba(160,200,255,0.5)");
      gl.addColorStop(1, "rgba(160,200,255,0)");
      c.fillStyle = gl;
      c.fillRect(W * 0.05, H * 0.655, W * 0.9, H * 0.025);
      // braço da porta
      roundRect(W * 0.02, H * 0.66, W * 0.96, H * 0.06, 10);
      c.fillStyle = "#1a0c3d";
      c.fill();
      neonStroke("rgba(95,243,255,A)", 1.2);
      // friso de luz
      c.beginPath();
      c.moveTo(W * 0.04, H * 0.8);
      c.lineTo(W * 0.96, H * 0.8);
      neonStroke("rgba(255,61,240,A)", 1.6);
      // maçaneta
      roundRect(W * 0.12, H * 0.84, W * 0.1, H * 0.03, 8);
      c.fillStyle = "#3a2a70";
      c.fill();
      neonStroke("rgba(200,190,255,A)", 1);
      // alto-falante (bate no ritmo da música)
      const bump = playingRef.current ? 1 + Math.abs(Math.sin(t * Math.PI * 2.13)) * 0.04 : 1;
      c.beginPath();
      c.arc(W * 0.8, H * 0.9, H * 0.075 * bump, 0, Math.PI * 2);
      c.fillStyle = "#05020f";
      c.fill();
      neonStroke("rgba(95,243,255,A)", 1.2);
      c.fillStyle = "rgba(139,77,255,0.5)";
      for (let i = -3; i <= 3; i++)
        for (let j = -3; j <= 3; j++) {
          if (i * i + j * j > 9) continue;
          c.fillRect(W * 0.8 + i * H * 0.018 - 1, H * 0.9 + j * H * 0.018 - 1, 2, 2);
        }
      // espelho lateral do lado de fora, perto da coluna
      const smw = Math.min(W * 0.14, 220);
      drawSideMirror(W * 0.8, H * 0.47, smw, smw * 0.6, -1);

    }

    // perfil do carro do vizinho de faixa (mesmo estilo, de lado)
    function drawCarSide(cx: number, by: number, L: number, pal: CarPalette, t: number) {
      const h = L * 0.2;
      c.save();
      c.translate(cx, by);
      c.beginPath();
      c.moveTo(-L / 2, -h * 0.25);
      c.lineTo(-L * 0.48, -h * 0.62);
      c.lineTo(-L * 0.2, -h * 0.7);
      c.lineTo(-L * 0.05, -h);
      c.lineTo(L * 0.18, -h);
      c.lineTo(L * 0.36, -h * 0.62);
      c.lineTo(L / 2, -h * 0.5);
      c.lineTo(L / 2, -h * 0.25);
      c.closePath();
      const body = c.createLinearGradient(0, -h, 0, 0);
      body.addColorStop(0, pal.body[0]);
      body.addColorStop(1, pal.body[2]);
      c.fillStyle = body;
      c.fill();
      neonStroke(`rgba(${pal.edge},A)`, 2);
      // janelas
      c.beginPath();
      c.moveTo(-L * 0.17, -h * 0.68);
      c.lineTo(-L * 0.04, -h * 0.93);
      c.lineTo(L * 0.16, -h * 0.93);
      c.lineTo(L * 0.31, -h * 0.66);
      c.closePath();
      const g = c.createLinearGradient(0, -h, 0, -h * 0.66);
      g.addColorStop(0, pal.glass[0]);
      g.addColorStop(1, pal.glass[2]);
      c.fillStyle = g;
      c.fill();
      neonStroke(`rgba(${pal.trim},A)`, 1.2);
      // asa traseira
      c.fillStyle = pal.body[2];
      c.fillRect(-L * 0.5, -h * 0.82, L * 0.09, h * 0.05);
      c.fillRect(-L * 0.45, -h * 0.82, L * 0.012, h * 0.2);
      // faixa lateral e rodas girando
      c.beginPath();
      c.moveTo(-L * 0.44, -h * 0.4);
      c.lineTo(L * 0.44, -h * 0.4);
      neonStroke(`rgba(${pal.trim},A)`, 1);
      for (const wx of [-0.31, 0.3]) {
        c.beginPath();
        c.arc(L * wx, -h * 0.2, h * 0.24, 0, Math.PI * 2);
        c.fillStyle = "#05020c";
        c.fill();
        neonStroke(`rgba(${pal.edge},A)`, 1.4);
        c.save();
        c.translate(L * wx, -h * 0.2);
        c.rotate(-t * 20);
        c.strokeStyle = `rgba(${pal.trim},0.6)`;
        c.lineWidth = 2;
        c.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          c.moveTo(0, 0);
          c.lineTo(Math.cos(a) * h * 0.18, Math.sin(a) * h * 0.18);
        }
        c.stroke();
        c.restore();
      }
      // lanterna atrás, farol na frente
      c.fillStyle = "#ff2a4f";
      c.shadowColor = "#ff2a4f";
      c.shadowBlur = 14;
      c.fillRect(-L * 0.5, -h * 0.55, L * 0.015, h * 0.14);
      c.fillStyle = "#e6f6ff";
      c.shadowColor = "#e6f6ff";
      c.fillRect(L * 0.485, -h * 0.47, L * 0.015, h * 0.1);
      c.restore();
    }

    /* ---------------- cabeça pra fora do teto solar ---------------- */
    // vento de verdade: partículas em 3D vindo da estrada e passando rente à câmera,
    // com rastro maior quanto mais rápido; de vez em quando um brilho de poeira neon
    function windAir(dt: number, vpX: number, hz: number, amount: number) {
      const F = W * 0.55;
      const camY = 1.3;
      const proj = (x: number, y: number, z: number) => [vpX + (x / z) * F, hz - ((y - camY) / z) * F] as const;
      c.save();
      c.globalCompositeOperation = "lighter";
      c.lineCap = "round";
      const v = 6 + speed * 22;
      for (const p of air) {
        p.z -= v * dt;
        if (p.z < 0.35) {
          p.z = 26 + Math.random() * 6;
          p.x = (Math.random() - 0.5) * 12;
          p.y = Math.random() * 4.5 - 0.6;
        }
        if (p.s > amount) continue;
        const tail = Math.min(6, 0.15 + speed * 0.9) * (0.6 + p.s);
        const [x1, y1] = proj(p.x, p.y, p.z);
        const [x2, y2] = proj(p.x, p.y, p.z + tail);
        const near = Math.max(0, 1 - p.z / 26);
        const glint = p.s > 0.93;
        c.strokeStyle = glint ? `rgba(255,140,240,${near * 0.9})` : `rgba(215,235,255,${near * near * 0.55})`;
        c.lineWidth = Math.min(3.5, 0.6 + 2.2 / p.z);
        c.beginPath();
        c.moveTo(x2, y2);
        c.lineTo(x1, y1);
        c.stroke();
      }
      c.restore();
    }

    // o carro visto de cima, a partir do teto solar: teto, para-brisa, capô em cunha e para-lamas
    function drawCarTop(t: number) {
      const X = (f: number) => W * f;
      const Y = (f: number) => H * f;
      const path = (pts: number[][]) => {
        c.beginPath();
        pts.forEach(([x, y], i) => (i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y))));
        c.closePath();
      };
      // luz dos faróis na pista, saindo do bico
      c.save();
      c.globalCompositeOperation = "lighter";
      const beam = driveInput.high ? 0.22 : 0.1;
      for (const s of [-1, 1]) {
        path([[0.5 + s * 0.095, 0.585], [0.5 + s * 0.012, 0.45], [0.5 + s * 0.07, 0.45], [0.5 + s * 0.2, 0.585]]);
        const g = c.createLinearGradient(0, Y(0.585), 0, Y(0.45));
        g.addColorStop(0, `rgba(220,240,255,${beam})`);
        g.addColorStop(1, "rgba(220,240,255,0)");
        c.fillStyle = g;
        c.fill();
      }
      c.restore();
      // para-lamas largos (passam por fora do capô)
      for (const s of [-1, 1]) {
        const m = (pts: number[][]) => pts.map(([x, y]) => [0.5 + s * (x - 0.5), y]);
        path(m([[0.1, 0.9], [0.17, 0.74], [0.27, 0.6], [0.35, 0.585], [0.33, 0.62], [0.29, 0.71], [0.23, 0.86]]));
        const g = c.createLinearGradient(X(0.5 + s * 0.1), 0, X(0.5 + s * 0.3), 0);
        g.addColorStop(0, "#06020f");
        g.addColorStop(1, "#2a1158");
        c.fillStyle = g;
        c.fill();
        neonStroke("rgba(255,61,240,A)", 1.6);
        // entrada de ar lateral
        path(m([[0.2, 0.8], [0.235, 0.74], [0.26, 0.745], [0.225, 0.81]]));
        c.fillStyle = "#020108";
        c.fill();
        neonStroke("rgba(95,243,255,A)", 1);
      }
      // capô em cunha, refletindo o céu
      path([[0.29, 0.71], [0.71, 0.71], [0.645, 0.585], [0.355, 0.585]]);
      const hood = c.createLinearGradient(0, Y(0.585), 0, Y(0.71));
      hood.addColorStop(0, "#5a2a9e");
      hood.addColorStop(0.35, "#2a1158");
      hood.addColorStop(1, "#0d0422");
      c.fillStyle = hood;
      c.fill();
      neonStroke("rgba(255,61,240,A)", 1.6);
      // facetas e vinco central
      c.strokeStyle = "rgba(95,243,255,0.3)";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(X(0.5), Y(0.71));
      c.lineTo(X(0.5), Y(0.585));
      c.moveTo(X(0.41), Y(0.71));
      c.lineTo(X(0.43), Y(0.585));
      c.moveTo(X(0.59), Y(0.71));
      c.lineTo(X(0.57), Y(0.585));
      c.stroke();
      // dutos NACA
      for (const s of [-1, 1]) {
        path([[0.5 + s * 0.035, 0.675], [0.5 + s * 0.07, 0.675], [0.5 + s * 0.06, 0.63], [0.5 + s * 0.045, 0.63]]);
        c.fillStyle = "#04010c";
        c.fill();
        neonStroke("rgba(95,243,255,A)", 1);
      }
      // bico com faróis em fenda
      c.beginPath();
      c.moveTo(X(0.355), Y(0.585));
      c.lineTo(X(0.645), Y(0.585));
      neonStroke("rgba(95,243,255,A)", 2);
      c.save();
      c.shadowColor = "#e6f6ff";
      c.shadowBlur = 14;
      c.fillStyle = "#e6f6ff";
      for (const s of [-1, 1]) c.fillRect(X(0.5 + s * 0.11) - (s < 0 ? X(0.04) : 0), Y(0.588), X(0.04), Y(0.006));
      c.restore();
      // reflexo do céu correndo pelo capô
      c.save();
      path([[0.29, 0.71], [0.71, 0.71], [0.645, 0.585], [0.355, 0.585]]);
      c.clip();
      c.globalCompositeOperation = "lighter";
      const ry = Y(0.585) + ((dist * 0.9) % 1) * Y(0.125);
      const rg = c.createLinearGradient(0, ry - 10, 0, ry + 10);
      rg.addColorStop(0, "rgba(255,120,240,0)");
      rg.addColorStop(0.5, "rgba(255,120,240,0.22)");
      rg.addColorStop(1, "rgba(255,120,240,0)");
      c.fillStyle = rg;
      c.fillRect(0, ry - 10, W, 20);
      c.restore();
      // para-brisa (vidro inclinado) refletindo o céu e o sol
      const glassPts = [[0.215, 0.82], [0.785, 0.82], [0.705, 0.712], [0.295, 0.712]];
      path(glassPts);
      const gl = c.createLinearGradient(0, Y(0.712), 0, Y(0.82));
      gl.addColorStop(0, "#ff7ac0");
      gl.addColorStop(0.45, "#7a2bbf");
      gl.addColorStop(1, "#141a5a");
      c.fillStyle = gl;
      c.fill();
      c.save();
      path(glassPts);
      c.clip();
      c.globalCompositeOperation = "lighter";
      for (let i = 0; i < 2; i++) {
        const sx = X(0.18 + ((dist * 0.22 + i * 0.5) % 1) * 0.7);
        c.fillStyle = "rgba(255,255,255,0.13)";
        c.beginPath();
        c.moveTo(sx, Y(0.712));
        c.lineTo(sx + X(0.05), Y(0.712));
        c.lineTo(sx - X(0.01), Y(0.82));
        c.lineTo(sx - X(0.06), Y(0.82));
        c.fill();
      }
      c.restore();
      // colunas do para-brisa (grossas, com filete neon)
      for (const s of [-1, 1]) {
        const m = (pts: number[][]) => pts.map(([x, y]) => [0.5 + s * (x - 0.5), y]);
        path(m([[0.19, 0.825], [0.235, 0.82], [0.31, 0.712], [0.285, 0.71]]));
        c.fillStyle = "#0b0420";
        c.fill();
        neonStroke("rgba(255,61,240,A)", 1.4);
        // retrovisor preso na base da coluna
        path(m([[0.285, 0.722], [0.235, 0.712], [0.22, 0.738], [0.272, 0.745]]));
        c.fillStyle = "#14072e";
        c.fill();
        neonStroke("rgba(95,243,255,A)", 1.2);
      }
      // teto (o que fica em volta do teto solar)
      path([[-0.02, 1], [0.19, 0.825], [0.81, 0.825], [1.02, 1]]);
      const rf = c.createLinearGradient(0, Y(0.825), 0, H);
      rf.addColorStop(0, "#2e1360");
      rf.addColorStop(1, "#06020f");
      c.fillStyle = rf;
      c.fill();
      neonStroke("rgba(255,61,240,A)", 1.6);
      c.save();
      path([[-0.02, 1], [0.19, 0.825], [0.81, 0.825], [1.02, 1]]);
      c.clip();
      c.globalCompositeOperation = "lighter";
      const bx = X(0.1 + ((dist * 0.3) % 1) * 0.8);
      const bg = c.createLinearGradient(bx - 60, 0, bx + 60, 0);
      bg.addColorStop(0, "rgba(160,120,255,0)");
      bg.addColorStop(0.5, "rgba(160,120,255,0.12)");
      bg.addColorStop(1, "rgba(160,120,255,0)");
      c.fillStyle = bg;
      c.fillRect(bx - 60, 0, 120, H);
      c.restore();
      // borda do teto solar aberto, bem perto da câmera (borracha + friso de luz)
      c.beginPath();
      c.moveTo(0, H);
      c.lineTo(X(0.05), Y(0.935));
      c.quadraticCurveTo(X(0.5), Y(0.9), X(0.95), Y(0.935));
      c.lineTo(W, H);
      c.closePath();
      c.fillStyle = "#04010b";
      c.fill();
      c.beginPath();
      c.moveTo(X(0.05), Y(0.935));
      c.quadraticCurveTo(X(0.5), Y(0.9), X(0.95), Y(0.935));
      neonStroke("rgba(95,243,255,A)", 2);
      void t;
    }

    // k: 0 = dentro do carro, 1 = de pé no teto solar (a câmera sobe e o interior desce)
    function drawRoofView(t: number, steer: number, k: number, dt: number) {
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const hz = H * (0.5 - 0.08 * e);
      const vpX = W / 2 - steer * W * 0.03;
      drawWorld(t, hz, steer, vpX, true, e < 0.5);
      if (e > 0.15) windAir(dt, vpX, hz, Math.min(1, (e - 0.15) / 0.5) * (0.35 + Math.min(1, speed / 2.5) * 0.65));
      // o lado de fora do carro aparece subindo de baixo
      if (e > 0.02) {
        c.save();
        c.translate(0, (1 - e) * H * 0.7);
        drawCarTop(t);
        c.restore();
      }
      // o interior do carro vai ficando pra baixo enquanto a câmera passa pelo teto
      if (e < 1) {
        c.save();
        c.translate(0, e * H * 1.1);
        drawCockpit(t, steer);
        c.restore();
      }
      // braços abertos sentindo o vento (entram pelos lados no fim da subida)
      if (e > 0.6) {
        const a = Math.min(1, (e - 0.6) / 0.4);
        const off = (1 - a) * W * 0.25;
        const wv = Math.sin(t * 1.1) * 0.12;
        const flut = Math.sin(t * 9) * Math.min(1, speed / 3) * H * 0.006;
        drawArm(W * 0.17 - off, H * 1.15, W * 0.12 - off, H * 0.82, W * 0.075 - off, H * 0.58 + Math.sin(t * 1.1) * H * 0.02 + flut, -Math.PI * 0.1 + wv, -1);
        drawArm(W * 0.83 + off, H * 1.15, W * 0.88 + off, H * 0.82, W * 0.925 + off, H * 0.58 + Math.sin(t * 1.1 + 1) * H * 0.02 - flut, Math.PI * 0.1 - wv, 1);
      }
      if (e > 0.5) speedVignette();
    }

    function frame(now: number) {
      // limite de quadros: o papel de parede a 30 por segundo e dentro do carro a 60
      // (sem isso, num monitor de 144 Hz a placa de vídeo desenhava quase 5 vezes mais que o necessário)
      if (!still && now - last < (cockpit ? 15 : 31)) {
        raf = requestAnimationFrame(frame);
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      // dentro do carro, o fundo da área de trabalho fica parado (só a vista de dentro anda)
      if (!cockpit && isDriving()) {
        raf = requestAnimationFrame(frame);
        return;
      }
      if (!cockpit) updateTraffic(dt); // o papel de parede também tem carros e motos na pista
      if (cockpit) {
        updateDrive(dt);
        updateTraffic(dt);
        if (driveInput.view !== view) {
          // janela: corte rápido; teto solar: a câmera sobe/desce (sem escurecer)
          if (view === "window" || driveInput.view === "window") fade = 1;
          view = driveInput.view;
        }
        fade = Math.max(0, fade - dt * 3.5);
        rise = Math.max(0, Math.min(1, rise + (view === "roof" ? dt : -dt) * 1.0));
      } else {
        const target = playingRef.current ? 1.35 : 0.6;
        speed += (target - speed) * Math.min(1, dt * 1.5);
        // freada de vez em quando
        brake = Math.max(0, brake - dt * 1.8);
        if (Math.random() < dt * 0.06) brake = 1;
      }
      // dentro do carro a cidade passa bem mais rápido, e cada vez mais conforme acelera
      dist += speed * dt * (cockpit ? 1.3 + speed * 0.55 : 1);
      if (cockpit && dt > 0) {
        const a = (speed - prevSpeed) / dt;
        push += (Math.max(-0.6, Math.min(1, a / 0.55)) - push) * Math.min(1, dt * 5);
      }
      prevSpeed = speed;
      frameDt = dt;

      // curvas: no papel de parede são suaves; dentro do carro a estrada serpenteia de verdade
      // (as curvas vêm mais rápido quanto mais rápido você vai) e o volante é seu
      userSteer += (driveInput.steer * 1.9 - userSteer) * Math.min(1, dt * 4.5);
      const curve = Math.sin(t * 0.33) * 0.9 + Math.sin(t * 0.11) * 0.4;
      const bend = Math.sin(dist * 0.06) * 1.25 + Math.sin(dist * 0.021 + 1.3) * 0.8 + Math.sin(dist * 0.13 + 0.4) * 0.3;
      if (cockpit) {
        // a curva te empurra pra fora; virar o volante te leva pra onde quiser (até a outra faixa)
        lat += (userSteer * 0.95 - bend * 0.32) * Math.min(speed, 3) * dt * 0.55;
        if (view === "roof") lat += (0 - lat) * dt * 0.8; // a Greta mantém o carro na faixa
        lat = Math.max(-1.45, Math.min(0.42, lat));
        // a cabeça inclina pro lado de fora da curva e na direção que você vira
        const rollTarget = -(userSteer * 0.03 + bend * 0.018) * Math.min(1, speed / 2.2);
        roll += (rollTarget - roll) * Math.min(1, dt * 3);
        // pneu cantando em curva forte com velocidade
        if (Math.abs(userSteer) > 1.1 && speed > 1.8 && t - skidAt > 1.1) {
          skidAt = t;
          skidSound(Math.min(1, (speed - 1.6) / 1.6));
        }
      }
      drawLat = cockpit ? lat : 0;
      const steer = cockpit ? bend * 0.85 + userSteer * 0.7 : curve;

      // limpa o quadro inteiro: com a câmera tremendo, nenhum pedaço do quadro anterior pode sobrar nas bordas
      c.fillStyle = "#0a0420";
      c.fillRect(0, 0, W, H);
      c.save();
      // "sobra" de imagem: amplia um pouquinho a cena pra que o tremor nunca mostre a borda vazia
      const overscan = (px: number) => {
        const k = 1 + (2 * px) / Math.min(W, H);
        c.translate(W / 2, H / 2);
        c.scale(k, k);
        c.translate(-W / 2, -H / 2);
      };
      if (cockpit && rise > 0 && view !== "window") {
        // com a cabeça pra fora, o vento balança a câmera (suave, sem tremedeira)
        const a = rise * (0.6 + speed * 1.6);
        overscan(a * 2 + 4 + Math.abs(roll) * W * 0.5);
        c.translate(W / 2, H / 2);
        c.rotate(roll * 0.7 + Math.sin(t * 1.7) * 0.004 * speed * rise);
        c.translate(-W / 2, -H / 2);
        c.translate(Math.sin(t * 13) * a + Math.sin(t * 7.3) * a * 0.6, Math.sin(t * 11.2) * a * 0.8 + Math.sin(t * 5.1) * a * 0.4);
      } else if (cockpit) {
        // trepida um pouco em alta velocidade
        const amp = Math.max(0, speed - 1.2) * (view === "front" ? 1.6 : 2.8) + Math.max(0, push) * 3;
        const lift = view === "front" ? Math.abs(push) * 14 : 0;
        if (amp > 0 || lift > 0) overscan(amp / 2 + lift + 2);
        if (amp > 0) c.translate((Math.random() - 0.5) * amp, (Math.random() - 0.5) * amp);
        // arranque: o corpo afunda no banco e o capô levanta (a vista sobe um pouco, sem encolher a imagem)
        if (view === "front" && push !== 0) c.translate(0, push * 14);
      }

      if (cockpit && view === "window") {
        drawWindowView(t);
      } else if (cockpit && rise > 0) {
        drawRoofView(t, steer, rise, dt);
      } else {
        const horizon = H * (cockpit ? 0.5 : 0.6);
        const vpX = W / 2 - steer * W * 0.03;
        if (cockpit) {
          // só o mundo inclina: o painel vai junto com você
          c.save();
          c.translate(W / 2, H * 0.5);
          c.rotate(roll);
          const k = 1 + Math.abs(roll) * 1.9;
          c.scale(k, k);
          c.translate(-W / 2, -H * 0.5);
          drawWorld(t, horizon, steer, vpX, true, cockpit);
          c.restore();
        } else drawWorld(t, horizon, steer, vpX, true, cockpit);
        if (cockpit) {
          speedStreaks(dt);
          drawCockpit(t, steer);
          speedVignette();
        } else {
          // carro (a área dele é clicável: "entrar no carro")
          const cw = Math.max(220, Math.min(W * 0.19, 360));
          const carX = W / 2 + steer * W * 0.07;
          const bump = Math.sin(t * 18 * speed) * 1.2;
          drawNeonCar(c, carX, H - 96 + bump, cw, { palette: MY_CAR, brake, t, tilt: Math.cos(t * 0.33) * 0.02 });
          carBox.x = left + carX - cw * 0.56;
          carBox.y = top + H - 96 - cw * 0.46;
          carBox.w = cw * 1.12;
          carBox.h = cw * 0.46 + 10;
        }
      }
      c.restore();
      if (fade > 0) {
        c.fillStyle = `rgba(6,3,26,${fade})`;
        c.fillRect(0, 0, W, H);
      }

      if (!still) raf = requestAnimationFrame(frame);
    }

    function start() {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    function onVisibility() {
      if (document.hidden) cancelAnimationFrame(raf);
      else start();
    }

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (still) frame(performance.now());
    });
    ro.observe(canvas);
    document.addEventListener("visibilitychange", onVisibility);
    if (still) frame(performance.now());
    else start();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [cockpit]);

  return <canvas ref={canvasRef} className="wp-canvas" aria-hidden="true" />;
}
