import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreateBook, serializeBook } from "@/lib/books";

/** Payload único que alimenta a página do livro: info + agregados +
 * estado do viewer (estante, nota/review, tags, citações).
 *
 * Livros do catálogo semeado vêm direto do banco. Um id ausente (ou stale)
 * é buscado no Google Books via getOrCreateBook — upsert idempotente, sem
 * risco de 500 por corrida em duas requisições simultâneas pro mesmo id
 * novo. Se não existir lá (404) ou o Google falhar (rede/5xx/quota), o
 * erro é explícito — nunca uma tela vazia ou um 404 mascarando uma falha
 * de acesso. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;

  let book;
  try {
    book = await getOrCreateBook(params.id);
  } catch (err) {
    console.error("[books/:id] Google Books falhou:", err);
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }
  if (!book) return NextResponse.json({ error: "not_found" }, { status: 404 });

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
