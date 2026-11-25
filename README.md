# ESTÉTICAS OS

Um sistema operacional fictício no navegador que muda de época. O desktop troca de **estética** (Vaporwave, Synthwave, Frutiger Aero e Gen X Soft Club) e leva junto o papel de parede, as janelas, as animações, os sons e a rádio de cada uma. Cada estética também esconde um lugar pra explorar.

Feito por Kauã e Luiz Felippe.

## As estéticas

| Estética | O que tem |
|---|---|
| **Vaporwave** | Lago com tabuleiro infinito e palmeiras low-poly. **Clique em O Pensador** pra sentar com ele na borda do mundo e conversar sobre filosofia, games, música e arte. Rádio no CD Player.exe e Tamagochi. |
| **Synthwave** | Neo-Tóquio em neon com motos de luz e pedestres em pixel art. **Clique no carro pra entrar**: câmbio, painel, retrovisores, farol alto, buzina, curvas, olhar pela janela, cabeça pra fora do teto solar e a copiloto holográfica Greta. A rádio Nightdrive FM tem um locutor, o DJ Nox. Jogo: Outrun Neon. |
| **Frutiger Aero** | Um parque 3D de verdade, com bonecos de vidro líquido coloridos fazendo piquenique, ping-pong, empinando pipa e soprando bolhas, seguindo a hora do dia (manhã, fim de tarde e noite com vaga-lumes). **"Passear no parque"** deixa você andar por ele e conversar com cada um. Jogo: Estoura-Bolhas. |
| **Gen X Soft Club** | Computador dos anos 2000 no estilo Luna, com céu de verão e morro verde. Jogo: Cobrinha no celular. |

Em todas: tela de boot com som sintetizado, janelas que arrastam e minimizam, barra de tarefas, menu iniciar, relógio, rádio temática (vídeos do YouTube, em volume baixo) e sons de interface feitos por código.

## Jogos

| Jogo | Onde roda | Recorde |
|---|---|---|
| Jogo da Memória | todas | menos tentativas |
| Truco Paulista (1 contra 1) | todas | — |
| Tamagochi | Vaporwave | dias de vida |
| Outrun Neon | Synthwave | distância |
| Estoura-Bolhas | Frutiger Aero | pontos |
| Cobrinha | Soft Club | pontos |

Os recordes e o bichinho do Tamagochi ficam salvos no navegador. Os jogos de uma estética só abrem nela; nas outras aparecem com um atalho pra trocar de estética.

## Como rodar

Precisa do Node.js 20 ou mais novo.

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. Não precisa de conta, login nem arquivo `.env`.

Versão de produção:

```bash
npm run build
npm start
```

## Desempenho

As cenas foram pensadas pra rodar em PC modesto:

- O parque do Frutiger usa WebGL 1 e ajusta a resolução sozinho. O parque fica em 30 quadros por segundo e, se o computador não der conta, volta pra uma imagem parada.
- O Synthwave e o Vaporwave são desenhados em Canvas 2D; os papéis de parede dos dois ficam em 30 quadros por segundo.
- O parque 3D pode ser desligado na janela **Estéticas**.

## Estrutura

```
public/
└── assets/            papéis de parede, ícones e efeitos
src/
├── app/               página única (boot + desktop)
├── components/
│   ├── boot/          tela de boot
│   ├── desktop/       desktop, janelas, rádio e as cenas de cada estética
│   └── games/         jogos da janela Jogos
├── config/            estéticas, rádio, apps, jogos, nome do sistema
└── lib/               motores das cenas (parque 3D, cidade neon, lago), sons, truco
```

Pra trocar o nome do sistema, mexa em `src/config/system.ts`. As músicas de cada rádio ficam em `src/config/tracks.ts` (pelo código do vídeo no YouTube) e as conversas do parque em `src/lib/aeroNpcs.ts`.

## Tecnologias

Next.js 16 (App Router, TypeScript, Turbopack), React 19, Tailwind CSS 4, WebGL 1, Canvas 2D, Web Audio API e YouTube IFrame Player API. Sem banco de dados, sem bibliotecas de 3D e sem bibliotecas de interface.
