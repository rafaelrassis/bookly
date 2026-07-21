import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { publishProgressToClubs } from "@/lib/clubs";

const schema = z.object({ page: z.number().int().min(0) });

/** Página sempre em números absolutos; anterior vira lastPage pro delta.
 * Garante status READING. Dispara gancho de clube (no-op até a Spec 4). */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;
  const bookId = params.id;

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
    select: { currentPage: true, startedAt: true },
  });
  const previous = prev?.currentPage ?? 0;
  const today = new Date();

  await db.shelfEntry.upsert({
    where: { userId_bookId: { userId: uid, bookId } },
    create: { userId: uid, bookId, status: "READING", currentPage: page, lastPage: previous, startedAt: today },
    update: { status: "READING", currentPage: page, lastPage: previous, startedAt: prev?.startedAt ?? today },
  });

  const percent = book.pages > 0 ? Math.min(100, Math.round((page / book.pages) * 100)) : 0;
  await publishProgressToClubs(uid, bookId, percent);

  return NextResponse.json({ delta: page - previous, percent });
}
