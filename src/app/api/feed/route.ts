import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeBook } from "@/lib/books";
import type { Prisma } from "@/generated/prisma/client";

const PAGE = 15;

/** "liked" continua lendo direto de Review (curtidas são por review, não faz
 * sentido no feed unificado de eventos) — só "all"/"following" leem de
 * FeedEvent (ver spec do stream unificado). */
async function getLikedReviews(uid: string, cursor: string | null) {
  const reviews = await db.review.findMany({
    where: { text: { not: "" }, likes: { some: { userId: uid } } },
    orderBy: { createdAt: "desc" },
    take: PAGE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      user: { select: { username: true, name: true, avatar: true, avatarUrl: true } },
      book: true,
      _count: { select: { likes: true, comments: true } },
      likes: { where: { userId: uid }, select: { userId: true } },
    },
  });

  const hasMore = reviews.length > PAGE;
  const page = reviews.slice(0, PAGE).map((r) => ({
    id: r.id,
    user: r.user,
    book: serializeBook(r.book),
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

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "all";
  const cursor = url.searchParams.get("cursor");

  if (scope === "liked") return getLikedReviews(uid, cursor);

  let where: Prisma.FeedEventWhereInput = {};
  if (scope === "following") {
    const following = await db.follow.findMany({
      where: { followerId: uid },
      select: { followingId: true },
    });
    const ids = following.map((f) => f.followingId);
    // Sem follows → empty state real (não cai mais pro geral)
    if (ids.length === 0) {
      return NextResponse.json({ items: [], nextCursor: null, emptyReason: "no_follows" });
    }
    where = { userId: { in: ids } };
  }

  const events = await db.feedEvent.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      user: { select: { username: true, name: true, avatar: true, avatarUrl: true } },
      book: true,
      review: {
        select: {
          id: true,
          rating: true,
          title: true,
          text: true,
          startedAt: true,
          finishedAt: true,
          createdAt: true,
          _count: { select: { likes: true, comments: true } },
          likes: { where: { userId: uid }, select: { userId: true } },
        },
      },
      donation: { select: { id: true, photoUrl: true, city: true, state: true } },
      club: { select: { id: true, name: true } },
      highlight: { select: { id: true, text: true, page: true } },
    },
  });

  const hasMore = events.length > PAGE;
  const page = events.slice(0, PAGE).map((e) => ({
    id: e.id,
    type: e.type,
    user: e.user,
    createdAt: e.createdAt.toISOString(),
    book: e.book ? serializeBook(e.book) : undefined,
    review: e.review
      ? {
          id: e.review.id,
          rating: e.review.rating,
          title: e.review.title ?? undefined,
          text: e.review.text,
          startedAt: e.review.startedAt?.toISOString(),
          finishedAt: e.review.finishedAt?.toISOString(),
          likes: e.review._count.likes,
          comments: e.review._count.comments,
          likedByMe: e.review.likes.length > 0,
          createdAt: e.review.createdAt.toISOString(),
        }
      : undefined,
    donation: e.donation ?? undefined,
    club: e.club ?? undefined,
    highlight: e.highlight
      ? { id: e.highlight.id, text: e.highlight.text, page: e.highlight.page ?? undefined }
      : undefined,
  }));

  return NextResponse.json({
    items: page,
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
}
