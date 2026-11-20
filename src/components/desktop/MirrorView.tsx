"use client";

import { useEffect, useRef } from "react";

// O retrovisor de perto: o rosto do piloto refletido, em traço de quadrinho noir. Ele é um
// caçador de recompensas cansado: cabelo castanho bagunçado caindo na testa, olhos pesados
// com olheiras, barba por fazer, cicatriz na sobrancelha, sobretudo de gola levantada com
// camisa cinza e gravata escura, e um implante de luz na têmpora. As luzes da cidade passam pelo rosto dele como faixas
// de neon, a chuva escorre no vidro de trás e as luzes da rua vão ficando pra trás.

const W = 1100;
const H = 540;
const NEON = ["255,61,240", "95,243,255", "255,170,60", "160,120,255", "255,80,110"];

export default function MirrorView({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const c = cv?.getContext("2d");
    if (!cv || !c) return;
    const face = document.createElement("canvas");
    face.width = W;
    face.height = H;
    const f = face.getContext("2d")!;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // luzes da rua lá atrás (bokeh) e gotas no vidro traseiro
    const bokeh = Array.from({ length: 26 }, () => ({ x: Math.random(), y: 0.15 + Math.random() * 0.5, r: Math.random(), col: NEON[Math.floor(Math.random() * NEON.length)] }));
    const drops = Array.from({ length: 30 }, () => ({ x: Math.random(), y: Math.random(), v: 0.03 + Math.random() * 0.08, r: 1 + Math.random() * 2.5 }));
    let band = { x: -400, col: NEON[0], v: 900 };
    let nextBand = 1.2;
    let raf = 0;
    let last = performance.now();

    function P(ctx: CanvasRenderingContext2D, d: string) {
      ctx.beginPath();
      const t = d.match(/[MLQCZ]|-?[\d.]+/g) ?? [];
      let i = 0;
      const n = () => +t[i++];
      while (i < t.length) {
        const k = t[i++];
        if (k === "M") ctx.moveTo(n(), n());
        else if (k === "L") ctx.lineTo(n(), n());
        else if (k === "Q") ctx.quadraticCurveTo(n(), n(), n(), n());
        else if (k === "C") ctx.bezierCurveTo(n(), n(), n(), n(), n(), n());
        else ctx.closePath();
      }
    }

    // Traço de quadrinho: contorno preto grosso, sombras recortadas (cel) com hachura,
    // luz ambiente esverdeada da cidade e luz rosa de neon pela lateral.
    const INK = "#140d0b";
    const SKIN = "#d9a78f";
    const SKIN_SH = "#8f6658";
    const HAIR = "#2b1c15";
    const COAT = "#2e3328";
    const COAT_SH = "#1a1e16";
    // barba por fazer: pontinhos e risquinhos fixos (sempre os mesmos)
    const STUBBLE = Array.from({ length: 1400 }, (_, i) => {
      const a = Math.sin(i * 12.9898) * 43758.5453;
      const b = Math.sin(i * 78.233) * 12345.6789;
      return [430 + (a - Math.floor(a)) * 240, 280 + (b - Math.floor(b)) * 200, (i % 3) * 0.4];
    });

    function shape(d: string, fill: string | CanvasGradient | null, lw = 3, stroke = INK) {
      P(f, d);
      if (fill) {
        f.fillStyle = fill;
        f.fill();
      }
      if (lw > 0) {
        f.strokeStyle = stroke;
        f.lineWidth = lw;
        f.lineJoin = "round";
        f.lineCap = "round";
        f.stroke();
      }
    }
    // hachura de quadrinho dentro de uma região
    function hatch(d: string, color: string, gap = 7, ang = -0.9) {
      f.save();
      P(f, d);
      f.clip();
      f.strokeStyle = color;
      f.lineWidth = 1.4;
      f.beginPath();
      const dx = Math.cos(ang) * 600;
      const dy = Math.sin(ang) * 600;
      for (let x = -300; x < W + 300; x += gap) {
        f.moveTo(x - dx, 260 - dy);
        f.lineTo(x + dx, 260 + dy);
      }
      f.stroke();
      f.restore();
    }

    function drawFace(t: number) {
      f.clearRect(0, 0, W, H);
      const sway = Math.sin(t * 0.7) * 3;
      const blink = t % 5.3 < 0.28;
      const look = Math.sin(t * 0.4) > 0.7 ? 5 : Math.sin(t * 0.4) < -0.8 ? -4 : 0;
      f.save();
      f.translate(sway, Math.sin(t * 0.5) * 2);

      /* sobretudo de gola levantada, camisa cinza e gravata escura */
      shape("M 150 540 Q 180 480 300 456 L 478 420 L 550 470 L 622 420 L 800 456 Q 920 480 950 540 Z", COAT);
      hatch("M 150 540 Q 180 480 300 456 L 400 440 Q 330 500 320 540 Z", "rgba(0,0,0,0.35)", 6);
      shape("M 505 448 L 550 494 L 595 448 L 604 540 L 496 540 Z", "#7c8079", 2.5);
      shape("M 503 444 L 528 482 L 550 474 L 522 436 Z", "#9a9e96", 2.5);
      shape("M 597 444 L 572 482 L 550 474 L 578 436 Z", "#9a9e96", 2.5);
      shape("M 538 476 L 562 476 L 558 500 L 542 500 Z", "#26292c", 2.5);
      shape("M 542 500 L 558 500 L 570 540 L 530 540 Z", "#2c3034", 2.5);
      // golas levantadas dos dois lados do pescoço
      shape("M 486 372 L 446 444 L 492 540 L 526 540 L 504 452 Z", COAT, 3);
      shape("M 614 372 L 654 444 L 608 540 L 574 540 L 596 452 Z", COAT, 3);
      shape("M 486 372 L 470 404 L 498 452 L 504 452 Z", COAT_SH, 0);
      // filetes de luz nas golas e nas lapelas (os mesmos das mangas que aparecem no volante)
      f.save();
      f.shadowColor = "#5ff3ff";
      f.shadowBlur = 8;
      f.strokeStyle = "rgba(95,243,255,0.85)";
      f.lineWidth = 2;
      P(f, "M 600 382 L 640 444 L 602 530 M 500 382 L 460 444 L 498 530");
      f.stroke();
      f.lineWidth = 1.5;
      f.strokeStyle = "rgba(95,243,255,0.5)";
      P(f, "M 330 470 Q 380 500 400 540 M 770 470 Q 720 500 700 540");
      f.stroke();
      f.restore();

      /* pescoço com a sombra do queixo */
      shape("M 506 392 Q 500 430 498 462 L 602 462 Q 600 430 594 392 Z", SKIN, 3);
      shape("M 502 404 Q 550 446 598 404 L 600 428 Q 550 458 500 428 Z", SKIN_SH, 0);
      f.strokeStyle = "rgba(20,13,11,0.5)";
      f.lineWidth = 2;
      P(f, "M 544 438 Q 550 446 556 438");
      f.stroke();

      /* orelhas */
      for (const s of [-1, 1]) {
        shape(`M ${550 + s * 118} 210 Q ${550 + s * 146} 214 ${550 + s * 142} 252 Q ${550 + s * 138} 286 ${550 + s * 116} 282 Z`, SKIN, 3);
        f.strokeStyle = "rgba(20,13,11,0.6)";
        f.lineWidth = 2;
        P(f, `M ${550 + s * 124} 228 Q ${550 + s * 136} 244 ${550 + s * 126} 268`);
        f.stroke();
      }

      /* rosto (traço anguloso, queixo forte) */
      const FACE = "M 432 150 Q 428 92 470 70 L 630 70 Q 672 92 668 150 L 664 236 Q 662 290 646 332 Q 626 384 594 412 Q 570 430 550 432 Q 530 430 506 412 Q 474 384 454 332 Q 438 290 436 236 Z";
      shape(FACE, SKIN, 0);
      // sombras recortadas: lateral esquerda, maçã do rosto, órbitas, nariz, debaixo do lábio
      const SH_SIDE = "M 434 150 L 436 236 Q 440 292 456 334 Q 474 380 506 410 Q 494 360 488 318 Q 470 300 466 252 Q 462 200 470 160 Z";
      shape(SH_SIDE, SKIN_SH, 0);
      hatch(SH_SIDE, "rgba(60,30,25,0.35)", 6);
      shape("M 646 250 Q 640 300 622 336 Q 612 320 616 290 Q 628 270 646 250 Z", "rgba(143,102,88,0.7)", 0);
      for (const s of [-1, 1]) {
        f.fillStyle = "rgba(120,80,70,0.45)";
        f.beginPath();
        f.ellipse(550 + s * 50, 214, 40, 22, 0, 0, Math.PI * 2);
        f.fill();
      }
      shape("M 532 238 Q 524 280 520 304 Q 534 316 546 310 Q 538 280 542 236 Z", SKIN_SH, 0);
      shape("M 530 380 Q 550 388 570 380 Q 562 392 550 393 Q 538 392 530 380 Z", SKIN_SH, 0);
      // barba por fazer (bochechas, queixo, buço e pescoço)
      f.save();
      P(f, "M 444 292 Q 466 376 508 412 Q 550 440 592 412 Q 634 376 656 292 Q 630 318 600 334 Q 586 346 550 344 Q 514 346 500 334 Q 470 318 444 292 Z M 516 336 Q 550 326 584 336 L 582 356 Q 550 348 518 356 Z");
      f.clip();
      for (const [x, y, o] of STUBBLE) {
        f.fillStyle = `rgba(45,30,24,${0.35 + o * 0.4})`;
        f.fillRect(x, y, 1.6, 2.6);
      }
      f.restore();
      // contorno do rosto por cima
      shape(FACE, null, 3.5);

      /* olhos cansados: pálpebra pesada, íris cinza-azulada, olheira funda */
      for (const s of [-1, 1]) {
        const ex = 550 + s * 50;
        const ey = 222;
        // olheira (sombra + duas linhas)
        shape(`M ${ex - 26} ${ey + 8} Q ${ex} ${ey + 24} ${ex + 26} ${ey + 6} Q ${ex} ${ey + 16} ${ex - 26} ${ey + 8} Z`, "rgba(110,60,70,0.55)", 0);
        f.strokeStyle = "rgba(20,13,11,0.75)";
        f.lineWidth = 2;
        P(f, `M ${ex - 24} ${ey + 12} Q ${ex} ${ey + 26} ${ex + 24} ${ey + 10}`);
        f.stroke();
        f.lineWidth = 1.3;
        P(f, `M ${ex - 18} ${ey + 22} Q ${ex} ${ey + 31} ${ex + 18} ${ey + 20}`);
        f.stroke();
        const eye = `M ${ex - 26} ${ey} Q ${ex - 4} ${ey - 13} ${ex + 26} ${ey - 1} Q ${ex + 2} ${ey + 11} ${ex - 26} ${ey} Z`;
        if (blink) {
          shape(`M ${ex - 26} ${ey} Q ${ex} ${ey + 8} ${ex + 26} ${ey - 1}`, null, 3);
        } else {
          shape(eye, "#e6ddd6", 0);
          f.save();
          P(f, eye);
          f.clip();
          f.fillStyle = "#6e8c98";
          f.beginPath();
          f.arc(ex + look, ey, 9.5, 0, Math.PI * 2);
          f.fill();
          f.strokeStyle = INK;
          f.lineWidth = 1.5;
          f.stroke();
          f.fillStyle = "#0e0a0a";
          f.beginPath();
          f.arc(ex + look, ey, 4, 0, Math.PI * 2);
          f.fill();
          f.fillStyle = "#fff";
          f.fillRect(ex + look + 2, ey - 5, 3, 3);
          // pálpebra caída cobrindo o alto da íris
          f.fillStyle = "#b98a77";
          f.fillRect(ex - 30, ey - 16, 60, 9);
          f.restore();
          // cílios de cima bem marcados
          shape(`M ${ex - 27} ${ey + 1} Q ${ex - 4} ${ey - 14} ${ex + 27} ${ey - 1}`, null, 3.5);
          shape(`M ${ex - 24} ${ey + 2} Q ${ex} ${ey + 11} ${ex + 24} ${ey}`, null, 1.5);
        }
        // vinco da pálpebra
        f.strokeStyle = "rgba(20,13,11,0.7)";
        f.lineWidth = 2;
        P(f, `M ${ex - 22} ${ey - 9} Q ${ex} ${ey - 20} ${ex + 24} ${ey - 8}`);
        f.stroke();
      }
      // sobrancelhas grossas, com a ponta de dentro levantada (cansaço, preocupação)
      shape("M 470 200 Q 492 186 530 190 L 532 197 Q 498 194 472 208 Z", HAIR, 2);
      shape("M 630 199 Q 608 186 570 190 L 568 197 Q 602 194 628 207 Z", HAIR, 2);
      f.strokeStyle = "rgba(20,13,11,0.5)";
      f.lineWidth = 1.8;
      P(f, "M 544 196 Q 548 186 544 176 M 556 196 Q 552 186 556 176");
      f.stroke();
      // cicatriz cortando a sobrancelha esquerda
      f.strokeStyle = "rgba(240,200,190,0.9)";
      f.lineWidth = 2.5;
      P(f, "M 484 176 L 494 206 L 500 236");
      f.stroke();
      // nariz
      f.strokeStyle = INK;
      f.lineWidth = 2.5;
      P(f, "M 540 232 Q 534 272 526 300 Q 524 312 536 314");
      f.stroke();
      shape("M 532 312 Q 540 306 548 314 Q 540 318 532 312 Z", "#3a221c", 0);
      shape("M 568 312 Q 576 304 584 312 Q 576 318 568 312 Z", "#3a221c", 0);
      f.strokeStyle = INK;
      f.lineWidth = 2.5;
      P(f, "M 584 312 Q 590 302 582 292");
      f.stroke();
      f.strokeStyle = "rgba(255,230,215,0.6)";
      f.lineWidth = 3;
      P(f, "M 558 250 L 562 292");
      f.stroke();
      // sulcos ao lado do nariz
      f.strokeStyle = "rgba(20,13,11,0.45)";
      f.lineWidth = 2;
      P(f, "M 516 318 Q 504 340 508 362 M 590 318 Q 602 340 598 362");
      f.stroke();
      // boca séria, cantos caídos (sem cigarro)
      shape("M 516 360 Q 534 352 550 356 Q 566 352 584 361", null, 3);
      shape("M 522 364 Q 550 380 578 364 Q 550 372 522 364 Z", "#a86a5c", 0);
      f.strokeStyle = "rgba(255,220,205,0.5)";
      f.lineWidth = 2;
      P(f, "M 538 370 Q 550 374 562 370");
      f.stroke();

      /* cabelo castanho bagunçado, franja caindo na testa */
      const HAIR_BACK = "M 414 236 Q 396 120 438 70 Q 456 34 492 30 Q 512 4 548 22 Q 580 0 610 28 Q 648 22 668 62 Q 704 116 688 236 Q 680 190 668 160 Q 664 122 646 112 L 456 112 Q 438 122 432 160 Q 420 190 414 236 Z";
      shape(HAIR_BACK, HAIR, 3.5);
      const locks = [
        "M 462 62 Q 474 118 452 166 Q 490 132 500 86 Z",
        "M 492 52 Q 510 120 488 176 Q 530 136 534 78 Z",
        "M 534 46 Q 548 112 534 156 Q 570 124 572 66 Z",
        "M 572 54 Q 598 112 592 168 Q 622 124 610 70 Z",
        "M 606 66 Q 636 112 640 158 Q 660 116 646 78 Z",
        "M 420 150 Q 404 214 420 266 Q 434 214 444 168 Z",
        "M 680 150 Q 696 214 680 266 Q 666 214 656 168 Z",
      ];
      for (const d of locks) shape(d, HAIR, 3);
      // brilhos e fios soltos
      f.strokeStyle = "#5c4232";
      f.lineWidth = 2.5;
      for (const d of ["M 470 76 Q 480 100 470 130", "M 508 66 Q 518 100 506 140", "M 552 52 Q 560 84 552 116", "M 590 62 Q 604 96 600 130", "M 450 60 Q 470 40 500 40"]) {
        P(f, d);
        f.stroke();
      }
      f.strokeStyle = "#7d8088"; // alguns fios brancos
      f.lineWidth = 1.5;
      P(f, "M 586 40 Q 596 70 590 104 M 622 52 Q 634 76 630 100");
      f.stroke();
      // implante de luz na têmpora
      f.save();
      f.shadowColor = "#5ff3ff";
      f.shadowBlur = 10;
      f.fillStyle = `rgba(95,243,255,${0.6 + Math.sin(t * 2.2) * 0.3})`;
      for (let i = 0; i < 3; i++) f.fillRect(654, 182 + i * 12, 4, 4);
      f.restore();
      f.restore();

      /* luz da cidade por cima de tudo: ambiente verde-azulado, neon rosa na lateral e a faixa passando */
      f.globalCompositeOperation = "source-atop";
      f.fillStyle = "rgba(40,140,130,0.13)";
      f.fillRect(0, 0, W, H);
      const rim = f.createLinearGradient(380, 0, 720, 0);
      rim.addColorStop(0, "rgba(95,243,255,0.22)");
      rim.addColorStop(0.4, "rgba(0,0,0,0)");
      rim.addColorStop(0.7, "rgba(0,0,0,0)");
      rim.addColorStop(1, "rgba(255,61,240,0.45)");
      f.fillStyle = rim;
      f.fillRect(0, 0, W, H);
      const bg = f.createLinearGradient(band.x - 120, 0, band.x + 120, 0);
      bg.addColorStop(0, `rgba(${band.col},0)`);
      bg.addColorStop(0.5, `rgba(${band.col},0.3)`);
      bg.addColorStop(1, `rgba(${band.col},0)`);
      f.fillStyle = bg;
      f.save();
      f.transform(1, 0, -0.35, 1, 0, 0);
      f.fillRect(band.x - 120 + 80, 0, 240, H);
      f.restore();
      f.globalCompositeOperation = "source-over";
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      band.x += band.v * dt;
      nextBand -= dt;
      if (nextBand <= 0) {
        band = { x: -300, col: NEON[Math.floor(Math.random() * NEON.length)], v: 700 + Math.random() * 600 };
        nextBand = 1.5 + Math.random() * 3;
      }
      // fundo: vidro traseiro escuro com as luzes da rua ficando pra trás
      c!.clearRect(0, 0, W, H);
      c!.save();
      c!.beginPath();
      c!.roundRect(0, 0, W, H, 130);
      c!.clip();
      const bgd = c!.createLinearGradient(0, 0, 0, H);
      bgd.addColorStop(0, "#0d0820");
      bgd.addColorStop(1, "#05030c");
      c!.fillStyle = bgd;
      c!.fillRect(0, 0, W, H);
      c!.globalCompositeOperation = "lighter";
      for (const b of bokeh) {
        b.r += dt * 0.12;
        b.x += (b.x - 0.5) * dt * 0.25;
        if (b.r > 1 || b.x < -0.1 || b.x > 1.1) {
          b.r = 0;
          b.x = 0.3 + Math.random() * 0.4;
          b.y = 0.2 + Math.random() * 0.4;
        }
        const r = 6 + b.r * 34;
        const g = c!.createRadialGradient(b.x * W, b.y * H, 0, b.x * W, b.y * H, r);
        g.addColorStop(0, `rgba(${b.col},${0.35 * (1 - b.r)})`);
        g.addColorStop(1, `rgba(${b.col},0)`);
        c!.fillStyle = g;
        c!.fillRect(b.x * W - r, b.y * H - r, r * 2, r * 2);
      }
      c!.globalCompositeOperation = "source-over";
      // encosto do banco de trás
      c!.fillStyle = "#08050f";
      c!.beginPath();
      c!.roundRect(60, 300, 240, 260, 40);
      c!.roundRect(800, 300, 240, 260, 40);
      c!.fill();
      // rosto
      drawFace(t);
      c!.drawImage(face, 0, 0);
      // gotas escorrendo no vidro
      c!.fillStyle = "rgba(200,220,255,0.18)";
      for (const d of drops) {
        d.y += d.v * dt;
        if (d.y > 1) {
          d.y = 0;
          d.x = Math.random();
        }
        c!.beginPath();
        c!.arc(d.x * W, d.y * H, d.r, 0, Math.PI * 2);
        c!.fill();
      }
      // reflexo do vidro do espelho
      c!.globalCompositeOperation = "lighter";
      const gl = c!.createLinearGradient(0, 0, W, H);
      gl.addColorStop(0, "rgba(255,255,255,0.07)");
      gl.addColorStop(0.3, "rgba(255,255,255,0)");
      gl.addColorStop(0.65, "rgba(255,255,255,0)");
      gl.addColorStop(0.7, "rgba(255,255,255,0.05)");
      gl.addColorStop(1, "rgba(255,255,255,0)");
      c!.fillStyle = gl;
      c!.fillRect(0, 0, W, H);
      c!.globalCompositeOperation = "source-over";
      // ficha no canto do vidro, tipo um HUD
      c!.fillStyle = "rgba(5,3,14,0.7)";
      c!.fillRect(110, 26, 360, 52);
      c!.font = "600 15px monospace";
      c!.fillStyle = "rgba(95,243,255,0.85)";
      c!.fillText("CAÇADOR DE RECOMPENSAS · LIC. 7731", 122, 46);
      c!.fillStyle = "rgba(255,80,110,0.9)";
      c!.fillText(`ÚLTIMA NOITE DE SONO: ${72 + (Math.floor(t / 60) % 3)}h`, 122, 68);
      c!.restore();
      // moldura
      c!.lineWidth = 14;
      c!.strokeStyle = "#0a0620";
      c!.beginPath();
      c!.roundRect(7, 7, W - 14, H - 14, 125);
      c!.stroke();
      c!.lineWidth = 2.5;
      c!.strokeStyle = "rgba(255,61,240,0.9)";
      c!.shadowColor = "#ff3df0";
      c!.shadowBlur = 16;
      c!.stroke();
      c!.shadowBlur = 0;
      if (still) cancelAnimationFrame(raf);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="sd-mirror" onClick={onClose} title="Clique pra voltar pro volante">
      <canvas ref={ref} width={W} height={H} aria-label="Seu reflexo no retrovisor" />
    </div>
  );
}
