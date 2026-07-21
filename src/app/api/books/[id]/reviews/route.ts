import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const PAGE_SIZE = 10;

/** Reviews de terceiros sobre o livro (a review do próprio viewer já vem no
 * payload de GET /api/books/[id] e não se repete aqui). */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;

  const reviews = await db.review.findMany({
    where: { bookId: params.id, NOT: { userId: session.user.id } },
    include: { user: { select: { username: true, name: true, avatar: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = reviews.length > PAGE_SIZE;
  const items = reviews.slice(0, PAGE_SIZE);

  return NextResponse.json({
    items: items.map((r) => ({
      id: r.id,
      user: r.user,
      rating: r.rating,
      text: r.text,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      createdAt: r.createdAt,
    })),
    nextCursor: hasMore ? items[items.length - 1].id : null,
  });
}
