/** Dados de semente do catálogo e da comunidade — vivem fora de `src/` porque
 * não são código de produto (o app real lê tudo do banco / Google Books);
 * servem só para popular o banco via `npm run db:seed`. */

export type SeedBook = {
  id: string;
  title: string;
  authors: string;
  year: number;
  pages: number;
  genre: string;
  gradient: [string, string];
  synopsis: string;
};

export const BOOKS: SeedBook[] = [
  {
    id: "o-nome-do-vento",
    title: "O Nome do Vento",
    authors: "Patrick Rothfuss",
    year: 2007,
    pages: 656,
    genre: "Fantasia",
    gradient: ["#5B7553", "#1E2B1A"],
    synopsis:
      "Kvothe, lenda viva escondida como taverneiro, narra a própria história: a infância numa trupe de artistas, a tragédia que o deixou órfão e os anos na Universidade em busca do nome do vento.",
  },
  {
    id: "torto-arado",
    title: "Torto Arado",
    authors: "Itamar Vieira Junior",
    year: 2019,
    pages: 264,
    genre: "Literatura brasileira",
    gradient: ["#C96F2F", "#54250B"],
    synopsis:
      "No sertão da Chapada Diamantina, as irmãs Bibiana e Belonísia partilham um segredo e uma voz. Uma saga sobre terra, herança escravocrata e as mulheres que sustentam o mundo.",
  },
  {
    id: "a-paciente-silenciosa",
    title: "A Paciente Silenciosa",
    authors: "Alex Michaelides",
    year: 2019,
    pages: 352,
    genre: "Thriller",
    gradient: ["#3E5C76", "#141F2C"],
    synopsis:
      "Alicia atira cinco vezes no marido e nunca mais diz uma palavra. Theo, psicoterapeuta obcecado pelo caso, decide fazê-la falar — e descobre que o silêncio dela tem um preço.",
  },
  {
    id: "duna",
    title: "Duna",
    authors: "Frank Herbert",
    year: 1965,
    pages: 680,
    genre: "Ficção científica",
    gradient: ["#D9A441", "#6E3E0E"],
    synopsis:
      "Em Arrakis, planeta-deserto onde se colhe a especiaria mais valiosa do universo, Paul Atreides enfrenta traição, profecia e vermes colossais para reivindicar seu destino.",
  },
  {
    id: "o-homem-de-giz",
    title: "O Homem de Giz",
    authors: "C.J. Tudor",
    year: 2018,
    pages: 352,
    genre: "Thriller",
    gradient: ["#8E9AAF", "#333B4D"],
    synopsis:
      "Em 1986, desenhos de giz eram o código secreto de um grupo de amigos — até um deles levar a um corpo. Trinta anos depois, os bonecos de giz voltam a aparecer.",
  },
  {
    id: "verity",
    title: "Verity",
    authors: "Colleen Hoover",
    year: 2018,
    pages: 336,
    genre: "Romance",
    gradient: ["#7B2D3B", "#250C12"],
    synopsis:
      "Contratada para terminar a série da escritora Verity Crawford, Lowen encontra na casa da autora um manuscrito que nunca deveria ter sido lido — uma confissão aterrorizante.",
  },
  {
    id: "1984",
    title: "1984",
    authors: "George Orwell",
    year: 1949,
    pages: 416,
    genre: "Clássicos",
    gradient: ["#A63A3A", "#1C1C1E"],
    synopsis:
      "Winston Smith reescreve o passado para o Partido enquanto o Grande Irmão vigia cada gesto. Amar, lembrar e pensar viraram crimes — e ele decide cometer os três.",
  },
  {
    id: "ensaio-sobre-a-cegueira",
    title: "Ensaio sobre a Cegueira",
    authors: "José Saramago",
    year: 1995,
    pages: 312,
    genre: "Clássicos",
    gradient: ["#CFC9BC", "#615B4F"],
    synopsis:
      "Uma cegueira branca se espalha sem explicação e a civilização desaba em dias. Entre o horror, a mulher do médico — a única que vê — guia um grupo pelo colapso.",
  },
];

