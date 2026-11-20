"use client";

import { useEffect, useRef } from "react";
import { driveInput } from "./driveStore";
import { ALL_TALKS as TALKS, INTRO, hunterSay, readTime, talkSay, type Emo, type Line } from "./gretaTalk";

// Greta: a copiloto holográfica do Synthwave (personagem original, estilo anime cyber de fim dos anos 90).
// É desenhada em camadas (cabelo de trás, corpo, rosto, olhos, franja, fone) que se mexem em
// profundidades diferentes, depois "projetada" num holograma antigo: baixa resolução, poucas
// cores com pontilhado, grade de pixels, linhas tremendo e a imagem subindo do painel.
// Ela é a companheira (e a única amiga) de um caçador de recompensas cansado, que se afunda no
// trabalho pra esquecer o que dói; ela é a amiga preocupada. Fala só por legenda, conversa com ele
// (as respostas dele aparecem em outra legenda) e muda de expressão conforme o que sente:
// preocupada, triste, sorrindo, rindo, surpresa, brava, piscando...
// Depois de alguns segundos ela diz a frase de entrada; com o rádio tocando ela dança no ritmo
// (cabeça, cabelo, olhinhos fechados, notas musicais) e comenta cada música com uma curiosidade
// do artista. Também reage quando você se olha no espelho, pausa o rádio ou corre demais.
// Clicar nela faz ela comentar a música que está tocando; o botão de estilo troca as cores.

export const HOLO_PHRASE = "Você parece tão solitário.";

const W = 680;
const H = 500;
const LW = 170; // resolução do "projetor"
const LH = 130;
const LINE = "#3a1d66";
const SKIN = "#ffeef3";
const SKIN2 = "#f6cfe0";
const PAL = [
  { h1: "#ff7ad9", h2: "#8f6bff", hl: "#ffd6f5", iris1: "#4b2a9a", iris2: "#5ff3ff", jk: "#14254a", neon: "#5ff3ff", glow: "95,243,255" },
  { h1: "#6fe8ff", h2: "#4f6bff", hl: "#e0fbff", iris1: "#7a1f6a", iris2: "#ff7ad9", jk: "#2a1450", neon: "#ff7ad9", glow: "255,122,217" },
];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);
const RAMPS = [
  [[6, 10, 30], [20, 60, 110], [40, 150, 200], [95, 243, 255], [220, 255, 255]],
  [[20, 6, 30], [90, 20, 110], [200, 60, 190], [255, 122, 217], [255, 225, 250]],
];
const RETRO = [
  [8, 6, 26], [40, 24, 80], [255, 122, 217], [143, 107, 255], [95, 243, 255], [255, 238, 243],
  [246, 207, 224], [58, 29, 102], [20, 37, 74], [255, 255, 255], [168, 50, 95], [75, 42, 154],
];

type Pose = {
  sy: number;
  tilt: number;
  breath: number;
  blink: number;
  look: number;
  mouth: number;
  sway: number;
  happy: boolean;
  dance: number;
  emo: Emo;
  talking: boolean;
};

// como cada expressão mexe no rosto: sobrancelha (canto de dentro / de fora; negativo = sobe),
// pálpebra caída, tamanho da pupila, boca e quanto ela cora
const FACE: Record<Emo, { bi: number; bo: number; lid: number; pupil: number; mouth: string; blush: number }> = {
  neutral: { bi: 0, bo: 0, lid: 0, pupil: 1, mouth: "soft", blush: 0.5 },
  soft: { bi: -3, bo: 1, lid: 0.22, pupil: 1.05, mouth: "soft", blush: 0.85 },
  smile: { bi: -3, bo: -3, lid: 0.08, pupil: 1, mouth: "smile", blush: 0.8 },
  happy: { bi: -6, bo: -6, lid: 0, pupil: 1, mouth: "grin", blush: 1 },
  worried: { bi: -10, bo: 4, lid: 0.08, pupil: 0.9, mouth: "wavy", blush: 0.4 },
  sad: { bi: -8, bo: 6, lid: 0.32, pupil: 1.1, mouth: "frown", blush: 0.45 },
  surprised: { bi: -12, bo: -10, lid: 0, pupil: 0.6, mouth: "o", blush: 0.5 },
  annoyed: { bi: 7, bo: -4, lid: 0.42, pupil: 0.9, mouth: "pout", blush: 0.6 },
  wink: { bi: -4, bo: -4, lid: 0, pupil: 1, mouth: "smile", blush: 0.9 },
};
type Track = { id: string; title: string; artist: string } | null | undefined;

