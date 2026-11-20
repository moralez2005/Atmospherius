// Os bonecos de vidro do parque do Frutiger Aero: nome, cor do vidro e o que cada um fala.
// As cores seguem os computadores translúcidos coloridos do fim dos anos 90 / começo dos 2000
// (tangerina, mirtilo, morango, lima, uva...). A ordem é a mesma de FIGS em aeroPark.ts.

export type Npc = {
  name: string;
  flavor: string; // nome da cor
  tint: [number, number, number];
  talks: string[][]; // uma conversa por vez, em sequência
  night?: string[]; // conversa de noite (quando tem)
};

export const NPCS: Npc[] = [
  {
    name: "Bia",
    flavor: "Tangerina",
    tint: [1, 0.55, 0.12],
    talks: [
      ["Opa! Bia aqui. Tô ganhando de 9 a 7, não me desconcentra!", "Brincadeira, pode ficar. Quer saber o segredo? Olhar pra bolinha, não pra raquete."],
      ["Essa mesa é a mais disputada do parque. Domingo tem até fila.", "O Davi diz que me deixa ganhar. Mentira dele!"],
      ["Se o Davi errar mais uma, eu peço uma música no MP3 do Rafa pra comemorar.", "Volta depois pra ver a revanche!"],
    ],
  },
  {
    name: "Davi",
    flavor: "Mirtilo",
    tint: [0.22, 0.48, 1],
    talks: [
      ["E aí! Sou o Davi. A Bia tá contando os pontos dela de um jeito bem... criativo.", "Mas tudo bem, eu jogo pela diversão. E pelo suco do piquenique depois."],
      ["Dica: se um dia você jogar contra a Bia, saca curtinho. Ela odeia saque curto.", "Só não conta pra ela que fui eu que falei."],
      ["Já reparou no lago? De tempos em tempos um peixe laranja dá um pulo."],
    ],
  },
  {
    name: "Lia",
    flavor: "Morango",
    tint: [1, 0.32, 0.5],
    talks: [
      ["Oi, oi! Chega mais, tem sanduíche natural e suco de laranja.", "Eu e o Théo fazemos piquenique aqui toda semana. Trouxe até a toalha xadrez!"],
      ["Essa cesta de vime era da minha avó. Cabe tudo: fruta, guardanapo, até um livro.", "Hoje o livro ficou em casa. Preferi ficar olhando as nuvens."],
    ],
    night: ["Já escureceu... daqui a pouco a gente arruma tudo.", "Mas espera os vaga-lumes aparecerem. É a parte mais bonita!"],
  },
  {
    name: "Théo",
    flavor: "Lima",
    tint: [0.5, 0.95, 0.2],
    talks: [
      ["Olá! Sabia que uma árvore grande dessas solta oxigênio pra várias pessoas respirarem?", "Por isso eu sempre levo meu lixo embora. Parque limpo é parque feliz."],
      ["Tô pensando em fazer uma horta na varanda: alface, tomate-cereja, manjericão...", "Se der certo, o próximo piquenique tem salada da horta!"],
      ["A água da fonte é sempre a mesma, sabia? Ela cai, volta pra cima e cai de novo. Nada se perde."],
    ],
  },
  {
    name: "Nuno",
    flavor: "Índigo",
    tint: [0.45, 0.38, 1],
    talks: [
      ["Daqui de cima da colina dá pra ver o parque inteiro. Gosto de ficar só olhando.", "Aquela nuvem ali parece um golfinho. Ou um ferro de passar. Depende do dia."],
      ["Quando eu era pequeno, achava que o horizonte era o fim do mundo.", "Hoje eu sei que é só o começo de outro lugar."],
    ],
    night: ["Olha quantas estrelas! Com o céu limpo assim, parece que dá pra contar todas.", "Eu já tentei. Parei na 214."],
  },
  {
    name: "Rafa",
    flavor: "Azul Bondi",
    tint: [0.05, 0.75, 0.85],
    talks: [
      ["Ei! Tô no meio da caminhada: meia hora por dia, todo dia!", "No meu MP3 tem eletrônica dos anos 2000. São 128 MB, cabem umas 30 músicas!"],
      ["Dei a volta no lago três vezes hoje. Na terceira o peixe pulou bem do meu lado!"],
      ["Quer caminhar junto? É só vir atrás. Mas eu não paro pra ninguém, hein. Bom... quase ninguém."],
    ],
  },
  {
    name: "Mel",
    flavor: "Uva",
    tint: [0.7, 0.35, 1],
    talks: [
      ["Oi! Eu sou a Mel e tô fazendo bolhas de sabão.", "Estoura umas pra mim? É só clicar nelas!"],
      ["Segredo da bolha perfeita: soprar devagarinho. Se soprar forte, ela estoura antes de nascer."],
    ],
  },
  {
    name: "Ana",
    flavor: "Menta",
    tint: [0.35, 1, 0.75],
    talks: [
      ["Oi! A gente vem nesse banco ver o lago todo fim de tarde.", "O Caio jura que é sempre o mesmo peixe que pula. Eu acho que são vários."],
      ["Quando bate um vento, a água fica toda enrugadinha e brilhando.", "Parece papel de parede de computador!"],
    ],
  },
  {
    name: "Caio",
    flavor: "Girassol",
    tint: [1, 0.85, 0.15],
    talks: [
      ["Fala! Senta aí... ah, não cabe. Banco de dois, foi mal.", "Fica de olho no lago: de tempos em tempos o peixe pula. Conta comigo!"],
      ["Eu e a Ana tamo apostando: ela diz que são vários peixes, eu digo que é um só, bem animado."],
    ],
  },
  {
    name: "Kiko",
    flavor: "Rubi",
    tint: [1, 0.22, 0.25],
    talks: [
      ["Opa! Olha minha pipa lá em cima! Hoje o vento tá perfeito.", "O segredo é dar linha devagar e não puxar com força. Ela sobe sozinha."],
      ["Essa pipa eu mesmo fiz: papel de seda, varetas de bambu e uma rabiola bem comprida."],
    ],
    night: ["Já é de noite e a pipa continua lá em cima.", "Acho que ela também quer ver as estrelas."],
  },
];

// você: vidro transparente, quase sem cor
export const PLAYER_TINT: [number, number, number] = [0.9, 0.97, 1];
// a água da fonte: o água-marinha de sempre
export const WATER_TINT: [number, number, number] = [0.53, 0.9, 1.1];

// a conversa da vez com o boneco i (n = quantas vezes você já falou com ele; pops = bolhas estouradas)
export function conversation(i: number, n: number, hour: number, pops: number) {
  const npc = NPCS[i];
  const night = hour < 6 || hour >= 19;
  if (night && npc.night && n % 2 === 0) return npc.night;
  if (i === 6 && n > 0 && pops > 0)
    return [`Você já estourou ${pops} ${pops === 1 ? "bolha" : "bolhas"}! Eu faço, você estoura. Que dupla!`, "Bora mais uma rodada?"];
  return npc.talks[n % npc.talks.length];
}
