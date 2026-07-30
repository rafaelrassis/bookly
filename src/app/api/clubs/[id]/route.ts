import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeBook } from "@/lib/books";
import { currentMonth, generateClubCode, shelfPercent } from "@/lib/clubs";
import { checkRateLimit } from "@/lib/ratelimit";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;

  const club = await db.club.findUnique({
    where: { id: params.id },
    include: {
      members: {
        include: { user: { select: { username: true, name: true, avatar: true, avatarUrl: true } } },
      },
    },
  });
  if (!club) return NextResponse.json({ error: "não encontrado" }, { status: 404 });

  const membership = club.members.find((m) => m.userId === uid);
  const isCreator = club.creatorId === uid;
  if (club.visibility === "private" && !membership) {
    return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  }

  // Progresso dos membros e a capa exibida seguem o livro do mês corrente,
  // não o `club.bookId` legado — a mesma fonte de dado usada em "Seu progresso"
  // (ClubBookOfMonthCard) e em GET .../book-of-month/members, pra nunca
  // divergir entre as telas. Clube pode ainda não ter livro do mês definido.
  const bookOfMonth = await db.clubBookOfMonth.findUnique({
    where: { clubId_month: { clubId: club.id, month: currentMonth() } },
    include: { book: true },
  });

  const entries = bookOfMonth
    ? await db.shelfEntry.findMany({
        where: { bookId: bookOfMonth.bookId, userId: { in: club.members.map((m) => m.userId) } },
        select: { userId: true, status: true, currentPage: true },
      })
    : [];
  const byUser = new Map(entries.map((e) => [e.userId, e]));

  const members = club.members.map((m) => ({
    userId: m.userId,
    user: `@${m.user.username}`,
    name: m.user.name,
    avatar: m.user.avatar,
    avatarUrl: m.user.avatarUrl,
    role: m.role,
    percent: bookOfMonth ? shelfPercent(byUser.get(m.userId), bookOfMonth.book.pages) : 0,
  }));
  const progress =
    members.length > 0
      ? Math.round(members.reduce((sum, m) => sum + m.percent, 0) / members.length)
      : 0;

  return NextResponse.json({
    id: club.id,
    name: club.name,
    desc: club.desc,
    visibility: club.visibility,
    bookId: bookOfMonth?.bookId ?? null,
    book: bookOfMonth ? serializeBook(bookOfMonth.book) : null,
    joined: !!membership,
    isCreator,
    code: isCreator ? club.code : undefined,
    members,
    progress,
  });
}

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  desc: z.string().max(500).optional(),
  visibility: z.enum(["public", "private"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const limited = await checkRateLimit("write", session.user.id);
  if (limited) return limited;

  const club = await db.club.findUnique({ where: { id: params.id } });
  if (!club) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  if (club.creatorId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const nextVisibility = data.visibility ?? club.visibility;
  let code = club.code;
  if (nextVisibility === "private" && !code) code = generateClubCode();
  if (nextVisibility === "public") code = null;

  const updated = await db.club.update({
    where: { id: club.id },
    data: { ...data, code },
    select: { id: true, name: true, desc: true, visibility: true, code: true },
  });

  return NextResponse.json(updated);
}

/** Arquiva/deleta o clube (só criador). Cascateia membros e mensagens. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const limited = await checkRateLimit("write", session.user.id);
  if (limited) return limited;

  const club = await db.club.findUnique({ where: { id: params.id }, select: { creatorId: true } });
  if (!club) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  if (club.creatorId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await db.club.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
