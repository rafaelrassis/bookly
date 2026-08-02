import { db } from "@/lib/db";
import { searchGoogleBooks } from "@/lib/books/google";
import { getOrCreateBook } from "@/lib/books";
import type { GoodreadsRow } from "./goodreads";

export type ResolveBudget = { googleCalls: number; max: number };

type ResolveResult = { book: { id: string } } | { notFound: true } | { skipped: "cap" };

/** Persiste o ISBN da linha no Book resolvido, se ele ainda não tiver um —
 * assim a próxima linha (deste import ou de outro usuário) com o mesmo ISBN
 * bate no banco (passo 1) e não gasta cota do Google de novo. Best-effort:
 * corrida rara com outro import resolvendo o mesmo ISBN para um Book
 * diferente violaria o @unique — ignorado, não é fatal pro import. */
async function rememberIsbn(bookId: string, isbn: string | null) {
  if (!isbn) return;
  const book = await db.book.findUnique({ where: { id: bookId }, select: { isbn: true } });
  if (book?.isbn) return;
  await db.book.update({ where: { id: bookId }, data: { isbn } }).catch(() => {});
}

/** Resolve uma linha do Goodreads pro id de Book do catálogo, minimizando
 * chamadas ao Google Books (cota compartilhada por todo o app — ver spec
 * §1): banco por ISBN primeiro (grátis), Google por ISBN depois (preciso),
 * Google por título+autor como último recurso (mais ruído, mesmo custo).
 * Nunca inventa match: sem resultado, retorna notFound. */
export async function resolveBook(
  row: GoodreadsRow,
  budget: ResolveBudget,
): Promise<ResolveResult> {
  if (row.isbn) {
    const local = await db.book.findUnique({ where: { isbn: row.isbn }, select: { id: true } });
    if (local) return { book: local };
  }

  if (budget.googleCalls >= budget.max) return { skipped: "cap" };

  if (row.isbn) {
    budget.googleCalls++;
    const hits = await searchGoogleBooks(`isbn:${row.isbn}`).catch(() => ({ books: [], more: [] }));
    const gid = hits.books[0]?.id;
    if (gid) {
      const book = await getOrCreateBook(gid);
      if (book) {
        await rememberIsbn(book.id, row.isbn);
        return { book };
      }
    }
  }

  if (budget.googleCalls >= budget.max) return { skipped: "cap" };

  budget.googleCalls++;
  const q = `intitle:${row.title}${row.author ? `+inauthor:${row.author}` : ""}`;
  const hits = await searchGoogleBooks(q).catch(() => ({ books: [], more: [] }));
  const gid = hits.books[0]?.id;
  if (gid) {
    const book = await getOrCreateBook(gid);
    if (book) {
      await rememberIsbn(book.id, row.isbn);
      return { book };
    }
  }

  return { notFound: true };
}
