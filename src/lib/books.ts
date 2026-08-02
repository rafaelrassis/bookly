import type { Prisma, Book } from "@/generated/prisma/client";
import type { Book as ApiBook } from "@/lib/types";
import { db } from "@/lib/db";
import { getGoogleBook } from "@/lib/books/google";

type DbClient = typeof db | Prisma.TransactionClient;

const STALE_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

/** Única porta de entrada pra livros do Google Books no catálogo. Upsert
 * idempotente: concorrência (duas requisições buscando o mesmo id novo ao
 * mesmo tempo) nunca gera 500 por violação de unicidade — a segunda
 * chamada apenas atualiza os campos voláteis (capa/sinopse) por cima da
 * primeira. Snapshot revalidado no Google quando mais velho que STALE_MS.
 *
 * Retorna `null` só quando o id não existe nem no catálogo nem no Google
 * (404); falhas de acesso ao Google (rede/5xx/quota) lançam — cabe à rota
 * decidir o 502, nunca mascarar como "não encontrado". */
export async function getOrCreateBook(id: string): Promise<Book | null> {
  const existing = await db.book.findUnique({ where: { id } });
  const isStale = existing && Date.now() - existing.updatedAt.getTime() > STALE_MS;
  if (existing && !isStale) return existing;

  const googleBook = await getGoogleBook(id);
  if (!googleBook) return existing ?? null;

  const [gradientFrom, gradientTo] = googleBook.gradient;
  return db.book.upsert({
    where: { id },
    create: {
      id: googleBook.id,
      title: googleBook.title,
      authors: googleBook.authors,
      year: googleBook.year,
      pages: googleBook.pages,
      genre: googleBook.genre,
      gradientFrom,
      gradientTo,
      synopsis: googleBook.synopsis,
      coverUrl: googleBook.coverUrl,
      avg: googleBook.avg,
      count: googleBook.count,
    },
    update: {
      title: googleBook.title,
      authors: googleBook.authors,
      synopsis: googleBook.synopsis,
      coverUrl: googleBook.coverUrl,
    },
  });
}

/** Grava/atualiza em lote os volumes vindos da busca do Google, para o
 * catálogo local crescer a cada pesquisa. Falha aqui nunca quebra a busca. */
export async function cacheGoogleBooks(books: ApiBook[]): Promise<void> {
  await Promise.allSettled(
    books.map((b) => {
      const [gradientFrom, gradientTo] = b.gradient;
      const data = {
        title: b.title,
        authors: b.authors,
        year: b.year,
        pages: b.pages,
        genre: b.genre,
        gradientFrom,
        gradientTo,
        synopsis: b.synopsis,
        coverUrl: b.coverUrl,
        isbn: b.isbn ?? null,
        isbn10: b.isbn10 ?? null,
      };
      return db.book.upsert({
        where: { id: b.id },
        create: { id: b.id, avg: b.avg, count: b.count, ...data },
        update: {
          title: data.title,
          authors: data.authors,
          synopsis: data.synopsis,
          coverUrl: data.coverUrl,
          isbn10: data.isbn10,
        },
      });
    }),
  );
}

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
    coverUrl: book.coverUrl ?? undefined,
  };
}
