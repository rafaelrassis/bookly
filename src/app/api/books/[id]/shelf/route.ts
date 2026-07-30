import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { checkRateLimit } from "@/lib/ratelimit";

const schema = z.object({
  status: z.enum(["WANT_TO_READ", "READING", "READ", "DNF"]).nullable(),
});

/** status null remove o livro da estante. Datas: startedAt na primeira vez
 * em Lendo (ou Lido direto); finishedAt ao marcar Lido — espelha o store.
 * DNF grava abandonedAt e preserva currentPage/lastPage (não mexe no
 * progresso); sair de DNF pra qualquer outro status limpa abandonedAt. */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;
  const bookId = params.id;

  const limited = await checkRateLimit("write", uid);
  if (limited) return limited;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { status } = parsed.data;

  const book = await db.book.findUnique({ where: { id: bookId }, select: { id: true } });
  if (!book) return NextResponse.json({ error: "não encontrado" }, { status: 404 });

  if (status === null) {
    await db.shelfEntry.deleteMany({ where: { userId: uid, bookId } });
    return NextResponse.json({ entry: null });
  }

  const prev = await db.shelfEntry.findUnique({
    where: { userId_bookId: { userId: uid, bookId } },
  });
  const today = new Date();

  let data: Prisma.ShelfEntryUncheckedCreateInput;
  if (status === "READING") {
    data = {
      userId: uid,
      bookId,
      status,
      currentPage: prev?.currentPage ?? 0,
      lastPage: prev?.lastPage ?? 0,
      startedAt: prev?.startedAt ?? today,
      finishedAt: null,
      abandonedAt: null,
    };
  } else if (status === "READ") {
    data = {
      userId: uid,
      bookId,
      status,
      currentPage: null,
      lastPage: null,
      startedAt: prev?.startedAt ?? today,
      finishedAt: today,
      abandonedAt: null,
    };
  } else if (status === "DNF") {
    data = {
      userId: uid,
      bookId,
      status,
      currentPage: prev?.currentPage ?? null,
      lastPage: prev?.lastPage ?? null,
      startedAt: prev?.startedAt ?? null,
      finishedAt: null,
      abandonedAt: today,
    };
  } else {
    data = {
      userId: uid,
      bookId,
      status,
      currentPage: null,
      lastPage: null,
      startedAt: null,
      finishedAt: null,
      abandonedAt: null,
    };
  }

  const entry = await db.shelfEntry.upsert({
    where: { userId_bookId: { userId: uid, bookId } },
    create: data,
    update: data,
  });

  return NextResponse.json({ entry });
}