// Uma curiosidade (verdadeira) por música da Nightdrive FM, no jeito dela de falar.
// Chave: "Artista|Título" (ou só "Artista", vale pra qualquer música dele).
const SONG_LINES: Record<string, string> = {
  "Whitesnake|Is This Love": "Sabia que essa foi escrita pra Tina Turner? A gravadora ouviu e não deixou ela ir embora.",
  "Billy Idol|Eyes Without A Face": "O nome vem de um filme de terror francês, 'Les Yeux sans visage'. Combina com o seu rosto hoje.",
  "Duran Duran|Save a Prayer": "O clipe foi gravado no Sri Lanka. Um dia eu queria te ver num lugar quente assim, caçador.",
  "Duran Duran|Ordinary World": "O Simon Le Bon escreveu pensando num amigo que perdeu. Tentar voltar pro mundo normal... eu entendo.",
  "Bronski Beat|Smalltown Boy": "Um garoto fugindo da cidade pequena pra poder ser quem é. Todo mundo aqui fugiu de alguma coisa.",
  "Cutting Crew|(I Just) Died In Your Arms": "Primeiro lugar nos EUA em 87. Parece alguém pedindo desculpa pro próprio passado.",
  "Berlin|Take My Breath Away": "Trilha de Top Gun. Ganhou o Oscar de melhor canção... e ainda me tira o ar, mesmo sem pulmão.",
  "Foreigner|I Want to Know What Love Is": "Esse coral é gospel, de Nova Jersey. Eu não tenho pele, mas juro que arrepia.",
  "Tears For Fears|Everybody Wants To Rule The World": "Quase ficou fora do disco. Gravaram por último, em uma semana. O melhor às vezes vem no cansaço.",
  "Alphaville|Big in Japan": "Primeiro single do Alphaville, uma banda alemã. Aqui em Neo-Tóquio isso deve ter tocado até gastar.",
  "Alphaville|Forever Young": "'Forever Young'... eu nunca envelheço. Você é que precisa dormir, caçador.",
  "Depeche Mode|Enjoy the Silence": "Era uma balada lenta até a banda acelerar tudo. Às vezes até o silêncio precisa de um empurrão.",
  "Ace of Base|Happy Nation": "Ace of Base, de Gotemburgo, na Suécia. Batida alegre com letra pesada... igual a essa cidade.",
  "Journey|Separate Ways (Worlds Apart)": "No clipe eles tocam instrumentos invisíveis num cais. Você faz igual quando acha que eu não tô vendo.",
  "A Flock Of Seagulls|I Ran (So Far Away)": "O cabelo do vocalista ficou mais famoso que a música. Correr pra longe... a gente sabe como é.",
  "Daryl Hall & John Oates|Out of Touch": "Foi o último número um deles nos EUA. 'Fora de alcance'. Às vezes você fica assim comigo.",
  "La Bouche|Be My Lover": "A voz é da Melanie Thornton. Ela partiu cedo, em 2001. A música continua aqui, dançando por ela.",
  "Laura Branigan|Self Control": "É versão de uma música italiana do Raf. Fala da noite engolindo a gente... conhece a sensação?",
  "Scorpions|Wind Of Change": "Escreveram sobre o fim da Guerra Fria. E esse assobio é do próprio vocalista, o Klaus Meine.",
  "Prince|Purple Rain": "O Prince mandou essa pra Stevie Nicks escrever a letra. Ela achou grande demais e recusou. Ainda bem que ele mesmo terminou.",
  "a-ha|Take On Me": "Lançaram duas vezes e ninguém ligou. Na terceira, com o clipe desenhado a lápis, virou o mundo. Insistência às vezes funciona.",
  "Kate Bush|Running Up That Hill": "A Kate Bush queria chamar de 'A Deal with God'. É sobre trocar de lugar com quem você ama pra entender a dor do outro.",
  "Eurythmics|Sweet Dreams (Are Made of This)": "A Annie Lennox e o Dave Stewart gravaram isso num estúdio improvisado, quase sem dinheiro, logo depois da banda deles acabar.",
  "Tears For Fears|Mad World": "Essa é a original, animadinha. A versão triste veio em 2001, no filme Donnie Darko. Aposto que você prefere aquela.",
  "The Cure|Just Like Heaven": "O Robert Smith escreveu lembrando de uma noite no mar com a Mary, que virou esposa dele. Todo mundo precisa de uma lembrança assim.",
  "Simple Minds|Don't You (Forget About Me)": "Fizeram pro filme Clube dos Cinco, e o Simple Minds quase recusou. Às vezes o melhor é aquilo que a gente quase diz não.",
  "Bonnie Tyler|Total Eclipse of the Heart": "O Jim Steinman, que escreveu, dizia que pensou num musical de vampiros. Combina com quem só sai de noite, né, caçador?",
  "Cyndi Lauper|Time After Time": "O nome veio de um filme que ela viu listado no guia de TV. É uma promessa de estar lá sempre que o outro cair. Igual a mim.",
  "Duran Duran|Hungry Like the Wolf": "Gravaram o clipe no Sri Lanka, na mesma viagem de Save a Prayer. Duas músicas, uma ilha, nenhum descanso. Parece você.",
  "Tears For Fears|Shout": "O nome da banda vem de um livro sobre a terapia do grito primal. Às vezes gritar resolve mais que café, caçador.",
  "Pet Shop Boys|West End Girls": "O Neil Tennant era jornalista de revista de música antes disso. E se inspirou num poema do T.S. Eliot. Viu? Dá pra recomeçar.",
  "The Police|Every Breath You Take": "Todo mundo toca em casamento, mas o Sting diz que é sobre obsessão e vigilância. Não é música de amor. É música de caçador.",
  "Phil Collins|In The Air Tonight": "Ele escreveu no meio do divórcio. Aquela história de alguém se afogando é lenda. A dor era só dele mesmo.",
  "Toto|Africa": "O tecladista escreveu sem nunca ter pisado na África, só imaginando por documentários. Às vezes a saudade é de um lugar que a gente nem conhece.",
  "Whitney Houston|I Wanna Dance With Somebody": "Parece festa, mas a letra é sobre solidão: querer alguém que te ame quando a noite cai. Te lembra alguém?",
  "George Michael|Careless Whisper": "O George Michael escreveu isso com dezessete anos, dentro de um ônibus. E esse saxofone... eu não tenho pulmão e mesmo assim prendo o ar.",
  "Dead Or Alive|You Spin Me Round (Like a Record)": "Foi o primeiro número um no Reino Unido do trio de produtores Stock Aitken Waterman. A cidade girando igual disco... sente?",
  "The Human League|Don't You Want Me": "O vocalista achava essa a mais fraca do disco. Virou o maior sucesso deles. Você também se acha pior do que é.",
  "Sade|Kiss Of Life": "Ah, como eu amo Sade e esse soul macio... parece que toca direto na alma. A Sade Adu nasceu na Nigéria.",
};
function songLine(track: { title: string; artist: string }) {
  return SONG_LINES[`${track.artist}|${track.title}`] ?? SONG_LINES[track.artist] ?? null;
}
// quando ele se olha no espelho
const MIRROR_LINES = [
  "Você tá com cara de quem não dorme há três noites.",
  "Essa cicatriz ainda dói quando chove?",
  "Olha pra frente, caçador. O passado fica no retrovisor.",
  "Pode até esconder do mundo. De mim não esconde esse cansaço.",
];
const PAUSE_LINES = ["Deixa tocar... o silêncio dessa cidade pesa demais."];
const SPEED_LINES = [
  "Devagar, caçador. Nenhuma recompensa vale a sua vida.",
  "Ei! Correr não faz a dor ficar pra trás, sabia?",
];
const ROOF_LINES = ["Deixa comigo. Respira um pouco, vai.", "Viu? O mundo continua lá fora. E é bonito."];
const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];

