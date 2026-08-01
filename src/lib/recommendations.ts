import { db } from "@/lib/db";
import { serializeBook } from "@/lib/books";

/** "Quem leu isso também leu": co-ocorrência de estantes via self-join em
 * ReadingEvent — sem ML, só contagem de quantos usuários leram os dois
 * livros. Livros já na estante do viewer (`excludeShelfBookIds`) são
 * descartados do top 10 antes de virar livro; com pouco volume isso pode
 * legitimamente zerar a lista — cold-start é esperado, não bug. */
export async function getCoOccurrenceRecommendations(bookId: string, excludeShelfBookIds: string[] = []) {
  const results = await db.$queryRaw<{ bookId: string; coCount: bigint }[]>`
    WITH user_books AS (
      SELECT DISTINCT "userId", "bookId" FROM "ReadingEvent"
    )
    SELECT ub2."bookId" as "bookId", COUNT(DISTINCT ub2."userId") as "coCount"
    FROM user_books ub1
    JOIN user_books ub2 ON ub1."userId" = ub2."userId" AND ub2."bookId" != ub1."bookId"
    WHERE ub1."bookId" = ${bookId}
    GROUP BY ub2."bookId"
    ORDER BY "coCount" DESC
    LIMIT 10
  `;

  const filtered = results.filter((r) => !excludeShelfBookIds.includes(r.bookId));
  if (filtered.length === 0) return [];

  const books = await db.book.findMany({ where: { id: { in: filtered.map((r) => r.bookId) } } });
  const byId = new Map(books.map((b) => [b.id, b]));

  return filtered
    .map((r) => byId.get(r.bookId))
    .filter((b) => b !== undefined)
    .map((b) => serializeBook(b));
}
