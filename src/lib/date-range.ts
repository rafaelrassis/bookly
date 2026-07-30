/** Início (inclusivo) e fim (exclusivo) de um ano civil, em UTC. */
export function yearRange(year: number) {
  return {
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

/** Parseia e valida um ano de rota (string) — usado por /api/stats/[year] e
 * /api/users/[username]/stats/[year]. */
export function parseYear(yearStr: string): number | null {
  const year = Number(yearStr);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;
  return year;
}
