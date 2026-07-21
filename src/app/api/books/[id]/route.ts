import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeBook } from "@/lib/books";

/** Payload único que alimenta a página do livro: info + agregados +
 * estado do viewer (estante, nota/review, tags, citações). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;

  const book = await db.book.findUnique({ where: { id: params.id } });
  if (!book) return NextResponse.json({ error: "não encontrado" }, { status: 404 });

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
    myReview: review?.text ?? null,
    tags: tags.map((t) => t.tag),
    quotes: quotes.map((q) => ({ id: q.id, text: q.text, page: q.page ?? undefined })),
  });
}
