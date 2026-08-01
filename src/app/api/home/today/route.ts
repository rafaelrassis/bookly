import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeBook } from "@/lib/books";

const STALLED_MS = 14 * 24 * 60 * 60 * 1000;

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
 * "ritmo da semana" na Home, não uma contagem auditável. Fica neste arquivo
 * (em vez de src/lib/reading-pace.ts) porque toca o Prisma client — esse
 * módulo é importado também pela Home (client component) pra formatar
 * saudação/dia da semana, e misturar os dois puxaria pg/adapter-pg pro
 * bundle do browser. */
async function weeklyPagesRead(userId: string, now: Date = new Date()): Promise<number> {
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

/** Dados da Home "Hoje" que não cabem no fetch de `/api/shelf?status=READING`
 * já usado pela tela: ritmo da semana, livro parado (LENDO sem atualização
 * há mais de 14 dias) e o próximo da fila "Quero ler". Nenhuma tabela nova —
 * tudo derivado de ProgressLog/ShelfEntry existentes. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;

  const [weeklyPages, stalled, nextQueued] = await Promise.all([
    weeklyPagesRead(uid),
    db.shelfEntry.findFirst({
      where: { userId: uid, status: "READING", updatedAt: { lt: new Date(Date.now() - STALLED_MS) } },
      orderBy: { updatedAt: "asc" },
      include: { book: true },
    }),
    db.shelfEntry.findFirst({
      where: { userId: uid, status: "WANT_TO_READ" },
      orderBy: { createdAt: "asc" },
      include: { book: true },
    }),
  ]);

  return NextResponse.json({
    weeklyPages,
    stalled: stalled
      ? { book: serializeBook(stalled.book), updatedAt: stalled.updatedAt.toISOString() }
      : null,
    nextQueued: nextQueued ? { book: serializeBook(nextQueued.book) } : null,
  });
}
