import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { BOOKS } from "../src/data/books";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

/** Popula o catálogo semeado (Spec 0/3a). Google Books fica como
 * enriquecimento futuro — ver docs/specs/spec-3a. Idempotente: pode rodar
 * de novo sem duplicar (upsert por id), sem sobrescrever avg/count reais. */
async function main() {
  for (const book of BOOKS) {
    const [gradientFrom, gradientTo] = book.gradient;
    await db.book.upsert({
      where: { id: book.id },
      create: {
        id: book.id,
        title: book.title,
        authors: book.authors,
        year: book.year,
        pages: book.pages,
        genre: book.genre,
        gradientFrom,
        gradientTo,
        synopsis: book.synopsis,
        avg: book.avg,
        count: book.count,
      },
      update: {
        title: book.title,
        authors: book.authors,
        year: book.year,
        pages: book.pages,
        genre: book.genre,
        gradientFrom,
        gradientTo,
        synopsis: book.synopsis,
      },
    });
  }
  console.log(`Seed: ${BOOKS.length} livros no catálogo.`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await db.$disconnect();
    process.exit(1);
  });
