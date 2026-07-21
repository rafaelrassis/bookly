import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const PAGE_SIZE = 20;

export async function GET(req: Request, { params }: { params: { username: string } }) {
  const target = await db.user.findUnique({
    where: { username: params.username },
    select: { id: true },
  });
  if (!target) return NextResponse.json({ error: "não encontrado" }, { status: 404 });

  const cursor = new URL(req.url).searchParams.get("cursor");
  const rows = await db.follow.findMany({
    where: { followerId: target.id },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { followingUser: { select: { id: true, username: true, name: true, avatar: true } } },
  });

  const hasMore = rows.length > PAGE_SIZE;
  const page = rows.slice(0, PAGE_SIZE);

  return NextResponse.json({
    items: page.map((r) => r.followingUser),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
}
