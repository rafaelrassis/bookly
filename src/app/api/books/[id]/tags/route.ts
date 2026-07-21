import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({ tag: z.string().trim().min(1).max(40) });

async function currentTags(userId: string, bookId: string) {
  const rows = await db.bookTag.findMany({
    where: { userId, bookId },
    select: { tag: true },
    orderBy: { tag: "asc" },
  });
  return rows.map((r) => r.tag);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;
  const bookId = params.id;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const tag = parsed.data.tag.toLowerCase();

  const book = await db.book.findUnique({ where: { id: bookId }, select: { id: true } });
  if (!book) return NextResponse.json({ error: "não encontrado" }, { status: 404 });

  await db.bookTag.upsert({
    where: { userId_bookId_tag: { userId: uid, bookId, tag } },
    create: { userId: uid, bookId, tag },
    update: {},
  });

  return NextResponse.json({ tags: await currentTags(uid, bookId) });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;
  const bookId = params.id;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const tag = parsed.data.tag.toLowerCase();

  await db.bookTag.deleteMany({ where: { userId: uid, bookId, tag } });

  return NextResponse.json({ tags: await currentTags(uid, bookId) });
}
