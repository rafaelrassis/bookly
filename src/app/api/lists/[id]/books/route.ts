import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({ bookId: z.string().min(1) });

async function assertOwner(listId: string, userId: string) {
  const list = await db.list.findUnique({ where: { id: listId }, select: { userId: true } });
  if (!list) return "not_found" as const;
  if (list.userId !== userId) return "forbidden" as const;
  return null;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const err = await assertOwner(params.id, session.user.id);
  if (err === "not_found") return NextResponse.json({ error: "não encontrada" }, { status: 404 });
  if (err === "forbidden") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const book = await db.book.findUnique({ where: { id: parsed.data.bookId }, select: { id: true } });
  if (!book) return NextResponse.json({ error: "livro inexistente" }, { status: 400 });

  const last = await db.listBook.findFirst({
    where: { listId: params.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await db.listBook.upsert({
    where: { listId_bookId: { listId: params.id, bookId: parsed.data.bookId } },
    create: { listId: params.id, bookId: parsed.data.bookId, order: (last?.order ?? -1) + 1 },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const err = await assertOwner(params.id, session.user.id);
  if (err === "not_found") return NextResponse.json({ error: "não encontrada" }, { status: 404 });
  if (err === "forbidden") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await db.listBook.deleteMany({ where: { listId: params.id, bookId: parsed.data.bookId } });
  return NextResponse.json({ ok: true });
}
