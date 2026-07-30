/** Início (inclusivo) e fim (exclusivo) de um ano civil, em UTC. */
export function yearRange(year: number) {
  return {
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year + 1, 0, 1)),
  };
}
