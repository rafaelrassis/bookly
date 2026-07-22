import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** Entra em clube público sem código. Privado exige POST /api/clubs/join. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;

  const club = await db.club.findUnique({
    where: { id: params.id },
    select: { id: true, visibility: true },
  });
  if (!club) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  if (club.visibility === "private") {
    return NextResponse.json({ error: "clube privado exige código" }, { status: 403 });
  }

  const existing = await db.clubMember.findUnique({
    where: { clubId_userId: { clubId: club.id, userId: uid } },
  });
  if (existing) return NextResponse.json({ id: club.id, status: "already" });

  await db.clubMember.create({ data: { clubId: club.id, userId: uid } });
  return NextResponse.json({ id: club.id, status: "joined" });
}
