import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const PAGE = 20;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const cursor = new URL(req.url).searchParams.get("cursor");
  const comments = await db.comment.findMany({
    where: { reviewId: params.id },
    orderBy: { createdAt: "asc" },
    take: PAGE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { user: { select: { username: true, name: true, avatar: true } } },
  });

  const hasMore = comments.length > PAGE;
  const page = comments.slice(0, PAGE).map((c) => ({
    id: c.id,
    text: c.text,
    createdAt: c.createdAt.toISOString(),
    user: c.user,
  }));

  return NextResponse.json({
    items: page,
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
}

const schema = z.object({ text: z.string().trim().min(1).max(500) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const review = await db.review.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!review) return NextResponse.json({ error: "não encontrada" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const comment = await db.comment.create({
    data: { reviewId: params.id, userId: session.user.id, text: parsed.data.text },
    include: { user: { select: { username: true, name: true, avatar: true } } },
  });

  return NextResponse.json(
    {
      id: comment.id,
      text: comment.text,
      createdAt: comment.createdAt.toISOString(),
      user: comment.user,
    },
    { status: 201 }
  );
}
