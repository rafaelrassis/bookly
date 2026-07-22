import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeBook } from "@/lib/books";
import type { Prisma } from "@/generated/prisma/client";

const PAGE = 15;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "all";
  const cursor = url.searchParams.get("cursor");

  let where: Prisma.ReviewWhereInput = { text: { not: "" } };
  if (scope === "following") {
    const following = await db.follow.findMany({
      where: { followerId: uid },
      select: { followingId: true },
    });
    const ids = following.map((f) => f.followingId);
    // fallback: se não segue ninguém, cai pro geral
    if (ids.length > 0) where = { ...where, userId: { in: ids } };
  } else if (scope === "liked") {
    where = { ...where, likes: { some: { userId: uid } } };
  }

  const reviews = await db.review.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: PAGE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      user: { select: { username: true, name: true, avatar: true } },
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
    fellBackToAll: scope === "following" && (await noFollowing(uid)),
  });
}

async function noFollowing(uid: string): Promise<boolean> {
  const count = await db.follow.count({ where: { followerId: uid } });
  return count === 0;
}
