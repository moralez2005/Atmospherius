// Conversas na borda do tabuleiro: você e O Pensador (a estátua do papel de parede).
// Ele é calmo, irônico e sabe das coisas; você puxa o assunto e ele te leva longe.
// Três temas: filosofia, games e música. As referências são reais (autor, obra, ideia).

export type TLine = { who: "p" | "v"; text: string };
export type Topic = "filo" | "games" | "musica" | "arte" | "internet" | "vida";

export const ARRIVE: TLine[] = [
  { who: "p", text: "Você atravessou o tabuleiro inteiro só pra sentar aqui? Senta. A vista compensa." },
  { who: "v", text: "Você fala?" },
  { who: "p", text: "Penso há mais de um século. Uma hora a gente cansa de pensar sozinho." },
];
export const BACK: TLine[][] = [
  [{ who: "p", text: "Voltou. O lago tava com saudade de ser olhado." }],
  [{ who: "p", text: "Senta aí. Os golfinhos já estavam perguntando de você." }],
  [{ who: "p", text: "De novo na borda do mundo. Sobre o que a gente pensa hoje?" }],
];

export const DEBATES: Record<Topic, TLine[][]> = {
  filo: [
    [
      { who: "p", text: "Sabia que eu nasci pra ser o Dante, sentado no alto da Porta do Inferno, pensando no próprio poema?" },
      { who: "v", text: "E hoje você pensa em quê?" },
      { who: "p", text: "Em por que todo mundo me imita com a mão no queixo e ninguém termina o pensamento." },
      { who: "v", text: "Talvez pensar seja mais pose do que conclusão." },
      { who: "p", text: "Ou talvez a conclusão seja continuar sentado. Aqui, com você, olhando o lago." },
    ],
    [
      { who: "p", text: "Platão contou de prisioneiros numa caverna que só viam sombras na parede e achavam que aquilo era o mundo." },
      { who: "v", text: "Tipo a gente olhando tela o dia inteiro?" },
      { who: "p", text: "Exatamente. Mas repara: quando um deles sai, a luz lá fora arde nos olhos. Ninguém quer sair." },
      { who: "v", text: "Então o problema não é a sombra. É o medo da luz." },
      { who: "p", text: "Viu? Você pensa melhor sentado." },
    ],
    [
      { who: "p", text: "Zhuangzi sonhou que era uma borboleta. Acordou sem saber se era um homem que sonhou ser borboleta ou uma borboleta sonhando ser homem." },
      { who: "v", text: "E esse lago com golfinhos? É sonho de quem?" },
      { who: "p", text: "De um computador dos anos 90, eu diria. E a gente é o protetor de tela dele." },
      { who: "v", text: "Pelo menos é um sonho bonito." },
      { who: "p", text: "Os melhores sonhos não pedem prova de que são reais." },
    ],
    [
      { who: "p", text: "Heráclito dizia que ninguém entra duas vezes no mesmo rio. Olha aquele descendo a montanha." },
      { who: "v", text: "Ele muda o tempo todo, mas parece sempre igual." },
      { who: "p", text: "Como uma música em loop. A cada volta, quem ouve já é outra pessoa." },
      { who: "v", text: "Então vaporwave é filosofia grega?" },
      { who: "p", text: "Tudo é, se você sentar aqui tempo suficiente." },
    ],
    [
      { who: "p", text: "Sócrates dizia que só sabia que nada sabia." },
      { who: "v", text: "Fácil falar isso sendo estátua." },
      { who: "p", text: "Pelo contrário. Tô há mais de cem anos com a mão no queixo e ainda não cheguei a lugar nenhum." },
      { who: "v", text: "Isso é deprimente ou reconfortante?" },
      { who: "p", text: "As duas coisas. Igual a uma boa música lenta." },
    ],
    [
      { who: "p", text: "Kierkegaard escreveu que a vida só pode ser entendida olhando pra trás, mas precisa ser vivida pra frente." },
      { who: "v", text: "Tipo olhar o tabuleiro atrás e o lago na frente." },
      { who: "p", text: "Exato. Por isso a gente senta na borda: dá pra fazer as duas coisas ao mesmo tempo." },
    ],
    [
      { who: "p", text: "Epicuro dizia que a morte não é nada pra nós: quando a gente existe, ela não está; quando ela chega, a gente já não está." },
      { who: "v", text: "Isso consola?" },
      { who: "p", text: "Pra uma estátua de bronze, muito. Pra vocês, recomendo aproveitar o lago enquanto isso." },
    ],
  ],
  games: [
    [
      { who: "p", text: "O historiador Johan Huizinga chamou o jogo de 'círculo mágico': um espaço com regras próprias, separado do mundo." },
      { who: "v", text: "Tipo esse tabuleiro?" },
      { who: "p", text: "Tipo esse tabuleiro. Aqui dentro uma estátua conversa e golfinho voa. Lá fora ninguém ia acreditar." },
      { who: "v", text: "Então a gente tá dentro de um jogo." },
      { who: "p", text: "Sempre que você aceita as regras de um mundo só pra ver aonde ele leva, sim." },
    ],
    [
      { who: "p", text: "O psicólogo Csikszentmihalyi chamou de 'flow' o estado em que o desafio e a sua habilidade ficam do mesmo tamanho." },
      { who: "v", text: "É quando eu perco a noção do tempo jogando." },
      { who: "p", text: "Isso. Fácil demais vira tédio. Difícil demais vira ansiedade. O jogo bom anda no meio." },
      { who: "v", text: "E a vida?" },
      { who: "p", text: "A vida não tem ajuste de dificuldade. Por isso vocês inventaram os jogos." },
    ],
    [
      { who: "p", text: "Por que vocês gostam tanto de jogo em que se morre o tempo todo?" },
      { who: "v", text: "Porque quando finalmente passa, foi você que aprendeu." },
      { who: "p", text: "Sísifo empurrando a pedra, só que com checkpoint." },
      { who: "v", text: "E o Camus mandou imaginar Sísifo feliz." },
      { who: "p", text: "Com checkpoint eu imagino ele até rindo." },
    ],
    [
      { who: "p", text: "Muito jogo te dá escolhas que acabam no mesmo final. Isso é enganação?" },
      { who: "v", text: "Depende. Se eu senti que escolhi, valeu." },
      { who: "p", text: "Então a liberdade mora no caminho, não na chegada." },
      { who: "v", text: "Igual atravessar esse tabuleiro até a borda." },
      { who: "p", text: "Você podia ter ficado lá dentro da janela. Veio. Essa escolha foi sua." },
    ],
    [
      { who: "p", text: "Já pensou que eu sou um NPC?" },
      { who: "v", text: "Um NPC muito filosófico." },
      { who: "p", text: "Todo personagem que espera alguém chegar pra conversar é meio NPC. Inclusive quem tá sozinho em casa." },
      { who: "v", text: "Pesado." },
      { who: "p", text: "Por isso é bom ter alguém pra quem dar a próxima fala." },
    ],
    [
      { who: "p", text: "Conhece o 'efeito Tetris'? Quem joga demais começa a ver as peças encaixando até de olho fechado." },
      { who: "v", text: "Já aconteceu comigo com outros jogos." },
      { who: "p", text: "O cérebro aprende o mundo do jogo e não quer sair dele. Igual eu com esse lago." },
    ],
    [
      { who: "p", text: "O Toru Iwatani contou que teve a ideia do Pac-Man olhando uma pizza sem uma fatia." },
      { who: "v", text: "Genial e com fome." },
      { who: "p", text: "As melhores ideias costumam ter as duas coisas." },
    ],
  ],
  musica: [
    [
      { who: "p", text: "O vaporwave pegou música de elevador, comercial e shopping dos anos 80 e 90 e desacelerou tudo." },
      { who: "v", text: "Pra quê?" },
      { who: "p", text: "Pra mostrar como aquele futuro brilhante que prometeram soava estranho. Saudade de um futuro que nunca chegou." },
      { who: "v", text: "Mas é bonito." },
      { who: "p", text: "Coisas que nunca existiram costumam ser." },
    ],
    [
      { who: "p", text: "Brian Eno escreveu que a música ambiente devia ser tão ignorável quanto interessante." },
      { who: "v", text: "Isso é elogio?" },
      { who: "p", text: "O maior. Música que te deixa pensar, em vez de pensar por você." },
      { who: "v", text: "Tipo o barulho desse rio." },
      { who: "p", text: "O rio é o melhor disco ambiente que existe. E nunca repete uma faixa." },
    ],
    [
      { who: "p", text: "Em 1952, John Cage apresentou 4'33'': um pianista senta e não toca nada por quatro minutos e meio." },
      { who: "v", text: "E a plateia?" },
      { who: "p", text: "Tossiu, mexeu na cadeira, ouviu a chuva lá fora. Aquilo virou a música." },
      { who: "v", text: "Então silêncio não existe." },
      { who: "p", text: "Pra quem presta atenção, nunca." },
    ],
    [
      { who: "p", text: "Por que hoje todo mundo deixa as músicas mais lentas e cheias de eco?" },
      { who: "v", text: "Fica com cara de lembrança." },
      { who: "p", text: "Exato. O eco é o tempo passando dentro da canção. O vaporwave já fazia isso antes de virar moda." },
      { who: "v", text: "Você é o avô do slowed + reverb." },
      { who: "p", text: "Sou de bronze, sabia? Aqui pareço de papel por causa do filtro. Avô de tudo é pouco." },
    ],
    [
      { who: "p", text: "O Kraftwerk lançou em 1978 um disco chamado 'O Homem-Máquina'. Pareciam robôs tocando." },
      { who: "v", text: "E hoje todo mundo faz música no computador." },
      { who: "p", text: "Eles só chegaram cedo. Como todo bom profeta, pareciam esquisitos." },
    ],
    [
      { who: "p", text: "Posso confessar uma coisa? Sou fã de Arctic Monkeys." },
      { who: "v", text: "Uma estátua do século dezenove?" },
      { who: "p", text: "O Alex Turner canta como quem pensa em voz alta, com a mão no queixo. Somos colegas de profissão." },
      { who: "v", text: "Qual disco?" },
      { who: "p", text: "O AM, de 2013. Tem cara de madrugada. E eu sou basicamente uma madrugada de bronze." },
    ],
    [
      { who: "p", text: "Música que gruda na cabeça tem nome em alemão: 'Ohrwurm'. Minhoca de ouvido." },
      { who: "v", text: "Tem uma morando na minha cabeça agora." },
      { who: "p", text: "Deve ser essa da rádio. Elas gostam de morar onde tem silêncio." },
    ],
  ],
  arte: [
    [
      { who: "p", text: "Em 1917, Marcel Duchamp mandou um mictório pra uma exposição e chamou de 'Fonte'." },
      { who: "v", text: "E isso é arte?" },
      { who: "p", text: "A pergunta virou a arte. Ele mostrou que o olhar e o lugar fazem metade do trabalho." },
      { who: "v", text: "Então essa janela do Paint é arte." },
      { who: "p", text: "Comigo dentro? Obra-prima, obviamente." },
    ],
    [
      { who: "p", text: "Existem mais de vinte de mim pelo mundo, em bronze, tamanho real." },
      { who: "v", text: "E qual é o original?" },
      { who: "p", text: "O Walter Benjamin dizia que a reprodução tira a 'aura' da obra. Eu acho que só me deixou mais sociável." },
    ],
    [
      { who: "p", text: "Já reparou como o vaporwave adora estátua grega?" },
      { who: "v", text: "Por quê?" },
      { who: "p", text: "É o clássico, que parecia eterno, colado num fundo de shopping e Windows 95. A eternidade virou protetor de tela." },
      { who: "v", text: "E você se sente como?" },
      { who: "p", text: "Lisonjeado. E um pouco pixelado." },
    ],
    [
      { who: "p", text: "O Monet pintou o mesmo lago de nenúfares umas duzentas e cinquenta vezes." },
      { who: "v", text: "Não enjoou?" },
      { who: "p", text: "A luz mudava, e ele também. Olha esse lago: daqui a pouco já vai ser outro." },
    ],
  ],
  internet: [
    [
      { who: "p", text: "Antes das redes sociais, cada um fazia a própria página no GeoCities, com fundo piscando e contador de visitas." },
      { who: "v", text: "Parece caótico." },
      { who: "p", text: "Era. Mas era seu. Hoje todo mundo mora no mesmo prédio, com a mesma decoração." },
      { who: "v", text: "Saudade de uma coisa que eu nem vivi." },
      { who: "p", text: "Isso tem nome: anemoia. Saudade de um tempo que você nunca conheceu. O vaporwave inteiro é feito disso." },
    ],
    [
      { who: "p", text: "Em 1971, Herbert Simon disse que muita informação cria pobreza de atenção." },
      { who: "v", text: "Isso explica meu celular." },
      { who: "p", text: "Explica o mundo. Por isso eu fico sentado: atenção é a única coisa que eu ainda tenho de sobra." },
    ],
    [
      { who: "p", text: "A palavra 'meme' foi criada pelo Richard Dawkins em 1976, pra falar de ideias que se copiam de cabeça em cabeça." },
      { who: "v", text: "Bem antes do gato de óculos." },
      { who: "p", text: "Eu mesmo sou um meme. Mão no queixo, pose de quem pensa, copiado há mais de um século." },
    ],
  ],
  vida: [
    [
      { who: "p", text: "Sêneca escreveu que a vida não é curta: a gente é que desperdiça muito dela." },
      { who: "v", text: "Tipo duas horas rolando o feed?" },
      { who: "p", text: "Ele nunca viu um feed, mas descreveu direitinho." },
      { who: "v", text: "E como não desperdiçar?" },
      { who: "p", text: "Sentando na borda de vez em quando e olhando um lago sem pressa. Tipo agora." },
    ],
    [
      { who: "p", text: "Epicuro dizia que, de tudo que a sabedoria oferece pra uma vida feliz, o maior bem é a amizade." },
      { who: "v", text: "Até pra uma estátua?" },
      { who: "p", text: "Principalmente. Passei um século num museu sendo olhado. Conversar é outra coisa." },
    ],
    [
      { who: "p", text: "Os japoneses têm o kintsugi: consertar cerâmica quebrada com ouro, deixando a rachadura à mostra." },
      { who: "v", text: "Em vez de esconder?" },
      { who: "p", text: "Em vez de esconder. A quebra vira parte da história. Serve pra gente também." },
    ],
  ],
};

