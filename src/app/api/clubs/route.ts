import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeBook } from "@/lib/books";
import { averageClubProgress, currentMonth, generateClubCode } from "@/lib/clubs";
import { recordFeedEvent } from "@/lib/feed-event";
import { checkRateLimit } from "@/lib/ratelimit";

/** Clubes do usuário (joined) + clubes públicos pra descobrir. O front
 * separa em "Meus"/"Públicos" a partir do campo `joined`. A capa exibida no
 * card vem do livro do mês corrente (ClubBookOfMonth) — o clube pode não ter
 * nenhum ainda, daí `book`/`bookId` virem `null`. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;

  const myMemberships = await db.clubMember.findMany({
    where: { userId: uid },
    select: { clubId: true },
  });
  const myClubIds = myMemberships.map((m) => m.clubId);

  const clubs = await db.club.findMany({
    where: { OR: [{ id: { in: myClubIds } }, { visibility: "public" }] },
    include: { members: { select: { userId: true } } },
    orderBy: { createdAt: "desc" },
  });

  const booksOfMonth = await db.clubBookOfMonth.findMany({
    where: { clubId: { in: clubs.map((c) => c.id) }, month: currentMonth() },
    include: { book: true },
  });
  const bomByClub = new Map(booksOfMonth.map((b) => [b.clubId, b]));

  const items = await Promise.all(
    clubs.map(async (club) => {
      const bom = bomByClub.get(club.id);
      return {
        id: club.id,
        name: club.name,
        desc: club.desc,
        visibility: club.visibility,
        bookId: bom?.bookId ?? null,
        book: bom ? serializeBook(bom.book) : null,
        members: club.members.length,
        joined: myClubIds.includes(club.id),
        progress: bom
          ? await averageClubProgress(
              bom.bookId,
              bom.book.pages,
              club.members.map((m) => m.userId)
            )
          : 0,
      };
    })
  );

  return NextResponse.json({ items });
}

const createSchema = z.object({
  name: z.string().min(1).max(80),
  desc: z.string().max(500).default(""),
  visibility: z.enum(["public", "private"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const limited = await checkRateLimit("write", session.user.id);
  if (limited) return limited;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { name, desc, visibility } = parsed.data;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const club = await db.club.create({
        data: {
          name,
          desc,
          visibility,
          code: visibility === "private" ? generateClubCode() : null,
          creatorId: session.user.id,
          members: { create: { userId: session.user.id, role: "creator" } },
        },
        select: { id: true, code: true },
      });
      await recordFeedEvent(db, { userId: session.user.id, type: "CLUB_JOINED", clubId: club.id });
      return NextResponse.json(club, { status: 201 });
    } catch (err) {
      // colisão rara de código único: tenta de novo com um novo código.
      const isUniqueCodeClash =
        err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002";
      if (!isUniqueCodeClash || attempt === 4) throw err;
    }
  }
  return NextResponse.json({ error: "não foi possível criar o clube" }, { status: 500 });
}
