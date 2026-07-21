import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: { username: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const target = await db.user.findUnique({
    where: { username: params.username },
    select: { id: true },
  });
  if (!target) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  if (target.id === session.user.id) {
    return NextResponse.json({ error: "não pode seguir a si mesmo" }, { status: 400 });
  }

  await db.follow.upsert({
    where: { followerId_followingId: { followerId: session.user.id, followingId: target.id } },
    create: { followerId: session.user.id, followingId: target.id },
    update: {},
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { username: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const target = await db.user.findUnique({
    where: { username: params.username },
    select: { id: true },
  });
  if (!target) return NextResponse.json({ error: "não encontrado" }, { status: 404 });

  await db.follow.deleteMany({ where: { followerId: session.user.id, followingId: target.id } });
  return NextResponse.json({ ok: true });
}
