import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { publishProgressToClubs } from "@/lib/clubs";
import type { ShelfStatus } from "@/lib/types";
import { checkRateLimit } from "@/lib/ratelimit";
import { recordFeedEvent } from "@/lib/feed-event";
import { recordReadingEvent } from "@/lib/reading-event";

const schema = z.object({ page: z.number().int().min(0) });

/** Página sempre em números absolutos; anterior vira lastPage pro delta.
 * Atinge o total de páginas -> READ + finishedAt. Recuo de página é permitido
 * e não reverte o status pra WANT_TO_READ (fica como já estava, a não ser que
 * a nova página zere ou complete o livro). Dispara gancho de clube (no-op até
 * a Spec 4). */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;
  const bookId = params.id;

  const limited = await checkRateLimit("write", uid);
  if (limited) return limited;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { page } = parsed.data;

  const book = await db.book.findUnique({ where: { id: bookId }, select: { pages: true } });
  if (!book) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  if (page > book.pages) {
    return NextResponse.json({ error: `página além do total (${book.pages})` }, { status: 400 });
  }

  const prev = await db.shelfEntry.findUnique({
    where: { userId_bookId: { userId: uid, bookId } },
    select: { currentPage: true, status: true, startedAt: true, finishedAt: true },
  });
  const previous = prev?.currentPage ?? 0;
  const today = new Date();
  const finishing = book.pages > 0 && page >= book.pages;
  const status: ShelfStatus = finishing ? "READ" : page > 0 ? "READING" : (prev?.status as ShelfStatus) ?? "WANT_TO_READ";

  const justFinished = finishing && prev?.status !== "READ";

  const entry = await db.$transaction(async (tx) => {
    const entry = await tx.shelfEntry.upsert({
      where: { userId_bookId: { userId: uid, bookId } },
      create: {
        userId: uid,
        bookId,
        status,
        currentPage: page,
        lastPage: previous,
        startedAt: page > 0 ? today : null,
        finishedAt: finishing ? today : null,
      },
      update: {
        status,
        currentPage: page,
        lastPage: previous,
        startedAt: prev?.startedAt ?? (page > 0 ? today : null),
        finishedAt: finishing ? (prev?.finishedAt ?? today) : (prev?.finishedAt ?? null),
      },
    });
    if (justFinished) {
      await recordReadingEvent(tx, entry);
      await recordFeedEvent(tx, { userId: uid, type: "BOOK_FINISHED", bookId });
    }
    return entry;
  });

  const percent = book.pages > 0 ? Math.min(100, Math.round((page / book.pages) * 100)) : 0;
  await publishProgressToClubs(uid, bookId, percent);

  return NextResponse.json({ delta: page - previous, percent, status: entry.status, finishedAt: entry.finishedAt });
}
