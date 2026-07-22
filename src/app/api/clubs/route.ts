import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeBook } from "@/lib/books";
import { averageClubProgress, generateClubCode } from "@/lib/clubs";

/** Clubes do usuário (joined) + clubes públicos pra descobrir. O front
 * separa em "Meus"/"Públicos" a partir do campo `joined`. */
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
    include: { book: true, members: { select: { userId: true } } },
    orderBy: { createdAt: "desc" },
  });

  const items = await Promise.all(
    clubs.map(async (club) => ({
      id: club.id,
      name: club.name,
      desc: club.desc,
      visibility: club.visibility,
      bookId: club.bookId,
      book: serializeBook(club.book),
      members: club.members.length,
      joined: myClubIds.includes(club.id),
      progress: await averageClubProgress(
        club.bookId,
        club.book.pages,
        club.members.map((m) => m.userId)
      ),
    }))
  );

  return NextResponse.json({ items });
}

const createSchema = z.object({
  name: z.string().min(1).max(80),
  bookId: z.string(),
  desc: z.string().max(500).default(""),
  visibility: z.enum(["public", "private"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { name, bookId, desc, visibility } = parsed.data;

  const book = await db.book.findUnique({ where: { id: bookId }, select: { id: true } });
  if (!book) return NextResponse.json({ error: "livro inexistente" }, { status: 400 });

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const club = await db.club.create({
        data: {
          name,
          bookId,
          desc,
          visibility,
          code: visibility === "private" ? generateClubCode() : null,
          creatorId: session.user.id,
          members: { create: { userId: session.user.id, role: "creator" } },
        },
        select: { id: true, code: true },
      });
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
