import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeBook } from "@/lib/books";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;

  const review = await db.review.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { username: true, name: true, avatar: true } },
      book: true,
      _count: { select: { likes: true, comments: true } },
      likes: { where: { userId: uid }, select: { userId: true } },
    },
  });
  if (!review) return NextResponse.json({ error: "não encontrada" }, { status: 404 });

  return NextResponse.json({
    id: review.id,
    user: review.user,
    book: serializeBook(review.book),
    rating: review.rating,
    title: review.title ?? undefined,
    text: review.text,
    startedAt: review.startedAt?.toISOString(),
    finishedAt: review.finishedAt?.toISOString(),
    likes: review._count.likes,
    comments: review._count.comments,
    likedByMe: review.likes.length > 0,
    createdAt: review.createdAt.toISOString(),
  });
}
