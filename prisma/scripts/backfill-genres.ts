/**
 * Backfill único (não roda automaticamente no build) pra reaplicar o mapa de
 * normalização de gênero (src/lib/books/genre-map.ts) em cima dos livros já
 * salvos com categoria crua do Google Books. Rodar manualmente:
 * `npx tsx prisma/scripts/backfill-genres.ts`.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { normalizeGenre } from "../../src/lib/books/genre-map";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log("backfill-genres: sem DATABASE_URL, abortando.");
    return;
  }

  const adapter = new PrismaPg({ connectionString });
  const db = new PrismaClient({ adapter });

  try {
    const books = await db.book.findMany({ select: { id: true, genre: true } });
    let updated = 0;

    for (const book of books) {
      const normalized = normalizeGenre(book.genre);
      if (normalized !== book.genre) {
        await db.book.update({ where: { id: book.id }, data: { genre: normalized } });
        updated++;
      }
    }

    console.log(`Backfill concluído: ${updated}/${books.length} livros atualizados.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error("backfill-genres: falhou:", err);
  process.exit(1);
});
