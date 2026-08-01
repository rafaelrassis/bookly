import { db } from "@/lib/db";

/** Início (segunda-feira, 00:00 UTC) da semana ISO que contém `date` — mesma
 * regra de src/lib/streak.ts, duplicada pra não criar acoplamento entre os
 * dois conceitos (streak de semanas vs. páginas da semana). */
function isoWeekStart(date: Date): Date {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7; // 1 (seg) .. 7 (dom)
  d.setUTCDate(d.getUTCDate() - day + 1);
  return d;
}

/** Páginas lidas na semana corrente, somando os avanços (deltas positivos)
 * entre ProgressLogs consecutivos do mesmo livro. O primeiro log de um
 * livro conta a partir da página 0 — aproximação razoável pra um número de
 * "ritmo da semana" na Home, não uma contagem auditável. */
export async function weeklyPagesRead(userId: string, now: Date = new Date()): Promise<number> {
  const weekStart = isoWeekStart(now);

  const logs = await db.progressLog.findMany({
    where: { userId },
    orderBy: [{ bookId: "asc" }, { loggedAt: "asc" }],
    select: { bookId: true, page: true, loggedAt: true },
  });

  let total = 0;
  let prevBook: string | null = null;
  let prevPage = 0;
  for (const log of logs) {
    if (log.bookId !== prevBook) {
      prevBook = log.bookId;
      prevPage = 0;
    }
    const delta = log.page - prevPage;
    if (delta > 0 && log.loggedAt >= weekStart) total += delta;
    prevPage = log.page;
  }
  return total;
}

const WEEKDAYS = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

export function weekdayName(date: Date = new Date()): string {
  return WEEKDAYS[date.getDay()];
}

/** Saudação por horário local do servidor — aproximação; não vale a pena
 * mandar timezone do cliente só pra isso. */
export function timeGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 5) return "Boa noite";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}
