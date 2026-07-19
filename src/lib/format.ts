/** Formata um número com vírgula decimal pt-BR (ex.: 4.6 -> "4,6"). */
export function formatDecimal(value: number, digits = 1): string {
  return value.toFixed(digits).replace(".", ",");
}

/** Formata um inteiro com separador de milhar pt-BR (ex.: 12840 -> "12.840"). */
export function formatCount(value: number): string {
  return value.toLocaleString("pt-BR");
}

/** Percentual de progresso de leitura, 0–100. */
export function readingPercent(currentPage: number, pages: number): number {
  if (pages <= 0) return 0;
  return Math.min(100, Math.round((currentPage / pages) * 100));
}
