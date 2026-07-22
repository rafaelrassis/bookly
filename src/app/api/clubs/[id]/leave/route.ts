import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** Sai do clube. Criador não sai (precisa arquivar/deletar o clube). */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;

  const club = await db.club.findUnique({ where: { id: params.id }, select: { creatorId: true } });
  if (!club) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  if (club.creatorId === uid) {
    return NextResponse.json(
      { error: "o criador não pode sair; arquive ou delete o clube" },
      { status: 400 }
    );
  }

  await db.clubMember.deleteMany({ where: { clubId: params.id, userId: uid } });
  return NextResponse.json({ ok: true });
}
