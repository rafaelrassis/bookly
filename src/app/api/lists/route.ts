import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeBook } from "@/lib/reviews";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const targetId = new URL(req.url).searchParams.get("userId") ?? session.user.id;
  const isOwner = targetId === session.user.id;

  const lists = await db.list.findMany({
    where: { userId: targetId, ...(isOwner ? {} : { visibility: "public" }) },
    orderBy: { createdAt: "desc" },
    include: { books: { orderBy: { order: "asc" }, include: { book: true } } },
  });

  return NextResponse.json(
    lists.map((l) => ({
      id: l.id,
      name: l.name,
      visibility: l.visibility,
      bookIds: l.books.map((b) => b.bookId),
      books: l.books.map((b) => serializeBook(b.book)),
    }))
  );
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  visibility: z.enum(["public", "private"]).default("public"),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const list = await db.list.create({
    data: { userId: session.user.id, name: parsed.data.name, visibility: parsed.data.visibility },
  });

  return NextResponse.json(
    { id: list.id, name: list.name, visibility: list.visibility, bookIds: [], books: [] },
    { status: 201 }
  );
}
