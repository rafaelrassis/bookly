/**
 * Fixture mínima do catálogo/comunidade pra suíte Playwright — o app não
 * semeia mais nada em nenhum ambiente, mas os specs batem em ids fixos de
 * livro (books/clubs/social) e o C5 de social.spec.ts precisa que a leitora
 * sugerida em "Descobrir leitores" já tenha uma review pra "Seguindo" não
 * ficar vazio. `createdAt` default (now) garante que essa leitora é a mais
 * antiga da tabela — logo a primeira sugestão — já que ela é inserida antes
 * de qualquer conta criada pelos specs. Roda uma vez antes de todos os
 * testes, direto no Postgres de teste (nunca no seed do Prisma).
 */
import "dotenv/config";
import { Client } from "pg";

const FIXTURE_BOOKS = [
  {
    id: "duna",
    title: "Duna",
    authors: "Frank Herbert",
    year: 1965,
    pages: 680,
    genre: "Ficção científica",
    gradientFrom: "#D9A441",
    gradientTo: "#6E3E0E",
    synopsis: "Fixture de teste E2E — não é dado real de produto.",
  },
  {
    id: "1984",
    title: "1984",
    authors: "George Orwell",
    year: 1949,
    pages: 416,
    genre: "Clássicos",
    gradientFrom: "#A63A3A",
    gradientTo: "#1C1C1E",
    synopsis: "Fixture de teste E2E — não é dado real de produto.",
  },
  {
    id: "verity",
    title: "Verity",
    authors: "Colleen Hoover",
    year: 2018,
    pages: 336,
    genre: "Romance",
    gradientFrom: "#7B2D3B",
    gradientTo: "#250C12",
    synopsis: "Fixture de teste E2E — não é dado real de produto.",
  },
  {
    id: "torto-arado",
    title: "Torto Arado",
    authors: "Itamar Vieira Junior",
    year: 2019,
    pages: 264,
    genre: "Literatura brasileira",
    gradientFrom: "#C96F2F",
    gradientTo: "#54250B",
    synopsis: "Fixture de teste E2E — não é dado real de produto.",
  },
  {
    id: "ensaio-sobre-a-cegueira",
    title: "Ensaio sobre a Cegueira",
    authors: "José Saramago",
    year: 1995,
    pages: 312,
    genre: "Clássicos",
    gradientFrom: "#CFC9BC",
    gradientTo: "#615B4F",
    synopsis: "Fixture de teste E2E — não é dado real de produto.",
  },
];

const FIXTURE_READER = {
  id: "e2e-fixture-reader",
  email: "e2e.fixture.reader@example.com",
  username: "e2e_fixture_reader",
  name: "Leitora Fixture E2E",
};

export default async function globalSetup() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    for (const book of FIXTURE_BOOKS) {
      await client.query(
        `INSERT INTO "Book" (id, title, authors, year, pages, genre, "gradientFrom", "gradientTo", synopsis, "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
         ON CONFLICT (id) DO NOTHING`,
        [book.id, book.title, book.authors, book.year, book.pages, book.genre, book.gradientFrom, book.gradientTo, book.synopsis]
      );
    }

    await client.query(
      `INSERT INTO "User" (id, email, username, name, "passwordHash", "updatedAt")
       VALUES ($1, $2, $3, $4, 'not-a-real-login', now())
       ON CONFLICT (id) DO NOTHING`,
      [FIXTURE_READER.id, FIXTURE_READER.email, FIXTURE_READER.username, FIXTURE_READER.name]
    );
    await client.query(
      `INSERT INTO "Review" (id, "userId", "bookId", rating, text, "updatedAt")
       VALUES ('e2e-fixture-review', $1, 'duna', 4.5, 'Review fixture pro C5 do e2e (feed "Seguindo" não pode ficar vazio).', now())
       ON CONFLICT (id) DO NOTHING`,
      [FIXTURE_READER.id]
    );
    await client.query(
      `UPDATE "Book" SET avg = 4.5, count = 1 WHERE id = 'duna' AND count = 0`
    );
  } finally {
    await client.end();
  }
}
