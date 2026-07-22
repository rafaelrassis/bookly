import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateClubCode } from "@/lib/clubs";

/** Gera um novo código de convite (só criador; só clubes privados). */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const club = await db.club.findUnique({
    where: { id: params.id },
    select: { creatorId: true, visibility: true },
  });
  if (!club) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  if (club.creatorId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (club.visibility !== "private") {
    return NextResponse.json({ error: "clube público não tem código" }, { status: 400 });
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const code = generateClubCode();
      await db.club.update({ where: { id: params.id }, data: { code } });
      return NextResponse.json({ code });
    } catch (err) {
      const isUniqueCodeClash =
        err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002";
      if (!isUniqueCodeClash || attempt === 4) throw err;
    }
  }
  return NextResponse.json({ error: "não foi possível gerar o código" }, { status: 500 });
}
