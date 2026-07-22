import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const review = await db.review.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!review) return NextResponse.json({ error: "não encontrada" }, { status: 404 });

  await db.reviewLike.upsert({
    where: { reviewId_userId: { reviewId: params.id, userId: session.user.id } },
    create: { reviewId: params.id, userId: session.user.id },
    update: {},
  });
  const likes = await db.reviewLike.count({ where: { reviewId: params.id } });
  return NextResponse.json({ ok: true, likes });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  await db.reviewLike.deleteMany({ where: { reviewId: params.id, userId: session.user.id } });
  const likes = await db.reviewLike.count({ where: { reviewId: params.id } });
  return NextResponse.json({ ok: true, likes });
}
