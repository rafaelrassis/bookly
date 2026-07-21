import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const quotes = await db.quote.findMany({
    where: { userId: session.user.id, bookId: params.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({
    quotes: quotes.map((q) => ({ id: q.id, text: q.text, page: q.page ?? undefined })),
  });
}

const schema = z.object({
  text: z.string().trim().min(1).max(2000),
  page: z.number().int().min(1).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;
  const bookId = params.id;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const book = await db.book.findUnique({ where: { id: bookId }, select: { id: true } });
  if (!book) return NextResponse.json({ error: "não encontrado" }, { status: 404 });

  const quote = await db.quote.create({
    data: { userId: uid, bookId, text: parsed.data.text, page: parsed.data.page },
  });
  return NextResponse.json({ id: quote.id, text: quote.text, page: quote.page ?? undefined });
}
