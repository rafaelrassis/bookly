import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({ code: z.string().length(6) });

/** Entra em clube privado por código de convite. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "código inválido" }, { status: 400 });

  const club = await db.club.findUnique({
    where: { code: parsed.data.code.toUpperCase() },
    select: { id: true },
  });
  if (!club) return NextResponse.json({ error: "código inválido" }, { status: 404 });

  const existing = await db.clubMember.findUnique({
    where: { clubId_userId: { clubId: club.id, userId: uid } },
  });
  if (existing) return NextResponse.json({ id: club.id, status: "already" });

  await db.clubMember.create({ data: { clubId: club.id, userId: uid } });
  return NextResponse.json({ id: club.id, status: "joined" });
}
