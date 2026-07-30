import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/ratelimit";

/** Reler: só a partir de status=READ. Volta pra READING zerando o progresso —
 * a leitura anterior já virou ReadingEvent quando finishedAt foi setado
 * (ver src/lib/reading-event.ts), então resetar o ShelfEntry aqui não apaga
 * esse histórico. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;
  const bookId = params.id;

  const limited = await checkRateLimit("write", uid);
  if (limited) return limited;

  const entry = await db.shelfEntry.findUnique({
    where: { userId_bookId: { userId: uid, bookId } },
  });
  if (!entry || entry.status !== "READ") {
    return NextResponse.json({ error: "NOT_READ_YET" }, { status: 400 });
  }

  const updated = await db.shelfEntry.update({
    where: { id: entry.id },
    data: {
      status: "READING",
      currentPage: 0,
      lastPage: null,
      startedAt: new Date(),
      finishedAt: null,
    },
  });

  return NextResponse.json({ entry: updated });
}
