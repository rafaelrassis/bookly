import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const PAGE = 20;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;

  const cursor = new URL(req.url).searchParams.get("cursor");
  const reviews = await db.review.findMany({
    where: { bookId: params.id, text: { not: "" } },
    orderBy: { createdAt: "desc" },
    take: PAGE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      user: { select: { username: true, name: true, avatar: true } },
      _count: { select: { likes: true, comments: true } },
      likes: { where: { userId: uid }, select: { userId: true } },
    },
  });

  const hasMore = reviews.length > PAGE;
  const page = reviews.slice(0, PAGE).map((r) => ({
    id: r.id,
    user: r.user,
    rating: r.rating,
    title: r.title ?? undefined,
    text: r.text,
    startedAt: r.startedAt?.toISOString(),
    finishedAt: r.finishedAt?.toISOString(),
    likes: r._count.likes,
    comments: r._count.comments,
    likedByMe: r.likes.length > 0,
    createdAt: r.createdAt.toISOString(),
  }));

  return NextResponse.json({
    items: page,
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
}
