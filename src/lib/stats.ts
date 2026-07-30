import { db } from "@/lib/db";
import { yearRange } from "@/lib/date-range";

const HISTOGRAM_STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

export type UserStats = {
  readCount: number;
  pagesRead: number;
  reviewCount: number;
  avgRating: number;
  histogram: Record<string, number>;
  donatedCount: number;
  /** Subconjunto de `donatedCount` confirmado pelo recebedor — selo de confiança
   * (ver src/lib/trust-badge.ts). Sempre ≤ donatedCount. */
  confirmedCount: number;
};

/** Estatísticas do perfil derivadas de ShelfEntry/Review/Donation reais
 * (Spec 3a/3b + doação de livros). */
export async function userStats(userId: string): Promise<UserStats> {
  const [readEntries, readingEntries, reviews, donatedCount, confirmedCount] = await Promise.all([
    db.shelfEntry.findMany({
      where: { userId, status: "READ" },
      select: { book: { select: { pages: true } } },
    }),
    db.shelfEntry.findMany({
      where: { userId, status: "READING" },
      select: { currentPage: true },
    }),
    db.review.findMany({ where: { userId }, select: { rating: true, text: true } }),
    db.donation.count({ where: { donorId: userId, status: "DOADO" } }),
    db.donation.count({
      where: { donorId: userId, status: "DOADO", receiverConfirmedAt: { not: null } },
    }),
  ]);

  const readCount = readEntries.length;
  const pagesRead =
    readEntries.reduce((sum, e) => sum + e.book.pages, 0) +
    readingEntries.reduce((sum, e) => sum + (e.currentPage ?? 0), 0);
  const reviewCount = reviews.filter((r) => r.text !== "").length;

  const ratings = reviews.map((r) => r.rating);
  const avgRating =
    ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;

  const histogram: Record<string, number> = {};
  for (const step of HISTOGRAM_STEPS) histogram[step] = 0;
  for (const rating of ratings) {
    const key = String(rating);
    if (key in histogram) histogram[key] += 1;
  }

  return { readCount, pagesRead, reviewCount, avgRating, histogram, donatedCount, confirmedCount };
}

export type YearStats = {
  year: number;
  booksRead: number;
  pagesRead: number;
  topGenres: { genre: string; count: number }[];
  avgRating: number | null;
  /** Até 4 capas (Google Books) de livros concluídos no ano, sem repetir
   * livro — usada pelo card de estante compartilhável (opengraph-image). */
  covers: string[];
};

/** "Seu {ano} em livros": livros lidos, páginas, gêneros mais lidos e nota
 * média do ano, derivados de ReadingEvent no ano (mesma janela usada pela
 * meta de leitura, ver /api/goals/[year]). `booksRead` conta eventos, não
 * livros distintos — reler o mesmo livro no ano conta as duas conclusões.
 *
 * `topGenres` usa Book.genre (hoje um único gênero por livro, não um array —
 * ver nota em docs/ESPECIFICACAO.md) como se fosse uma lista de 1 item.
 *
 * Reaproveitada por /api/stats/[year] (perfil próprio) e por
 * /api/users/[username]/stats/[year] + a opengraph-image do card
 * compartilhável (perfil público) — mesma query, sem duplicar.
 */
export async function getYearStats(userId: string, year: number): Promise<YearStats> {
  const { start, end } = yearRange(year);

  const events = await db.readingEvent.findMany({
    where: { userId, finishedAt: { gte: start, lt: end } },
    select: { book: { select: { id: true, pages: true, genre: true, coverUrl: true } } },
  });

  const booksRead = events.length;
  const pagesRead = events.reduce((sum, e) => sum + e.book.pages, 0);

  const genreCount = new Map<string, number>();
  for (const e of events) {
    genreCount.set(e.book.genre, (genreCount.get(e.book.genre) ?? 0) + 1);
  }
  const topGenres = Array.from(genreCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre, count]) => ({ genre, count }));

  const bookIds = Array.from(new Set(events.map((e) => e.book.id)));
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

  const covers: string[] = [];
  const seenBookIds = new Set<string>();
  for (const e of events) {
    if (!e.book.coverUrl || seenBookIds.has(e.book.id)) continue;
    seenBookIds.add(e.book.id);
    covers.push(e.book.coverUrl);
    if (covers.length === 4) break;
  }

  return { year, booksRead, pagesRead, topGenres, avgRating, covers };
}
