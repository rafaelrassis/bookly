export type PublicReview = {
  bookId: string;
  rating: number;
  title?: string;
  text: string;
};

export type PublicProfile = {
  username: string;
  name: string;
  bio: string;
  gradient: [string, string];
  followers: number;
  following: number;
  /** Livros favoritos (até 4), em ordem de destaque. */
  top4: string[];
  ratings: Record<string, number>;
  reviews: PublicReview[];
  /** Livros já lidos, para a estatística "lidos". */
  readIds: string[];
};

/** Perfis públicos mocados do feed, com favoritos, notas e reviews. */
export const MOCK_USERS: Record<string, PublicProfile> = {
  "@ana.estante": {
    username: "@ana.estante",
    name: "Ana",
    bio: "Literatura brasileira e um chá sempre por perto.",
    gradient: ["#C4472F", "#6E2318"],
    followers: 312,
    following: 148,
    top4: ["torto-arado", "1984", "ensaio-sobre-a-cegueira"],
    ratings: { "torto-arado": 5, "1984": 4.5, "ensaio-sobre-a-cegueira": 4.5 },
    reviews: [
      {
        bookId: "torto-arado",
        rating: 5,
        title: "Um soco em forma de poesia",
        text: "Um soco no estômago escrito com poesia. Bibiana e Belonísia ainda moram na minha cabeça — melhor romance brasileiro que li em anos.",
      },
    ],
    readIds: ["torto-arado", "1984", "ensaio-sobre-a-cegueira"],
  },
  "@leituras.do.vale": {
    username: "@leituras.do.vale",
    name: "Vale",
    bio: "Fantasia épica e maratonas de leitura no fim de semana.",
    gradient: ["#5B7553", "#22301F"],
    followers: 259,
    following: 96,
    top4: ["o-nome-do-vento", "duna"],
    ratings: { "o-nome-do-vento": 5, duna: 4 },
    reviews: [
      {
        bookId: "o-nome-do-vento",
        rating: 5,
        text: "A prosa do Rothfuss é música. Kvothe é arrogante, brilhante e impossível de largar. Só sofro esperando o terceiro livro.",
      },
    ],
    readIds: ["o-nome-do-vento", "duna"],
  },
  "@thriller.gab": {
    username: "@thriller.gab",
    name: "Gabriel",
    bio: "Se tem plot twist, eu já li. Suspense é vício.",
    gradient: ["#3E5C76", "#1A2633"],
    followers: 204,
    following: 173,
    top4: ["a-paciente-silenciosa", "verity"],
    ratings: { "a-paciente-silenciosa": 4.5, verity: 4 },
    reviews: [
      {
        bookId: "a-paciente-silenciosa",
        rating: 4.5,
        text: "O plot twist me pegou completamente desprevenido. Li em duas noites e ainda voltei pra reler o começo procurando as pistas.",
      },
    ],
    readIds: ["a-paciente-silenciosa", "verity"],
  },
  "@pedro_lê": {
    username: "@pedro_lê",
    name: "Pedro",
    bio: "Distopias, ensaios e café preto.",
    gradient: ["#D9A441", "#7A4A12"],
    followers: 88,
    following: 120,
    top4: ["1984", "duna", "ensaio-sobre-a-cegueira"],
    ratings: { "1984": 4.5, duna: 4, "ensaio-sobre-a-cegueira": 4.5 },
    reviews: [
      {
        bookId: "1984",
        rating: 4.5,
        text: "Cada releitura fica mais atual, e isso é a parte mais assustadora. O apêndice sobre a novilíngua é genial.",
      },
    ],
    readIds: ["1984", "duna", "ensaio-sobre-a-cegueira"],
  },
  "@caio_reads": {
    username: "@caio_reads",
    name: "Caio",
    bio: "Construção de mundo é minha praia.",
    gradient: ["#7B2D3B", "#2C0F16"],
    followers: 141,
    following: 200,
    top4: ["duna", "torto-arado", "o-nome-do-vento"],
    ratings: { duna: 4, "torto-arado": 4.5, "o-nome-do-vento": 4.5 },
    reviews: [
      {
        bookId: "duna",
        rating: 4,
        text: "Denso no começo, mas quando engrena vira uma das melhores construções de mundo já escritas. Política, ecologia e religião num deserto só.",
      },
    ],
    readIds: ["duna", "torto-arado", "o-nome-do-vento"],
  },
  "@rafa.books": {
    username: "@rafa.books",
    name: "Rafa",
    bio: "Leio de tudo, julgo tudo com meia estrela de precisão.",
    gradient: ["#8E9AAF", "#3B4252"],
    followers: 167,
    following: 155,
    top4: ["verity", "a-paciente-silenciosa", "1984", "torto-arado"],
    ratings: { verity: 3.5, "a-paciente-silenciosa": 4, "1984": 4.5, "torto-arado": 5 },
    reviews: [
      {
        bookId: "verity",
        rating: 3.5,
        text: "Viciante, impossível soltar, mas algumas escolhas da trama pediram muita boa vontade. Aquele epílogo, porém… ainda penso nele.",
      },
    ],
    readIds: ["verity", "a-paciente-silenciosa", "1984", "torto-arado"],
  },
};

/** Gradientes de avatar disponíveis para o usuário escolher em Editar perfil. */
export const AVATAR_CHOICES: [string, string][] = [
  ["#E4A93C", "#8A5E12"],
  ["#5B7553", "#22301F"],
  ["#C4472F", "#6E2318"],
  ["#3E5C76", "#1A2633"],
  ["#6B4E8E", "#2A1E3D"],
  ["#B85C79", "#4A1F2E"],
];

export function avatarGradient(user: string): [string, string] {
  return MOCK_USERS[user]?.gradient ?? AVATAR_CHOICES[0];
}
