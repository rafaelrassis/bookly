import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { currentMonth, MONTH_REGEX, shelfPercent } from "@/lib/clubs";

/** Progresso comparado dos membros no livro do mês: quem terminou e quem
 * está lendo aparecem nomeados (ordenados por %); quem ainda não começou
 * entra só na contagem, sem nome — expor avanço é o espírito da feature,
 * constranger quem não começou não é. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
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
  const isMember = club.members.some((m) => m.userId === uid);
  if (club.visibility === "private" && !isMember) {
    return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") ?? currentMonth();
  if (!MONTH_REGEX.test(month)) {
    return NextResponse.json({ error: "mês inválido" }, { status: 400 });
  }

  const record = await db.clubBookOfMonth.findUnique({
    where: { clubId_month: { clubId: club.id, month } },
    select: { bookId: true, book: { select: { pages: true } } },
  });
  if (!record) {
    return NextResponse.json({ error: "NO_BOOK_OF_MONTH" }, { status: 404 });
  }

  const entries = await db.shelfEntry.findMany({
    where: { userId: { in: club.members.map((m) => m.userId) }, bookId: record.bookId },
    select: { userId: true, status: true, currentPage: true },
  });
  const byUser = new Map(entries.map((e) => [e.userId, e]));

  const finished = [];
  const reading = [];
  let notStartedCount = 0;

  for (const m of club.members) {
    const entry = byUser.get(m.userId);
    const row = {
      userId: m.userId,
      user: `@${m.user.username}`,
      name: m.user.name,
      avatar: m.user.avatar,
      avatarUrl: m.user.avatarUrl,
      currentPage: entry?.currentPage ?? null,
      percent: shelfPercent(entry, record.book.pages),
    };
    if (entry?.status === "READ") finished.push(row);
    else if (entry?.status === "READING") reading.push(row);
    else notStartedCount++;
  }
  reading.sort((a, b) => b.percent - a.percent);

  return NextResponse.json({
    finished,
    reading,
    notStartedCount,
    totalMembers: club.members.length,
  });
}
