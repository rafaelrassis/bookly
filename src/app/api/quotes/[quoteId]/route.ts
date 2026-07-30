import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeBook } from "@/lib/books";
import { checkRateLimit } from "@/lib/ratelimit";

export async function GET(_req: Request, { params }: { params: { quoteId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const quote = await db.quote.findUnique({
    where: { id: params.quoteId },
    include: {
      user: { select: { username: true, name: true, avatar: true, avatarUrl: true } },
      book: true,
    },
  });
  if (!quote) return NextResponse.json({ error: "não encontrada" }, { status: 404 });

  return NextResponse.json({
    id: quote.id,
    user: quote.user,
    book: serializeBook(quote.book),
    text: quote.text,
    page: quote.page ?? undefined,
    createdAt: quote.createdAt.toISOString(),
  });
}

export async function DELETE(_req: Request, { params }: { params: { quoteId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const limited = await checkRateLimit("write", session.user.id);
  if (limited) return limited;

  await db.quote.deleteMany({ where: { id: params.quoteId, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
