import type { Prisma, Book } from "@/generated/prisma/client";
import { db } from "@/lib/db";

type DbClient = typeof db | Prisma.TransactionClient;

/** Recomputa avg/count cacheados no Book a partir das reviews existentes.
 * Chamar sempre dentro da mesma transação da gravação/remoção da review. */
export async function recomputeBookRating(tx: DbClient, bookId: string) {
  const agg = await tx.review.aggregate({
    where: { bookId },
    _avg: { rating: true },
    _count: true,
  });
  await tx.book.update({
    where: { id: bookId },
    data: { avg: agg._avg.rating ?? 0, count: agg._count },
  });
}

/** Formato consumido pelo front (mesmo shape de lib/types.ts Book). */
export function serializeBook(book: Book) {
  return {
    id: book.id,
    title: book.title,
    authors: book.authors,
    year: book.year,
    pages: book.pages,
    genre: book.genre,
    gradient: [book.gradientFrom, book.gradientTo] as [string, string],
    avg: book.avg,
    count: book.count,
    synopsis: book.synopsis,
  };
}
