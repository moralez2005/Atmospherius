// Conversas entre a Greta (a IA holográfica) e o caçador.
//
// Ela é a amiga preocupada: ele está claramente mal e se afunda no trabalho pra não pensar
// no que dói. Ela não força, não dá sermão — cutuca com carinho, faz piada, insiste baixinho.
// Ele responde seco, curto, às vezes deixa escapar alguma coisa.
//
// A fala dele aparece numa legenda própria (este pequeno store); a dela, no holograma.

export type Emo = "neutral" | "soft" | "smile" | "happy" | "worried" | "sad" | "surprised" | "annoyed" | "wink";
export type Line = { who: "g" | "h"; text: string; emo?: Emo };

// última fala (dele, ou dela quando o holograma não está à vista: janela e teto solar)
let last = { who: "h" as "g" | "h", text: "", id: 0 };
const subs = new Set<() => void>();
export function talkSay(who: "g" | "h", text: string) {
  last = { who, text, id: last.id + 1 };
  subs.forEach((f) => f());
}
export const hunterSay = (text: string) => talkSay("h", text);
export function subscribeTalk(f: () => void) {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
}
export const getTalk = () => last;

// primeira conversa da noite (logo depois do "Você parece tão solitário.")
export const INTRO: Line[] = [
  { who: "h", text: "Só cansado, Greta." },
  { who: "g", text: "Cansado faz três meses, caçador.", emo: "worried" },
];

// Teimosia com filosofia de para-choque: ela faz alguma coisa pelo bem dele, ele arruma uma
// desculpa, pega um filósofo pela metade pra se justificar, e ela (que tem a internet inteira
// na cabeça) desmonta a citação com o que o autor disse de verdade. Camadas: cuidado → desculpa
// → filosofia torta → correção → a ferida que estava por baixo.
export const STUBBORN: Line[][] = [
  [
    { who: "g", text: "Marquei uma consulta pra você amanhã, dez da manhã.", emo: "smile" },
    { who: "h", text: "Não dá. Tenho um alvo no porto." },
    { who: "g", text: "O alvo é às oito da noite. Eu chequei.", emo: "annoyed" },
    { who: "h", text: "Nietzsche: o que não me mata me fortalece." },
    { who: "g", text: "Você leu isso numa caixa de leite. O Nietzsche passou a vida doente, mudando de cidade atrás de ar bom e descanso.", emo: "annoyed" },
    { who: "g", text: "Até ele cuidava da saúde, caçador. Dez horas. Eu te acordo.", emo: "soft" },
  ],
  [
    { who: "g", text: "Pedi um lámen pra você. Chega no próximo semáforo.", emo: "happy" },
    { who: "h", text: "Não tô com fome." },
    { who: "g", text: "Seu estômago roncou duas vezes nessa música.", emo: "wink" },
    { who: "h", text: "Epicuro dizia pra viver o prazer do momento. Meu prazer é café." },
    { who: "g", text: "Epicuro vivia de pão, água e amigos, e queria dormir em paz. Café triplo às quatro da manhã não é epicurismo, é pedido de socorro.", emo: "worried" },
    { who: "h", text: "...Pede com ovo." },
    { who: "g", text: "Já pedi.", emo: "happy" },
  ],
  [
    { who: "g", text: "Desliguei as notificações de contrato até amanhã.", emo: "neutral" },
    { who: "h", text: "Você não pode fazer isso." },
    { who: "g", text: "Posso. Você me deu acesso total e nunca tirou.", emo: "wink" },
    { who: "h", text: "Camus: tem que imaginar Sísifo feliz. Eu empurro minha pedra." },
    { who: "g", text: "O Camus achava que o momento que importa é quando a pedra rola e o Sísifo desce a montanha. É na descida que ele pensa.", emo: "soft" },
    { who: "g", text: "Você nunca desce. Hoje é descida.", emo: "worried" },
  ],
  [
    { who: "g", text: "Achei um grupo de apoio. Quintas, oito da noite, perto daquela lojinha de lámen.", emo: "soft" },
    { who: "h", text: "Sartre: o inferno são os outros." },
    { who: "g", text: "Ele mesmo explicou que não era isso. Quis dizer que a gente se enxerga pelo olhar dos outros, e que relações tortas viram inferno.", emo: "annoyed" },
    { who: "g", text: "Não é motivo pra morar num carro, é motivo pra escolher bem com quem conversar.", emo: "smile" },
    { who: "h", text: "Eu converso com você." },
    { who: "g", text: "E eu sou ótima. Mas não sou suficiente. Quinta.", emo: "sad" },
  ],
  [
    { who: "g", text: "Você chorou ontem. O carro tem sensor de umidade, tá?", emo: "worried" },
    { who: "h", text: "Era chuva." },
    { who: "g", text: "Dentro do carro, caçador.", emo: "sad" },
    { who: "h", text: "Marco Aurélio: não se importe com o que não pode controlar." },
    { who: "g", text: "As 'Meditações' eram anotações que o Marco Aurélio escrevia pra si mesmo, tentando entender o que sentia. Isso é encarar a dor, não fingir que ela não existe.", emo: "soft" },
    { who: "g", text: "Escreve uma linha hoje. Eu guardo. Não leio. Prometo.", emo: "soft" },
  ],
  [
    { who: "g", text: "Programei a rota pra sua casa.", emo: "smile" },
    { who: "h", text: "Heráclito: ninguém entra duas vezes no mesmo rio. Não volto pra lá." },
    { who: "g", text: "Bonito. Mas o Heráclito falava que tudo muda. Você é o único que não muda nesse rio.", emo: "annoyed" },
    { who: "h", text: "A casa tem as coisas dela." },
    { who: "g", text: "...Eu sei. Então vamos pegar uma caixa de cada vez. Eu ajudo.", emo: "sad" },
  ],
  [
    { who: "g", text: "Coloquei um alarme pra você dormir à meia-noite.", emo: "smile" },
    { who: "h", text: "Descartes: penso, logo existo. Trabalho, logo continuo." },
    { who: "g", text: "O Descartes adorava ficar na cama até tarde pensando. Dizem que a saúde dele desandou quando teve que acordar às cinco pra dar aula pra rainha da Suécia.", emo: "wink" },
    { who: "g", text: "Moral da história: dorme, pensador.", emo: "happy" },
    { who: "h", text: "Meia-noite e meia." },
    { who: "g", text: "Meia-noite e quinze. Fechado.", emo: "smile" },
  ],
  [
    { who: "g", text: "Liguei pro seu irmão. Ele quer te ver no domingo.", emo: "soft" },
    { who: "h", text: "Schopenhauer: a vida é um pêndulo entre a dor e o tédio. Prefiro a dor do trabalho." },
    { who: "g", text: "O Schopenhauer dizia que a arte e a música davam um respiro desse pêndulo. Tá tocando agora. De nada.", emo: "smile" },
    { who: "g", text: "E um irmão também serve de respiro. Domingo.", emo: "soft" },
    { who: "h", text: "Vou pensar." },
    { who: "g", text: "Já confirmei por você.", emo: "wink" },
  ],
  [
    { who: "g", text: "Você não sai do carro há dois dias.", emo: "worried" },
    { who: "h", text: "Diógenes vivia num barril. Meu carro é meu barril." },
    { who: "g", text: "O Diógenes passava o dia na praça puxando conversa com todo mundo. Você nem atende o telefone.", emo: "annoyed" },
    { who: "g", text: "Vamos fazer assim: dez minutos andando ali na calçada. Eu vou no seu relógio.", emo: "soft" },
    { who: "h", text: "Tá chovendo." },
    { who: "g", text: "Metade daquelas pessoas tá de guarda-chuva aceso. Eu escolho um pra você.", emo: "smile" },
  ],
];

