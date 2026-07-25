import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeBook } from "@/lib/books";
import { getGoogleBook } from "@/lib/books/google";

/** Payload único que alimenta a página do livro: info + agregados +
 * estado do viewer (estante, nota/review, tags, citações).
 *
 * Livros do catálogo semeado vêm direto do banco. Um id ausente é buscado
 * no Google Books: se existir lá, vira uma linha nova no catálogo (upsert)
 * pra estante/review/tags/citações funcionarem dali em diante; se não
 * existir (404) ou o Google falhar (rede/5xx/quota), o erro é explícito —
 * nunca uma tela vazia ou um 404 mascarando uma falha de acesso. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;

  let book = await db.book.findUnique({ where: { id: params.id } });

  if (!book) {
    let googleBook;
    try {
      googleBook = await getGoogleBook(params.id);
    } catch (err) {
      console.error("[books/:id] Google Books falhou:", err);
      return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
    }
    if (!googleBook) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const [gradientFrom, gradientTo] = googleBook.gradient;
    book = await db.book.create({
      data: {
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
    });
  }

  const [entry, review, tags, quotes] = await Promise.all([
    db.shelfEntry.findUnique({ where: { userId_bookId: { userId: uid, bookId: book.id } } }),
    db.review.findUnique({ where: { userId_bookId: { userId: uid, bookId: book.id } } }),
    db.bookTag.findMany({
      where: { userId: uid, bookId: book.id },
      select: { tag: true },
      orderBy: { tag: "asc" },
    }),
    db.quote.findMany({ where: { userId: uid, bookId: book.id }, orderBy: { createdAt: "asc" } }),
  ]);

  return NextResponse.json({
    book: serializeBook(book),
    entry,
    rating: review?.rating ?? null,
    myReviewTitle: review?.title ?? null,
    myReview: review?.text ?? null,
    tags: tags.map((t) => t.tag),
    quotes: quotes.map((q) => ({ id: q.id, text: q.text, page: q.page ?? undefined })),
  });
}
