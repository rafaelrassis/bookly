import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeBook } from "@/lib/books";
import { currentMonth, MONTH_REGEX } from "@/lib/clubs";
import { checkRateLimit } from "@/lib/ratelimit";

/** Livro do mês do clube (histórico por `month`) + progresso agregado dos
 * membros, lido de ShelfEntry (nunca recalculado/persistido aqui).
 *
 * `?history=1` retorna os últimos registros do clube (sem agregação) pra
 * listar o histórico de meses; sem ele, retorna o mês pedido (ou o
 * corrente) com started/finished. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;

  const club = await db.club.findUnique({
    where: { id: params.id },
    select: { id: true, visibility: true, members: { select: { userId: true } } },
  });
  if (!club) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  const isMember = club.members.some((m) => m.userId === uid);
  if (club.visibility === "private" && !isMember) {
    return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);

  if (searchParams.get("history")) {
    const items = await db.clubBookOfMonth.findMany({
      where: { clubId: club.id },
      include: { book: true, setBy: { select: { username: true, name: true } } },
      orderBy: { month: "desc" },
      take: 12,
    });
    return NextResponse.json({
      items: items.map((i) => ({
        month: i.month,
        book: serializeBook(i.book),
        setBy: `@${i.setBy.username}`,
        createdAt: i.createdAt,
      })),
    });
  }

  const month = searchParams.get("month") ?? currentMonth();
  if (!MONTH_REGEX.test(month)) {
    return NextResponse.json({ error: "mês inválido" }, { status: 400 });
  }

  const record = await db.clubBookOfMonth.findUnique({
    where: { clubId_month: { clubId: club.id, month } },
    include: { book: true, setBy: { select: { username: true, name: true } } },
  });

  if (!record) {
    return NextResponse.json({
      bookOfMonth: null,
      totalMembers: club.members.length,
      started: 0,
      finished: 0,
      mine: null,
    });
  }

  const memberIds = club.members.map((m) => m.userId);
  const entries = await db.shelfEntry.findMany({
    where: { userId: { in: memberIds }, bookId: record.bookId },
    select: { userId: true, status: true, currentPage: true },
  });
  const started = entries.filter((e) => e.status === "READING" || e.status === "READ").length;
  const finished = entries.filter((e) => e.status === "READ").length;
  const mine = entries.find((e) => e.userId === uid);

  return NextResponse.json({
    bookOfMonth: {
      id: record.id,
      month: record.month,
      book: serializeBook(record.book),
      setBy: `@${record.setBy.username}`,
      createdAt: record.createdAt,
    },
    totalMembers: memberIds.length,
    started,
    finished,
    mine: mine ? { status: mine.status, currentPage: mine.currentPage } : null,
  });
}

const putSchema = z.object({
  bookId: z.string().min(1),
  month: z.string().regex(MONTH_REGEX).optional(),
});

/** Define/troca o livro do mês (upsert por clubId+month) — só o criador do
 * clube; a mesma trava de admin usada em PATCH/DELETE de clube. */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;

  const limited = await checkRateLimit("write", uid);
  if (limited) return limited;

  const club = await db.club.findUnique({ where: { id: params.id }, select: { creatorId: true } });
  if (!club) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  if (club.creatorId !== uid) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = putSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { bookId, month = currentMonth() } = parsed.data;

  const book = await db.book.findUnique({ where: { id: bookId }, select: { id: true } });
  if (!book) return NextResponse.json({ error: "livro inexistente" }, { status: 400 });

  const record = await db.clubBookOfMonth.upsert({
    where: { clubId_month: { clubId: params.id, month } },
    create: { clubId: params.id, bookId, month, setById: uid },
    update: { bookId, setById: uid },
    include: { book: true, setBy: { select: { username: true, name: true } } },
  });

  return NextResponse.json({
    id: record.id,
    month: record.month,
    book: serializeBook(record.book),
    setBy: `@${record.setBy.username}`,
    createdAt: record.createdAt,
  });
}
