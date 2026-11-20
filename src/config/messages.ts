export type Notice = { kind: "erro" | "aviso"; title: string; text: string };

// ?erro=chave ou ?aviso=chave na URL vira uma caixa de diálogo no desktop
export const NOTICES: Record<string, Notice> = {
  "erro-generico": {
    kind: "erro",
    title: "Algo deu errado",
    text: "Ocorreu um erro inesperado. Tente novamente.",
  },
};