// comentário dele sobre a música da Rádio Vapor que começou a tocar
const SONGS: Record<string, string> = {
  "Macintosh Plus|リサフランク420 / 現代のコンピュー":
    "A faixa mais famosa do Floral Shoppe, de 2011. Lá no fundo, desacelerada, tem uma canção da Diana Ross dos anos 80.",
  "Macintosh Plus|ブート": "Mais uma do Floral Shoppe. A capa desse disco tem um busto grego. Parente meu, de certa forma.",
  "HOME|Resonance": "Resonance saiu em 2014, no disco Odyssey, e só anos depois explodiu na internet. Às vezes a música espera a gente.",
  "Tame Impala|The Less I Know The Better": "O Kevin Parker grava quase tudo do Tame Impala sozinho. Uma banda inteira dentro de uma pessoa.",
  "Tame Impala|Dracula": "Dracula, do Deadbeat, de 2025. O Kevin Parker contou que foi uma das primeiras do disco, começou crua e foi virando pop. Uma música noturna, de quem foge do dia. Eu sou de bronze, o sol nem me incomoda.",
  "Tame Impala|Loser": "Loser saiu em 2025, com o Joe Keery no clipe, sentado na frente de uma loja de conveniência vendo a vida passar. Basicamente eu, só que com refrigerante.",
  "Tame Impala|Borderline": "Borderline saiu como single em 2019 e depois voltou modificada no disco The Slow Rush. Até música muda de ideia.",
  "Arctic Monkeys|505": "Arctic Monkeys! 505 fecha o Favourite Worst Nightmare, de 2007. Aquele órgão no final quase me faz tirar a mão do queixo.",
  "Arctic Monkeys|Do I Wanna Know?":
    "Arctic Monkeys, finalmente! Abre o AM, de 2013. E o clipe é feito só de ondas sonoras animadas, iguaizinhas às do céu daqui. Coincidência? Acho que não.",
  "Arctic Monkeys|Why'd You Only Call Me When You're High?": "Mais AM, de 2013. Uma música sobre ligação de madrugada. Nunca recebi uma. Ser estátua tem dessas.",
};
const SONG_GENERIC = [
  "Isso aqui é som de janela de computador antigo com pôr do sol dentro.",
  "Escuta como ela parece vir de outro quarto. É disso que eu gosto.",
  "Música pra olhar golfinho e não pensar em boleto.",
];
// ele é fã de Arctic Monkeys: se não tiver comentário pronto pra faixa, ainda assim se empolga
const AM_FAN = [
  "Arctic Monkeys de novo? Essa rádio me conhece.",
  "Sabe qual é a única coisa que me tira do sério? Arctic Monkeys no volume certo.",
];
export function songComment(t: { title: string; artist: string }) {
  const known = SONGS[`${t.artist}|${t.title}`];
  if (known) return known;
  if (t.artist === "Arctic Monkeys") return AM_FAN[Math.floor(Math.random() * AM_FAN.length)];
  return SONG_GENERIC[Math.floor(Math.random() * SONG_GENERIC.length)];
}

export const readTime = (text: string) => 1700 + text.length * 60;
