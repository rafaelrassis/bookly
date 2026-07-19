import type { Book } from "@/lib/types";

export const GENRES = [
  "Fantasia",
  "Romance",
  "Thriller",
  "Ficção científica",
  "Clássicos",
  "Literatura brasileira",
  "Terror",
  "Não ficção",
  "Poesia",
  "Young Adult",
];

export const BOOKS: Book[] = [
  {
    id: "o-nome-do-vento",
    title: "O Nome do Vento",
    authors: "Patrick Rothfuss",
    year: 2007,
    pages: 656,
    gradient: ["#5B7553", "#1E2B1A"],
    avg: 4.6,
    count: 12840,
    synopsis:
      "Kvothe, lenda viva escondida como taverneiro, narra a própria história: a infância numa trupe de artistas, a tragédia que o deixou órfão e os anos na Universidade em busca do nome do vento.",
    reviews: [
      {
        user: "@leituras.do.pedro",
        rating: 5,
        text: "A prosa do Rothfuss é música. Kvothe é arrogante, brilhante e impossível de largar.",
      },
      {
        user: "@ana.entre.livros",
        rating: 4,
        text: "Fantasia com cheiro de taverna e magia com regras. Só sofro esperando o terceiro livro.",
      },
    ],
  },
  {
    id: "torto-arado",
    title: "Torto Arado",
    authors: "Itamar Vieira Junior",
    year: 2019,
    pages: 264,
    gradient: ["#C96F2F", "#54250B"],
    avg: 4.7,
    count: 9312,
    synopsis:
      "No sertão da Chapada Diamantina, as irmãs Bibiana e Belonísia partilham um segredo e uma voz. Uma saga sobre terra, herança escravocrata e as mulheres que sustentam o mundo.",
    reviews: [
      {
        user: "@clube.da.lida",
        rating: 5,
        text: "Um soco no estômago escrito com poesia. Melhor romance brasileiro dos últimos anos.",
      },
      {
        user: "@joao.releituras",
        rating: 4.5,
        text: "A força das irmãs carrega o livro. A última parte muda tudo o que você leu antes.",
      },
    ],
  },
  {
    id: "a-paciente-silenciosa",
    title: "A Paciente Silenciosa",
    authors: "Alex Michaelides",
    year: 2019,
    pages: 352,
    gradient: ["#3E5C76", "#141F2C"],
    avg: 4.1,
    count: 15204,
    synopsis:
      "Alicia atira cinco vezes no marido e nunca mais diz uma palavra. Theo, psicoterapeuta obcecado pelo caso, decide fazê-la falar — e descobre que o silêncio dela tem um preço.",
    reviews: [
      {
        user: "@thrillers.da.bia",
        rating: 4.5,
        text: "O plot twist me pegou desprevenida de verdade. Li em duas noites.",
      },
    ],
  },
  {
    id: "duna",
    title: "Duna",
    authors: "Frank Herbert",
    year: 1965,
    pages: 680,
    gradient: ["#D9A441", "#6E3E0E"],
    avg: 4.5,
    count: 18773,
    synopsis:
      "Em Arrakis, planeta-deserto onde se colhe a especiaria mais valiosa do universo, Paul Atreides enfrenta traição, profecia e vermes colossais para reivindicar seu destino.",
    reviews: [
      {
        user: "@sci.fi.carol",
        rating: 5,
        text: "Política, ecologia e religião num deserto só. A ficção científica nunca mais foi a mesma.",
      },
      {
        user: "@marcos.hardsf",
        rating: 4,
        text: "Denso no começo, mas quando engrena vira uma das melhores construções de mundo já escritas.",
      },
    ],
  },
  {
    id: "o-homem-de-giz",
    title: "O Homem de Giz",
    authors: "C.J. Tudor",
    year: 2018,
    pages: 352,
    gradient: ["#8E9AAF", "#333B4D"],
    avg: 3.9,
    count: 7625,
    synopsis:
      "Em 1986, desenhos de giz eram o código secreto de um grupo de amigos — até um deles levar a um corpo. Trinta anos depois, os bonecos de giz voltam a aparecer.",
    reviews: [
      {
        user: "@suspense.na.estante",
        rating: 4,
        text: "Nostalgia à la Stranger Things com um mistério que fecha direitinho no final.",
      },
    ],
  },
  {
    id: "verity",
    title: "Verity",
    authors: "Colleen Hoover",
    year: 2018,
    pages: 336,
    gradient: ["#7B2D3B", "#250C12"],
    avg: 4.0,
    count: 21458,
    synopsis:
      "Contratada para terminar a série da escritora Verity Crawford, Lowen encontra na casa da autora um manuscrito que nunca deveria ter sido lido — uma confissão aterrorizante.",
    reviews: [
      {
        user: "@lu.devora.livros",
        rating: 4.5,
        text: "Perturbador do início ao fim. Aquele epílogo ainda mora na minha cabeça.",
      },
      {
        user: "@rafa.pagina42",
        rating: 3.5,
        text: "Viciante, impossível soltar, mas algumas escolhas da trama pediram muita boa vontade.",
      },
    ],
  },
  {
    id: "1984",
    title: "1984",
    authors: "George Orwell",
    year: 1949,
    pages: 416,
    gradient: ["#A63A3A", "#1C1C1E"],
    avg: 4.6,
    count: 30125,
    synopsis:
      "Winston Smith reescreve o passado para o Partido enquanto o Grande Irmão vigia cada gesto. Amar, lembrar e pensar viraram crimes — e ele decide cometer os três.",
    reviews: [
      {
        user: "@classicos.do.caio",
        rating: 5,
        text: "Cada releitura fica mais atual, e isso é a parte mais assustadora.",
      },
      {
        user: "@leitora.no.metro",
        rating: 4.5,
        text: "Sufocante no melhor sentido. O apêndice sobre a novilíngua é genial.",
      },
    ],
  },
  {
    id: "ensaio-sobre-a-cegueira",
    title: "Ensaio sobre a Cegueira",
    authors: "José Saramago",
    year: 1995,
    pages: 312,
    gradient: ["#CFC9BC", "#615B4F"],
    avg: 4.4,
    count: 11207,
    synopsis:
      "Uma cegueira branca se espalha sem explicação e a civilização desaba em dias. Entre o horror, a mulher do médico — a única que vê — guia um grupo pelo colapso.",
    reviews: [
      {
        user: "@saramaguiana",
        rating: 5,
        text: "As frases sem pausa parecem difíceis, mas viram hipnose. Devastador e necessário.",
      },
      {
        user: "@leituras.do.pedro",
        rating: 4,
        text: "Duro de ler pela crueza, impossível de esquecer pela humanidade.",
      },
    ],
  },
];

export function getBook(id: string): Book | undefined {
  return BOOKS.find((b) => b.id === id);
}
