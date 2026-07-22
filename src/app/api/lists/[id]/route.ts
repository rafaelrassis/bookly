import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeBook } from "@/lib/books";

async function loadList(id: string) {
  return db.list.findUnique({
    where: { id },
    include: { books: { orderBy: { order: "asc" }, include: { book: true } } },
  });
}

function serializeList(list: NonNullable<Awaited<ReturnType<typeof loadList>>>) {
  return {
    id: list.id,
    name: list.name,
    visibility: list.visibility,
    bookIds: list.books.map((b) => b.bookId),
    books: list.books.map((b) => serializeBook(b.book)),
  };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const list = await loadList(params.id);
  if (!list) return NextResponse.json({ error: "não encontrada" }, { status: 404 });
  if (list.visibility === "private" && list.userId !== session?.user?.id) {
    return NextResponse.json({ error: "privada" }, { status: 403 });
  }
  return NextResponse.json(serializeList(list));
}

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  visibility: z.enum(["public", "private"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const existing = await db.list.findUnique({ where: { id: params.id }, select: { userId: true } });
  if (!existing) return NextResponse.json({ error: "não encontrada" }, { status: 404 });
  if (existing.userId !== session.user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await db.list.update({ where: { id: params.id }, data: parsed.data });
  const list = await loadList(params.id);
  return NextResponse.json(serializeList(list!));
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const existing = await db.list.findUnique({ where: { id: params.id }, select: { userId: true } });
  if (!existing) return NextResponse.json({ error: "não encontrada" }, { status: 404 });
  if (existing.userId !== session.user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await db.list.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