// conversas que vão surgindo enquanto vocês rodam pela cidade
export const TALKS: Line[][] = [
  [
    { who: "g", text: "Você comeu alguma coisa hoje?", emo: "worried" },
    { who: "h", text: "Café conta." },
    { who: "g", text: "Não conta. Nunca contou.", emo: "annoyed" },
  ],
  [
    { who: "g", text: "Terceiro contrato essa semana. Tá fugindo de quê?", emo: "worried" },
    { who: "h", text: "Trabalho é trabalho." },
    { who: "g", text: "Trabalho não te responde às quatro da manhã. Eu respondo.", emo: "sad" },
  ],
  [
    { who: "g", text: "Lembra quando você ria das minhas piadas ruins?", emo: "soft" },
    { who: "h", text: "Elas continuam ruins." },
    { who: "g", text: "Isso foi quase um sorriso. Eu vi, tá?", emo: "happy" },
  ],
  [
    { who: "g", text: "Você falou o nome dela dormindo de novo.", emo: "sad" },
    { who: "h", text: "...Aumenta o som." },
    { who: "g", text: "Tá bom. Mas eu não vou a lugar nenhum.", emo: "soft" },
  ],
  [
    { who: "g", text: "O alvo pode esperar até amanhã.", emo: "neutral" },
    { who: "h", text: "Amanhã ele some da cidade." },
    { who: "g", text: "E você? Quem é que procura você quando você some?", emo: "sad" },
  ],
  [
    { who: "g", text: "Se você dormir oito horas, eu escolho só música boa.", emo: "wink" },
    { who: "h", text: "Você já escolhe só música boa." },
    { who: "g", text: "Então dorme por mim. Eu não consigo.", emo: "smile" },
  ],
  [
    { who: "g", text: "Você não é só o que você caça, sabia?", emo: "worried" },
    { who: "h", text: "Hoje eu sou." },
    { who: "g", text: "Hoje. Amanhã a gente vê. Juntos.", emo: "soft" },
  ],
  [
    { who: "g", text: "Olha aquele outdoor: \"esqueça o que dói\".", emo: "surprised" },
    { who: "h", text: "Seria fácil." },
    { who: "g", text: "Seria. Mas aí você esquecia ela também. E eu não deixo.", emo: "sad" },
  ],
  [
    { who: "g", text: "Sabe o que eu faço quando você dorme?", emo: "soft" },
    { who: "h", text: "Fica vigiando a rua." },
    { who: "g", text: "Fico vigiando você. A rua se vira sozinha.", emo: "smile" },
  ],
  [
    { who: "h", text: "Greta... você ainda tá aí?" },
    { who: "g", text: "Sempre. Mesmo quando você finge que não precisa.", emo: "soft" },
  ],
  [
    { who: "g", text: "Quer conversar sobre aquela noite?", emo: "worried" },
    { who: "h", text: "Não." },
    { who: "g", text: "Tudo bem. A oferta não vence.", emo: "soft" },
  ],
  [
    { who: "g", text: "Aquela lojinha de lámen ainda tá aberta. Para lá. Por mim.", emo: "smile" },
    { who: "h", text: "Você nem come." },
    { who: "g", text: "Mas eu gosto de ver você comendo. É raro.", emo: "happy" },
  ],
];

// as conversas de teimosia entram intercaladas com as outras
export const ALL_TALKS: Line[][] = TALKS.flatMap((tk, i) => (STUBBORN[i] ? [STUBBORN[i], tk] : [tk]));

// tempo de leitura de uma fala (ms)
export const readTime = (text: string) => 1600 + text.length * 62;
