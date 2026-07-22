import { db } from "@/lib/db";

const HISTOGRAM_STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

export type UserStats = {
  readCount: number;
  pagesRead: number;
  reviewCount: number;
  avgRating: number;
  histogram: Record<string, number>;
};

/** Estatísticas do perfil derivadas de ShelfEntry/Review reais (Spec 3a/3b). */
export async function userStats(userId: string): Promise<UserStats> {
  const [readEntries, readingEntries, reviews] = await Promise.all([
    db.shelfEntry.findMany({
      where: { userId, status: "READ" },
      select: { book: { select: { pages: true } } },
    }),
    db.shelfEntry.findMany({
      where: { userId, status: "READING" },
      select: { currentPage: true },
    }),
    db.review.findMany({ where: { userId }, select: { rating: true, text: true } }),
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

  return { readCount, pagesRead, reviewCount, avgRating, histogram };
}
