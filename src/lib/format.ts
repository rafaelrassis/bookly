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

const SHORT_MONTHS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

/** Data curta pt-BR a partir de ISO ("2026-07-12" -> "12 jul"). */
export function formatShortDate(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`;
}

/** "Leu de 12 jul a 20 jul" / "Terminou em 20 jul" / "Começou em 12 jul". */
export function readingDates(startedAt?: string, finishedAt?: string): string | null {
  if (startedAt && finishedAt)
    return `Leu de ${formatShortDate(startedAt)} a ${formatShortDate(finishedAt)}`;
  if (finishedAt) return `Terminou em ${formatShortDate(finishedAt)}`;
  if (startedAt) return `Começou em ${formatShortDate(startedAt)}`;
  return null;
}

/** Data de hoje em ISO (YYYY-MM-DD). */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Hora atual "HH:mm" para as mensagens do chat. */
export function nowTime(): string {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Código de verificação numérico de 6 dígitos (mock — sem envio real). */
export function generateVerificationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
