const HISTOGRAM_STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

export type UserStats = {
  readCount: number;
  pagesRead: number;
  reviewCount: number;
  avgRating: number;
  histogram: Record<string, number>;
};

/**
 * Zerada até a Spec 3 trazer Book/ShelfEntry/Review — estante, notas e
 * reviews hoje só existem no store local (client-only, por usuário).
 */
export async function userStats(userId: string): Promise<UserStats> {
  void userId;
  const histogram: Record<string, number> = {};
  for (const step of HISTOGRAM_STEPS) histogram[step] = 0;
  return { readCount: 0, pagesRead: 0, reviewCount: 0, avgRating: 0, histogram };
}
