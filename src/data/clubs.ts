import type { Club } from "@/lib/types";

/** Clubes do livro (mock). O estado vivo (joined, mural) fica no store. */
export const CLUBS: Club[] = [
  {
    id: "clube-da-fantasia",
    name: "Clube da Fantasia",
    bookId: "o-nome-do-vento",
    members: 24,
    joined: true,
    desc: "Um mundo novo por mês, sempre com magia. Em julho: a Crônica do Matador do Rei.",
    feed: [
      {
        user: "@leituras.do.vale",
        text: "Gente, o capítulo da Universidade me quebrou. Alguém mais achou o Ambrose insuportável no melhor sentido?",
      },
      {
        user: "@ana.estante",
        text: "Meta da semana: chegar na pág. 400 até domingo. Quem topa uma leitura conjunta na sexta?",
      },
    ],
  },
  {
    id: "sextou-com-suspense",
    name: "Sextou com Suspense",
    bookId: "a-paciente-silenciosa",
    members: 57,
    joined: false,
    desc: "Toda sexta um thriller novo pra discutir no fim de semana. Spoilers só com aviso!",
    feed: [
      {
        user: "@thriller.gab",
        text: "Regra de ouro do clube: quem descobrir o twist antes da metade conta no mural — sem spoiler — só pra gente medir quem é o detetive da turma.",
      },
    ],
  },
];
