import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { yearRange } from "@/lib/date-range";

function parseYear(yearStr: string): number | null {
  const year = Number(yearStr);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;
  return year;
}

/** "Seu {ano} em livros": livros lidos, páginas, gêneros mais lidos e nota
 * média do ano, derivados de ShelfEntry READ com finishedAt no ano (mesma
 * janela usada pela meta de leitura, ver /api/goals/[year]).
 *
 * `topGenres` usa Book.genre (hoje um único gênero por livro, não um array —
 * ver nota em docs/ESPECIFICACAO.md) como se fosse uma lista de 1 item. */
export async function GET(_req: Request, { params }: { params: { year: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const year = parseYear(params.year);
  if (year === null) return NextResponse.json({ error: "ano inválido" }, { status: 400 });

  const { start, end } = yearRange(year);
  const userId = session.user.id;

  const entries = await db.shelfEntry.findMany({
    where: { userId, status: "READ", finishedAt: { gte: start, lt: end } },
    select: { book: { select: { id: true, pages: true, genre: true } } },
  });

  const booksRead = entries.length;
  const pagesRead = entries.reduce((sum, e) => sum + e.book.pages, 0);

  const genreCount = new Map<string, number>();
  for (const e of entries) {
    genreCount.set(e.book.genre, (genreCount.get(e.book.genre) ?? 0) + 1);
  }
  const topGenres = Array.from(genreCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre, count]) => ({ genre, count }));

  const bookIds = entries.map((e) => e.book.id);
  const reviews = bookIds.length
    ? await db.review.findMany({
        where: { userId, bookId: { in: bookIds } },
        select: { rating: true },
      })
    : [];
  const avgRating =
    reviews.length > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
      : null;

  return NextResponse.json({ year, booksRead, pagesRead, topGenres, avgRating });
}
