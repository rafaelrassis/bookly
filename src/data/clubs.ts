import type { Club } from "@/lib/types";

/** Clubes do livro (mock). O estado vivo (joined, mural) fica no store. */
export const CLUBS: Club[] = [
  {
    id: "clube-da-fantasia",
    name: "Clube da Fantasia",
    bookId: "o-nome-do-vento",
    members: 24,
    joined: true,
    visibility: "public",
    desc: "Um mundo novo por mês, sempre com magia. Em julho: a Crônica do Matador do Rei.",
    memberProgress: {
      "@leituras.do.vale": 78,
      "@ana.estante": 61,
      "@pedro_lê": 35,
    },
    feed: [
      {
        id: "cf1",
        user: "@leituras.do.vale",
        time: "09:12",
        text: "Gente, o capítulo da Universidade me quebrou. Alguém mais achou o Ambrose insuportável no melhor sentido?",
      },
      {
        id: "cf2",
        user: "@ana.estante",
        time: "10:40",
        text: "Meta da semana: chegar na pág. 400 até domingo. Quem topa uma leitura conjunta na sexta? @leituras.do.vale cola!",
        replyTo: {
          user: "@leituras.do.vale",
          text: "Gente, o capítulo da Universidade me quebrou.",
        },
      },
      {
        id: "cf3",
        user: "@leituras.do.vale",
        time: "11:02",
        text: "📖 @leituras.do.vale avançou para 78% de O Nome do Vento",
        system: true,
      },
    ],
  },
  {
    id: "sextou-com-suspense",
    name: "Sextou com Suspense",
    bookId: "a-paciente-silenciosa",
    members: 57,
    joined: false,
    visibility: "public",
    desc: "Toda sexta um thriller novo pra discutir no fim de semana. Spoilers só com aviso!",
    memberProgress: {
      "@thriller.gab": 90,
      "@rafa.books": 45,
    },
    feed: [
      {
        id: "ss1",
        user: "@thriller.gab",
        time: "18:25",
        text: "Regra de ouro do clube: quem descobrir o twist antes da metade conta no mural — sem spoiler — só pra gente medir quem é o detetive da turma.",
      },
    ],
  },
  {
    id: "sociedade-do-anel-de-leitura",
    name: "Sociedade do Anel de Leitura",
    bookId: "duna",
    members: 9,
    joined: true,
    visibility: "private",
    code: "KVX7Q2",
    desc: "Clube fechado dos amigos de longa data. Um tijolo de fantasia ou ficção científica por bimestre.",
    memberProgress: {
      "@caio_reads": 66,
      "@ana.estante": 40,
    },
    feed: [
      {
        id: "sa1",
        user: "@caio_reads",
        time: "20:15",
        text: "O glossário no fim do Duna salvou minha leitura inteira. Usem sem medo.",
      },
      {
        id: "sa2",
        user: "@caio_reads",
        time: "21:03",
        text: "📖 @caio_reads avançou para 66% de Duna",
        system: true,
      },
    ],
  },
];
