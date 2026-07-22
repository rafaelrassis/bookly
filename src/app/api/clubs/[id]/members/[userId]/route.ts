import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** Remove um membro do clube (só criador; criador não remove a si mesmo). */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; userId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const club = await db.club.findUnique({ where: { id: params.id }, select: { creatorId: true } });
  if (!club) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  if (club.creatorId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (params.userId === session.user.id) {
    return NextResponse.json({ error: "criador não pode remover a si mesmo" }, { status: 400 });
  }

  await db.clubMember.deleteMany({ where: { clubId: params.id, userId: params.userId } });
  return NextResponse.json({ ok: true });
}
