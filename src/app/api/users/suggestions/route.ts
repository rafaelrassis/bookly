import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const LIMIT = 6;

/** Sugestões de "Descobrir leitores": usuários que ainda não sigo (nem eu mesma). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;

  const following = await db.follow.findMany({
    where: { followerId: uid },
    select: { followingId: true },
  });
  const excluded = [uid, ...following.map((f) => f.followingId)];

  const users = await db.user.findMany({
    where: { id: { notIn: excluded } },
    orderBy: { createdAt: "asc" },
    take: LIMIT,
    select: { username: true, name: true, avatar: true },
  });

  return NextResponse.json({ items: users });
}
