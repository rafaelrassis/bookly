import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeBook } from "@/lib/books";
import { weeklyPagesRead } from "@/lib/reading-pace";

const STALLED_MS = 14 * 24 * 60 * 60 * 1000;

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