export type SeedReview = {
  bookId: string;
  rating: number;
  title?: string;
  text: string;
};

export type SeedProfile = {
  name: string;
  bio: string;
  top4: string[];
  reviews: SeedReview[];
};

/** Perfis públicos da comunidade semeada, com favoritos e reviews reais
 * (viram usuários de verdade em `seedCommunityUsers`, ver prisma/seed.ts). */
export const COMMUNITY_PROFILES: Record<string, SeedProfile> = {
  "@ana.estante": {
    name: "Ana",
    bio: "Literatura brasileira e um chá sempre por perto.",
    top4: ["torto-arado", "1984", "ensaio-sobre-a-cegueira"],
    reviews: [
      {
        bookId: "torto-arado",
        rating: 5,
        title: "Um soco em forma de poesia",
        text: "Um soco no estômago escrito com poesia. Bibiana e Belonísia ainda moram na minha cabeça — melhor romance brasileiro que li em anos.",
      },
    ],
  },
  "@leituras.do.vale": {
    name: "Vale",
    bio: "Fantasia épica e maratonas de leitura no fim de semana.",
    top4: ["o-nome-do-vento", "duna"],
    reviews: [
      {
        bookId: "o-nome-do-vento",
        rating: 5,
        text: "A prosa do Rothfuss é música. Kvothe é arrogante, brilhante e impossível de largar. Só sofro esperando o terceiro livro.",
      },
    ],
  },
  "@thriller.gab": {
    name: "Gabriel",
    bio: "Se tem plot twist, eu já li. Suspense é vício.",
    top4: ["a-paciente-silenciosa", "verity"],
    reviews: [
      {
        bookId: "a-paciente-silenciosa",
        rating: 4.5,
        text: "O plot twist me pegou completamente desprevenido. Li em duas noites e ainda voltei pra reler o começo procurando as pistas.",
      },
    ],
  },
  "@pedro_lê": {
    name: "Pedro",
    bio: "Distopias, ensaios e café preto.",
    top4: ["1984", "duna", "ensaio-sobre-a-cegueira"],
    reviews: [
      {
        bookId: "1984",
        rating: 4.5,
        text: "Cada releitura fica mais atual, e isso é a parte mais assustadora. O apêndice sobre a novilíngua é genial.",
      },
    ],
  },
  "@caio_reads": {
    name: "Caio",
    bio: "Construção de mundo é minha praia.",
    top4: ["duna", "torto-arado", "o-nome-do-vento"],
    reviews: [
      {
        bookId: "duna",
        rating: 4,
        text: "Denso no começo, mas quando engrena vira uma das melhores construções de mundo já escritas. Política, ecologia e religião num deserto só.",
      },
    ],
  },
  "@rafa.books": {
    name: "Rafa",
    bio: "Leio de tudo, julgo tudo com meia estrela de precisão.",
    top4: ["verity", "a-paciente-silenciosa", "1984", "torto-arado"],
    reviews: [
      {
        bookId: "verity",
        rating: 3.5,
        text: "Viciante, impossível soltar, mas algumas escolhas da trama pediram muita boa vontade. Aquele epílogo, porém… ainda penso nele.",
      },
    ],
  },
};

export type SeedList = {
  by: string;
  name: string;
  bookIds: string[];
};

/** Listas públicas semeadas, para a busca sem query ("Listas da comunidade")
 * não nascer vazia. */
export const SEED_LISTS: SeedList[] = [
  { by: "@caio_reads", name: "Clássicos que valem o hype", bookIds: ["1984", "ensaio-sobre-a-cegueira", "duna"] },
  { by: "@thriller.gab", name: "Thrillers de uma sentada", bookIds: ["a-paciente-silenciosa", "o-homem-de-giz", "verity"] },
];