// a primeira conversa ("Você parece tão solitário." / "Só cansado, Greta.") só acontece uma vez;
// nas outras vezes que ele entra no carro ela só dá as boas-vindas
const BACK_LINES = [
  "Voltou. Eu sabia que você voltava.",
  "De volta à estrada, caçador?",
  "Senti sua falta. Pra uma IA, dez minutos é uma eternidade.",
  "Cinto, música, cidade. Bora.",
  "Oi de novo. Já escolhi a próxima música.",
];
let metHunter = false;
function alreadyMet() {
  if (metHunter) return true;
  try {
    metHunter = localStorage.getItem("greta-conheceu-cacador") === "1";
  } catch {}
  return metHunter;
}
function markMet() {
  metHunter = true;
  try {
    localStorage.setItem("greta-conheceu-cacador", "1");
  } catch {}
}

export default function HoloGirl({ playing, track }: { playing: boolean; track?: Track }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const playingRef = useRef(playing);
  const trackRef = useRef(track);
  const commented = useRef<string | null>(null); // última música que ela já comentou
  useEffect(() => {
    trackRef.current = track;
  }, [track]);
  const ctl = useRef({
    mode: 1,
    start: 0,
    line: HOLO_PHRASE, // o que ela está falando (legenda)
    subStart: -1,
    until: 0, // até quando a boca mexe
    lastTalk: -1e9,
    emo: "soft" as Emo, // expressão atual
    emoUntil: 0,
    busy: false, // no meio de uma conversa
    talk: Math.floor(Math.random() * 6) * 2, // sempre começa por uma conversa de teimosia
  });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // fala uma linha (só legenda, sem voz); a boca mexe no tempo de "ler" a frase
  const say = useRef((text: string, emo: Emo = "smile") => {
    const k = ctl.current;
    const now = performance.now();
    k.line = text;
    k.subStart = now;
    k.lastTalk = now;
    k.until = now + 500 + text.length * 55;
    k.emo = emo;
    k.emoUntil = now + readTime(text) + 3500;
    talkSay("g", text);
  }).current;

  // uma conversa: falas dela no holograma, as dele na legenda do caçador, uma depois da outra
  const play = useRef((lines: Line[]) => {
    const k = ctl.current;
    k.busy = true;
    let at = 0;
    for (const ln of lines) {
      timers.current.push(
        setTimeout(() => {
          if (ln.who === "g") say(ln.text, ln.emo ?? "soft");
          else {
            hunterSay(ln.text);
            k.lastTalk = performance.now();
            // enquanto ele fala, ela olha pra ele e escuta (expressão de quem se importa)
            k.emo = k.emo === "happy" ? "smile" : "worried";
            k.emoUntil = performance.now() + readTime(ln.text);
          }
        }, at),
      );
      at += readTime(ln.text) + 500;
    }
    timers.current.push(setTimeout(() => (k.busy = false), at));
  }).current;
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  // reações à música: comenta quando troca de faixa ou quando o som volta, reclama quando para
  const lastTrack = useRef<string | null>(null);
  const wasPlaying = useRef(playing);
  useEffect(() => {
    const k = ctl.current;
    const intro = k.subStart < 0; // ainda não falou a frase de entrada
    let timer: ReturnType<typeof setTimeout> | undefined;
    const quiet = () => performance.now() - k.lastTalk > 12000;
    const line = track ? songLine(track) : null;
    if (playing && track && track.id !== lastTrack.current && !intro && line) {
      timer = setTimeout(() => {
        if (k.busy) return; // não corta a conversa
        commented.current = track.id;
        say(line, "happy");
      }, 7500); // depois do locutor anunciar a música
    } else if (playing && !wasPlaying.current && !intro && quiet() && line) {
      timer = setTimeout(() => !k.busy && say(line, "smile"), 1800);
    } else if (!playing && wasPlaying.current && !intro && Math.random() < 0.4 && quiet()) {
      timer = setTimeout(() => !k.busy && say(pick(PAUSE_LINES), "sad"), 900);
    }
    if (track) lastTrack.current = track.id;
    wasPlaying.current = playing;
    return () => clearTimeout(timer);
  }, [playing, track, say]);

  useEffect(() => {
    const cv = ref.current;
    const c = cv?.getContext("2d");
    if (!cv || !c) return;
    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    const o = off.getContext("2d")!;
    const low = document.createElement("canvas");
    low.width = LW;
    low.height = LH;
    const l = low.getContext("2d", { willReadFrequently: true })!;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ctl.current.start = performance.now();
    let raf = 0;
    let S: Pose = { sy: 0, tilt: 0, breath: 0, blink: 1, look: 0, mouth: 0, sway: 0, happy: false, dance: 0, emo: "soft", talking: false };
    let fast = 0; // tempo em alta velocidade
    let lastView = driveInput.view;
    let introDone = false;
    let pal = 0;

    function P(path: string) {
      o.beginPath();
      const t = path.match(/[MLCQZ]|-?[\d.]+/g) ?? [];
      let i = 0;
      const n = () => +t[i++];
      while (i < t.length) {
        const k = t[i++];
        if (k === "M") o.moveTo(n(), n());
        else if (k === "L") o.lineTo(n(), n());
        else if (k === "Q") o.quadraticCurveTo(n(), n(), n(), n());
        else if (k === "C") o.bezierCurveTo(n(), n(), n(), n(), n(), n());
        else if (k === "Z") o.closePath();
      }
    }
    function fs(fill?: string | CanvasGradient | null, stroke?: string | null, w = 2) {
      if (fill) {
        o.fillStyle = fill;
        o.fill();
      }
      if (stroke) {
        o.strokeStyle = stroke;
        o.lineWidth = w;
        o.stroke();
      }
    }
    // cada camada se desloca conforme a profundidade (d) quando ela vira o rosto
    function layer(d: number, head: boolean, fn: () => void) {
      o.save();
      o.translate(340 + d * S.sy, 215 + (head ? S.breath * 0.6 : S.breath));
      if (head) {
        o.translate(0, 95);
        o.rotate(S.tilt);
        o.translate(0, -95);
      }
      o.scale(1 - 0.12 * Math.abs(S.sy), 1);
      fn();
      o.restore();
    }
    function eye(side: number) {
      o.save();
      o.translate(side * 35, 2);
      o.scale(side * 1.2, 1.2);
      const F = FACE[S.emo];
      // piscadinha: o olho da direita fecha num "^"
      if (S.happy || (S.emo === "happy" && !S.talking) || (S.emo === "wink" && side === 1)) {
        // olhinhos fechados de felicidade (^ ^) curtindo a música
        P("M -17 6 Q 0 -12 19 4");
        fs(null, LINE, 3.6);
        o.restore();
        return;
      }
      if (S.blink < 0.15) {
        P("M -18 2 Q 0 10 20 -2");
        fs(null, LINE, 3.2);
        o.restore();
        return;
      }
      const shape = "M -18 -6 Q 0 -21 19 -11 L 17 15 Q 0 24 -16 14 Z";
      P(shape);
      fs("#ffffff");
      o.save();
      P(shape);
      o.clip();
      const g = o.createLinearGradient(0, -14, 0, 22);
      g.addColorStop(0, PAL[pal].iris1);
      g.addColorStop(1, PAL[pal].iris2);
      o.beginPath();
      o.ellipse(S.look, 4, 12.5, 17, 0, 0, 7);
      fs(g, LINE, 1.5);
      o.beginPath();
      o.ellipse(S.look, 6, 5.5 * F.pupil, 8.5 * F.pupil, 0, 0, 7);
      fs("#1b0d3a");
      o.beginPath();
      o.arc(S.look - 5, -3, 4.6, 0, 7);
      fs("#fff");
      o.beginPath();
      o.arc(S.look + 5, 11, 2, 0, 7);
      fs("#fff");
      o.fillStyle = "rgba(58,29,102,.25)";
      o.fillRect(-20, -22, 42, 9);
      // pálpebra caindo (cansaço, tristeza, bronca)
      const lid = F.lid + (1 - S.blink) * 0;
      if (lid > 0) {
        o.fillStyle = SKIN;
        o.fillRect(-24, -26, 50, 6 + lid * 34);
      }
      o.restore();
      o.save();
      o.translate(0, lid * 30);
      P("M -20 -3 Q -3 -24 21 -13 L 26 -18 L 24 -9 Q 2 -18 -18 1 Z");
      fs(LINE);
      o.restore();
      P("M -11 18 Q 3 22 14 15");
      fs(null, LINE, 1.4);
      o.restore();
    }

    function draw(t: number) {
      const p = PAL[pal];
      o.clearRect(0, 0, W, H);
      o.lineJoin = "round";
      o.lineCap = "round";
      const sw = S.sway;
      // cabelo de trás
      layer(-34, true, () => {
        const g = o.createLinearGradient(0, -140, 0, 160);
        g.addColorStop(0, p.h1);
        g.addColorStop(1, p.h2);
        P(`M -94 -60 C -112 -150 112 -150 94 -60 C 108 10 112 90 ${104 + sw} 152 L 66 150 C 70 100 68 60 58 40 L -58 40 C -68 60 -70 100 -66 150 L ${-104 + sw} 152 C -112 90 -108 10 -94 -60 Z`);
        fs(g, LINE, 2.2);
      });
      // pescoço ligado aos ombros, jaqueta de gola alta e choker
      layer(-8, false, () => {
        P("M -23 60 L -25 128 C -27 150 -60 160 -138 174 C -174 184 -190 214 -196 290 L 196 290 C 190 214 174 184 138 174 C 60 160 27 150 25 128 L 23 60 Z");
        fs(SKIN, LINE, 2.2);
        P("M -23 104 C -10 116 10 116 23 104 L 24 118 C 10 126 -10 126 -24 118 Z");
        fs(SKIN2);
        P("M -30 152 Q 0 178 30 152 L 40 290 L -40 290 Z");
        fs("#1b1035", LINE, 2);
        for (const s of [-1, 1]) {
          o.save();
          o.scale(s, 1);
          P("M 196 292 C 190 214 172 184 134 172 L 62 152 L 50 112 L 30 150 L 14 292 Z");
          fs(p.jk, LINE, 2.2);
          P("M 62 152 L 50 112 L 30 150");
          fs(null, p.neon, 2.5);
          P("M 150 186 L 120 292");
          fs(null, p.neon, 2);
          o.restore();
        }
        P("M -26 126 C -10 134 10 134 26 126 L 26 136 C 10 144 -10 144 -26 136 Z");
        fs("#1b1035", LINE, 1.5);
        o.beginPath();
        o.arc(0, 138, 4.5, 0, 7);
        fs(p.neon);
      });
      // rosto e orelhas
      layer(0, true, () => {
        P("M -74 -40 C -76 10 -62 52 -36 78 C -20 92 -8 98 0 100 C 8 98 20 92 36 78 C 62 52 76 10 74 -40 C 70 -100 -70 -100 -74 -40 Z");
        fs(SKIN, LINE, 2.4);
        for (const s of [-1, 1]) {
          o.beginPath();
          o.ellipse(s * 76, 8, 7, 13, 0, 0, 7);
          fs(SKIN, LINE, 1.8);
        }
        P("M -82 -6 C -90 -150 90 -150 82 -6");
        fs(null, "#2a2440", 5);
      });
      // olhos, nariz, boca, blush e o código de barras
      layer(10, true, () => {
        const F = FACE[S.emo];
        eye(1);
        eye(-1);
        P("M 3 26 L 5 33");
        fs(null, LINE, 1.6);
        if (S.mouth > 0.05) {
          // falando: a boca abre, mas mantém o "jeito" da emoção nos cantos
          const up = F.mouth === "smile" || F.mouth === "grin" ? -2 : F.mouth === "frown" ? 2 : 0;
          o.beginPath();
          o.ellipse(0, 57, 7 + (up < 0 ? 2 : 0), 3 + S.mouth * 5, 0, 0, 7);
          fs("#a8325f", LINE, 1.6);
          o.beginPath();
          o.ellipse(0, 59 + S.mouth * 3, 4, 1.5 + S.mouth * 1.5, 0, 0, 7);
          fs("#ff8fb0");
          if (up) {
            P(`M -11 ${55 + up} L -8 56 M 11 ${55 + up} L 8 56`);
            fs(null, LINE, 1.6);
          }
        } else if (F.mouth === "grin") {
          P("M -13 52 Q 0 68 13 52 Q 0 56 -13 52 Z");
          fs("#a8325f", LINE, 1.8);
          P("M -6 60 Q 0 64 6 60 Q 0 58 -6 60 Z");
          fs("#ff8fb0");
        } else if (F.mouth === "o") {
          o.beginPath();
          o.ellipse(0, 58, 4.5, 6, 0, 0, 7);
          fs("#a8325f", LINE, 1.6);
        } else {
          const path: Record<string, string> = {
            soft: "M -7 55 Q 0 59 7 55",
            smile: "M -10 53 Q 0 62 10 53",
            frown: "M -8 59 Q 0 53 8 59",
            wavy: "M -9 57 Q -4 54 0 57 Q 4 60 9 56",
            pout: "M -6 57 Q 0 55 7 56",
          };
          P(path[F.mouth] ?? path.soft);
          fs(null, LINE, 1.9);
        }
        // lágrima (triste) e gotinha de suor de anime (preocupada / brava)
        if (S.emo === "sad") {
          const u = (performance.now() / 2600) % 1;
          o.beginPath();
          o.ellipse(-46, 30 + u * 34, 5, 7, 0, 0, 7);
          fs(`rgba(150,230,255,${1 - u})`, LINE, 1.2);
        }
        if (S.emo === "worried" || S.emo === "annoyed") {
          P("M 66 -50 Q 54 -30 66 -24 Q 78 -30 66 -50 Z");
          fs("#bff4ff", LINE, 1.4);
        }
        if (F.blush > 0.75) {
          for (const sd of [-1, 1]) {
            o.beginPath();
            o.ellipse(sd * 44, 34, 16, 7, 0, 0, 7);
            fs(`rgba(255,110,160,${(F.blush - 0.6) * 0.8})`);
          }
        }
        o.strokeStyle = `rgba(255,90,150,${0.6 * F.blush})`;
        o.lineWidth = 1.6;
        for (const s of [-1, 1])
          for (let i = 0; i < 3; i++) {
            o.beginPath();
            o.moveTo(s * (36 + i * 7) - 3, 36);
            o.lineTo(s * (36 + i * 7) + 3, 30);
            o.stroke();
          }
        o.fillStyle = p.neon;
        for (let i = 0; i < 3; i++) o.fillRect(54 + i * 4, 20, 2, 7 + (i % 2) * 3);
      });
      // franja, fiozinho em pé, mechas da frente e sobrancelhas
      layer(22, true, () => {
        const g = o.createLinearGradient(0, -140, 0, 0);
        g.addColorStop(0, p.h1);
        g.addColorStop(1, p.h2);
        P("M -90 -44 C -98 -124 -40 -146 0 -144 C 40 -146 98 -124 90 -44 Q 86 -26 80 -12 Q 76 -36 66 -50 Q 64 -36 56 -24 Q 54 -44 44 -58 Q 38 -42 26 -28 Q 22 -48 12 -60 Q 8 -42 -4 -26 Q -10 -46 -20 -60 Q -26 -44 -36 -30 Q -40 -48 -50 -58 Q -56 -40 -64 -24 Q -66 -40 -74 -52 Q -80 -32 -82 -12 Z");
        fs(g, LINE, 2.4);
        P("M -2 -142 C 10 -176 34 -172 28 -152 C 22 -162 10 -160 6 -142");
        fs(p.h1, LINE, 2);
        o.setLineDash([16, 10]);
        P("M -62 -100 Q 0 -126 62 -100");
        fs(null, p.hl, 5);
        o.setLineDash([]);
        for (const x of [-1, 1]) {
          P(`M ${x * 86} -40 C ${x * 100} 10 ${x * 98} 70 ${x * 88 + sw} 118 C ${x * 84 + sw} 138 ${x * 76 + sw} 156 ${x * 70 + sw * 1.2} 166 C ${x * 70} 132 ${x * 66} 80 ${x * 62} 40 C ${x * 60} 8 ${x * 62} -18 ${x * 68} -42 Z`);
          fs(g, LINE, 2.2);
          P(`M ${x * 80} -10 C ${x * 86} 40 ${x * 82} 90 ${x * 76 + sw} 140`);
          fs(null, p.hl, 1.5);
        }
        // sobrancelhas por cima da franja (jeito anime): é aqui que mora a expressão
        const F = FACE[S.emo];
        for (const sd of [-1, 1]) {
          const yi = -50 + F.bi * 1.9;
          const yo = -49 + F.bo * 1.9;
          const path = `M ${sd * 18} ${yi} Q ${sd * 38} ${Math.min(yi, yo) - 8} ${sd * 58} ${yo}`;
          P(path);
          fs(null, "#1b0d3a", 7);
        }
      });
      // fone com antena e microfone
      layer(28, true, () => {
        for (const s of [-1, 1]) {
          o.beginPath();
          o.arc(s * 86, 6, 17, 0, 7);
          fs("#221a3d", LINE, 2);
          o.beginPath();
          o.arc(s * 86, 6, 11, 0, 7);
          fs(null, p.neon, 2.5);
          o.beginPath();
          o.arc(s * 86, 6, 4 + Math.sin(t * 5) * 1.2, 0, 7);
          fs(p.neon);
          P(`M ${s * 92} -10 L ${s * 104} -40`);
          fs(null, "#221a3d", 3);
          o.beginPath();
          o.arc(s * 104, -42, 3, 0, 7);
          fs(p.neon);
        }
        P("M -88 22 Q -76 66 -34 66");
        fs(null, "#221a3d", 2.4);
        o.beginPath();
        o.arc(-32, 66, 3.5, 0, 7);
        fs(p.neon);
      });
      // notas musicais subindo em volta dela enquanto dança
      if (S.dance > 0) {
        o.save();
        o.translate(340, 215);
        for (let i = 0; i < 4; i++) {
          const u = (t * 0.35 + i / 4) % 1;
          const x = (i % 2 ? 1 : -1) * (150 + Math.sin(t * 2 + i) * 14);
          const y = 60 - u * 230;
          o.globalAlpha = S.dance * Math.sin(u * Math.PI);
          o.fillStyle = i % 2 ? p.neon : p.h1;
          o.beginPath();
          o.ellipse(x, y, 11, 8, -0.4, 0, 7);
          o.fill();
          o.fillRect(x + 7, y - 38, 4, 38);
          o.fillRect(x + 7, y - 38, 16, 6);
        }
        o.restore();
        o.globalAlpha = 1;
      }
    }

    function frame() {
      raf = requestAnimationFrame(frame);
      const now = performance.now(); // o mesmo relógio usado nas falas
      const k = ctl.current;
      const t = now / 1000;
      const el = (now - k.start) / 1000;
      // depois que termina de aparecer, ela fala a frase de entrada
      if (el > 3.2 && k.subStart < 0) {
        if (alreadyMet()) {
          say(pick(BACK_LINES), "smile");
        } else {
          markMet();
          say(HOLO_PHRASE, "soft");
          k.busy = true;
          timers.current.push(setTimeout(() => play(INTRO), readTime(HOLO_PHRASE) - 400));
        }
      }
      // a música que já tocava quando você entrou também ganha comentário (depois da frase de entrada)
      if (!introDone && el > 14 && !k.busy) {
        introDone = true;
        const tr = trackRef.current;
        const ln = tr ? songLine(tr) : null;
        if (playingRef.current && tr && ln && commented.current !== tr.id && now > k.until + 800) {
          commented.current = tr.id;
          say(ln, "happy");
        }
      }
      // de tempos em tempos ela puxa conversa (ou ele chama por ela)
      if (introDone && !k.busy && now - k.lastTalk > 32000) play(TALKS[k.talk++ % TALKS.length]);
      const music = playingRef.current;
      // reage à velocidade e ao silêncio (sem repetir toda hora)
      fast = driveInput.speed > 2.6 ? fast + 1 / 60 : 0;
      const sinceTalk = now - k.lastTalk;
      if (fast > 3 && sinceTalk > 45000 && !k.busy) say(pick(SPEED_LINES), "surprised");
      // quando ele se olha no espelho, ela repara
      if (driveInput.view !== lastView) {
        if (driveInput.view === "mirror" && !k.busy) setTimeout(() => say(pick(MIRROR_LINES), "worried"), 900);
        if (driveInput.view === "roof" && !k.busy) setTimeout(() => say(pick(ROOF_LINES), "happy"), 1200);
        lastView = driveInput.view;
      }
      // boca mexendo no ritmo de fala estimado
      const talking = now < k.until;
      // a expressão some devagar de volta pro "normal" dela (que é meio preocupada, meio carinhosa)
      if (now > k.emoUntil) k.emo = music ? "smile" : "soft";
      const emo = k.emo;
      const mouth = !talking ? 0 : Math.abs(Math.sin(t * 13)) * (0.5 + 0.4 * Math.abs(Math.sin(t * 3.7)));
      // dança: a cabeça vai no ritmo, o corpo pula e às vezes ela fecha os olhos curtindo
      S.dance += ((music ? 1 : 0) - S.dance) * 0.05;
      const dn = S.dance;
      const beat = t * Math.PI * 2 * 2.13;
      // sem música: olha pra estrada e de vez em quando vira pra você
      const glance = Math.sin(t * 0.23) > 0.6 ? -0.45 : 0.12;
      S = {
        sy: Math.sin(glance + Math.sin(t * 0.45) * 0.12) * (1 - dn) + Math.sin(beat / 4) * 0.28 * dn,
        tilt: Math.sin(t * 0.7) * 0.035 * (1 - dn) + Math.sin(beat / 2) * 0.09 * dn,
        breath: Math.sin(t * 1.5) * 2 * (1 - dn) - Math.abs(Math.sin(beat / 2)) * 7 * dn,
        blink: t % 3.8 < 0.12 ? 0 : 1,
        look: 3,
        mouth,
        // o cabelo balança mais quanto mais rápido o carro (e quando ela dança)
        sway: Math.sin(t * (1.6 + driveInput.speed)) * (4 + driveInput.speed * 3) + Math.sin(beat / 2) * 6 * dn,
        happy: dn > 0.6 && !talking && t % 7 < 2.4 && (emo === "soft" || emo === "smile"),
        dance: dn,
        emo,
        talking,
      };
      pal = k.mode === 2 ? 1 : 0;
      draw(t);

      l.imageSmoothingEnabled = true;
      l.clearRect(0, 0, LW, LH);
      l.drawImage(off, 75, 30, 530, 405, 0, 0, LW, LH);
      const rev = Math.min(1, el / 2.4);
      const rowCut = Math.floor(LH * (1 - rev));
      const img = l.getImageData(0, 0, LW, LH);
      const d = img.data;
      const ramp = RAMPS[k.mode === 2 ? 1 : 0];
      for (let y = 0; y < LH; y++)
        for (let x = 0; x < LW; x++) {
          const i = (y * LW + x) * 4;
          if (y < rowCut || d[i + 3] < 38) {
            d[i + 3] = 0;
            continue;
          }
          const th = BAYER[(y & 3) * 4 + (x & 3)];
          if (k.mode === 1) {
            let best = 0;
            let bd = 1e9;
            const r = d[i] + th * 40;
            const g = d[i + 1] + th * 40;
            const b = d[i + 2] + th * 40;
            for (let q = 0; q < RETRO.length; q++) {
              const c3 = RETRO[q];
              const dd = (r - c3[0]) ** 2 + (g - c3[1]) ** 2 + (b - c3[2]) ** 2;
              if (dd < bd) {
                bd = dd;
                best = q;
              }
            }
            const c3 = RETRO[best];
            d[i] = c3[0];
            d[i + 1] = c3[1];
            d[i + 2] = c3[2];
            d[i + 3] = 225;
          } else {
            const lum = (d[i] * 0.3 + d[i + 1] * 0.55 + d[i + 2] * 0.15) / 255;
            const q = Math.max(0, Math.min(4, Math.round((lum + th * 0.28) * 4)));
            const c3 = ramp[q];
            d[i] = c3[0];
            d[i + 1] = c3[1];
            d[i + 2] = c3[2];
            d[i + 3] = q === 0 ? 110 : 210;
          }
        }
      l.putImageData(img, 0, 0);

      // projeção: fundo transparente (a estrada aparece por trás), feixe de luz, linhas tremendo
      const g = PAL[pal].glow;
      c!.clearRect(0, 0, W, H);
      c!.imageSmoothingEnabled = false;
      const cone = c!.createLinearGradient(0, H, 0, 0);
      cone.addColorStop(0, `rgba(${g},.16)`);
      cone.addColorStop(1, `rgba(${g},0)`);
      c!.beginPath();
      c!.moveTo(W / 2 - 120, H);
      c!.lineTo(W / 2 - 300, 0);
      c!.lineTo(W / 2 + 300, 0);
      c!.lineTo(W / 2 + 120, H);
      c!.closePath();
      c!.fillStyle = cone;
      c!.fill();
      const sx = W / LW;
      const sy = H / LH;
      const jit = Math.random() < 0.04 || driveInput.speed > 2.4;
      c!.globalAlpha = 0.3;
      c!.filter = "blur(8px)";
      c!.drawImage(low, 0, 0, W, H);
      c!.filter = "none";
      c!.globalAlpha = Math.min(1, 0.9 + Math.random() * 0.1);
      for (let y = 0; y < LH; y++) {
        const wob = Math.round(Math.sin(y * 0.35 + t * 7) * (jit ? 3 : 0.6));
        c!.drawImage(low, 0, y, LW, 1, wob, y * sy, W, sy + 0.5);
      }
      c!.globalAlpha = 1;
      // grade de pixels e varredura (só por cima dela)
      c!.globalCompositeOperation = "source-atop";
      c!.fillStyle = "rgba(0,0,0,.25)";
      for (let x = 0; x < W; x += sx) c!.fillRect(Math.round(x), 0, 1, H);
      for (let y = 0; y < H; y += sy) c!.fillRect(0, Math.round(y), W, 1);
      c!.fillStyle = "rgba(0,0,0,.18)";
      for (let y = (t * 30) % 8; y < H; y += 8) c!.fillRect(0, y, W, 3);
      c!.fillStyle = `rgba(${g},.08)`;
      c!.fillRect(0, (t * 90) % (H + 80) - 40, W, 26);
      c!.globalCompositeOperation = "source-over";
      if (rev < 1) {
        const yy = rowCut * sy;
        c!.fillStyle = "rgba(255,255,255,.9)";
        c!.fillRect(W / 2 - 240, yy - sy, 480, sy);
        for (let i = 0; i < 40; i++) {
          c!.fillStyle = `rgba(${g},.8)`;
          c!.fillRect(Math.round((W / 2 + Math.sin(i * 9.7 + t * 3) * 220) / sx) * sx, Math.round((yy + ((i * 31 + el * 200) % (H - yy + 1))) / sy) * sy, sx, sy);
        }
      }
      // legenda pixelada
      if (k.subStart > 0) {
        const n = Math.min(k.line.length, Math.floor((now - k.subStart) / 55));
        const hold = Math.max(5000, k.line.length * 110);
        const al = Math.max(0, Math.min(1, (hold - (now - k.subStart)) / 600));
        if (al > 0) {
          // quebra em linhas (frases longas ficam com letra um pouco menor)
          const long = k.line.length > 70;
          const max = long ? 36 : 30;
          const rows: string[] = [];
          for (const w of k.line.slice(0, n).split(" ")) {
            const last = rows[rows.length - 1];
            if (last !== undefined && (last + " " + w).length <= max) rows[rows.length - 1] = last + " " + w;
            else rows.push(w);
          }
          c!.globalAlpha = al;
          c!.font = `bold ${long ? 26 : 30}px monospace`;
          c!.textAlign = "center";
          c!.lineWidth = 7;
          c!.strokeStyle = "#07041a";
          c!.fillStyle = "#fff6c8";
          rows.forEach((r, i) => {
            const y = H - 30 - (rows.length - 1 - i) * (long ? 31 : 36);
            c!.strokeText(r, W / 2, y);
            c!.fillText(r, W / 2, y);
          });
          c!.globalAlpha = 1;
        }
      }
      if (still) cancelAnimationFrame(raf);
    }
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [say]);

  return (
    <div className="sd-holo">
      <canvas
        ref={ref}
        width={W}
        height={H}
        title="Clique pra ela comentar a música"
        onClick={() => {
          if (ctl.current.busy) return;
          const ln = playingRef.current && track && songLine(track);
          say(ln || "Tô aqui. Sempre tô.", ln ? "happy" : "soft");
        }}
      />
      <button
        className="sd-holo-mode"
        onClick={() => (ctl.current.mode = (ctl.current.mode + 1) % 3)}
        aria-label="Trocar estilo do holograma"
        title="Trocar estilo do holograma"
      >
        ◐
      </button>
      <i className="sd-holo-emitter" aria-hidden="true" />
      <span className="sd-holo-name">◈ GRETA</span>
    </div>
  );
}
