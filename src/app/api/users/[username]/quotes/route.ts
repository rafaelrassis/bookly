import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeBook } from "@/lib/books";

const PAGE = 40;

/** Citações do usuário, mais recentes primeiro — usada no perfil (próprio e
 * público) e, futuramente, no feed unificado quando ele existir. */
export async function GET(req: Request, { params }: { params: { username: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const target = await db.user.findUnique({ where: { username: params.username }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "não encontrado" }, { status: 404 });

  const cursor = new URL(req.url).searchParams.get("cursor");
  const quotes = await db.quote.findMany({
    where: { userId: target.id },
    orderBy: { createdAt: "desc" },
    take: PAGE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { book: true },
  });

  const hasMore = quotes.length > PAGE;
  const page = quotes.slice(0, PAGE).map((q) => ({
    id: q.id,
    book: serializeBook(q.book),
    text: q.text,
    page: q.page ?? undefined,
    createdAt: q.createdAt.toISOString(),
  }));

  return NextResponse.json({
    items: page,
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
}
