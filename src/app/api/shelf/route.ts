import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeBook } from "@/lib/books";

/** Busca case-insensitive; acentos também são ignorados (mesma normalização do front). */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "");
}

/** Livros da estante do usuário com filtros compostos (status/gênero/tag/busca).
 * Também retorna os gêneros/tags disponíveis (sobre a estante inteira, não
 * filtrada) pra montar os chips. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const genre = url.searchParams.get("genre");
  const tag = url.searchParams.get("tag");
  const q = normalize(url.searchParams.get("q")?.trim() ?? "");

  const [entries, tagRows, reviews] = await Promise.all([
    db.shelfEntry.findMany({ where: { userId: uid }, include: { book: true } }),
    db.bookTag.findMany({ where: { userId: uid } }),
    db.review.findMany({ where: { userId: uid }, select: { bookId: true, rating: true } }),
  ]);

  const tagsByBook = new Map<string, string[]>();
  for (const row of tagRows) {
    tagsByBook.set(row.bookId, [...(tagsByBook.get(row.bookId) ?? []), row.tag]);
  }
  const ratingByBook = new Map(reviews.map((r) => [r.bookId, r.rating]));

  const genres = Array.from(new Set(entries.map((e) => e.book.genre))).sort();
  const tags = Array.from(new Set(tagRows.map((t) => t.tag))).sort();

  const items = entries
    .map((e) => ({
      book: serializeBook(e.book),
      entry: {
        status: e.status,
        currentPage: e.currentPage,
        lastPage: e.lastPage,
        startedAt: e.startedAt,
        finishedAt: e.finishedAt,
      },
      tags: (tagsByBook.get(e.bookId) ?? []).sort(),
      rating: ratingByBook.get(e.bookId) ?? null,
    }))
    .filter(({ book, entry, tags: bookTags }) => {
      if (q && !normalize(book.title).includes(q) && !normalize(book.authors).includes(q)) return false;
      if (status && entry.status !== status) return false;
      if (genre && book.genre !== genre) return false;
      if (tag && !bookTags.includes(tag)) return false;
      return true;
    });

  return NextResponse.json({ items, genres, tags });
}
