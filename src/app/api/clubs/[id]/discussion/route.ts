import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { currentMonth, MONTH_REGEX } from "@/lib/clubs";
import { checkRateLimit } from "@/lib/ratelimit";

async function isMember(clubId: string, userId: string) {
  return !!(await db.clubMember.findUnique({ where: { clubId_userId: { clubId, userId } } }));
}

function serializeComment(c: {
  id: string;
  content: string;
  page: number;
  createdAt: Date;
  author: { username: string | null; name: string; avatar: number; avatarUrl: string | null };
}) {
  return {
    id: c.id,
    content: c.content,
    page: c.page,
    createdAt: c.createdAt.toISOString(),
    author: {
      user: `@${c.author.username ?? ""}`,
      name: c.author.name,
      avatar: c.author.avatar,
      avatarUrl: c.author.avatarUrl,
    },
  };
}

/** Discussão do livro do mês travada por progresso: comentários filtrados
 * no servidor pela página até onde o próprio leitor chegou (Seção 2 da
 * spec) — nunca no cliente, senão dá pra ver o payload cru no devtools. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;

  if (!(await isMember(params.id, uid))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") ?? currentMonth();
  if (!MONTH_REGEX.test(month)) {
    return NextResponse.json({ error: "mês inválido" }, { status: 400 });
  }

  const bookOfMonth = await db.clubBookOfMonth.findUnique({
    where: { clubId_month: { clubId: params.id, month } },
    select: { id: true, bookId: true },
  });
  if (!bookOfMonth) {
    return NextResponse.json({ error: "NO_BOOK_OF_MONTH" }, { status: 404 });
  }

  const myEntry = await db.shelfEntry.findUnique({
    where: { userId_bookId: { userId: uid, bookId: bookOfMonth.bookId } },
    select: { status: true, currentPage: true },
  });

  const maxPage =
    !myEntry || myEntry.status === "WANT_TO_READ"
      ? -1
      : myEntry.status === "READING"
        ? myEntry.currentPage ?? 0
        : Infinity; // READ ou DNF

  const comments =
    maxPage === -1
      ? []
      : await db.clubDiscussionComment.findMany({
          where: {
            clubBookOfMonthId: bookOfMonth.id,
            ...(maxPage === Infinity ? {} : { page: { lte: maxPage } }),
          },
          include: { author: { select: { username: true, name: true, avatar: true, avatarUrl: true } } },
          orderBy: { createdAt: "asc" },
        });

  const lockedCount =
    maxPage === -1
      ? undefined
      : maxPage === Infinity
        ? 0
        : await db.clubDiscussionComment.count({
            where: { clubBookOfMonthId: bookOfMonth.id, page: { gt: maxPage } },
          });

  return NextResponse.json({
    bookOfMonthId: bookOfMonth.id,
    bookId: bookOfMonth.bookId,
    mine: myEntry ? { status: myEntry.status, currentPage: myEntry.currentPage } : null,
    comments: comments.map(serializeComment),
    lockedCount,
  });
}

const postSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  page: z.number().int().min(0),
});

/** Publica comentário na discussão do livro do mês. A página não pode
 * passar do progresso do próprio autor (Seção 2) — barra spoiler acidental
 * embaixo de uma tag de página errada. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;

  if (!(await isMember(params.id, uid))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const limited = await checkRateLimit("write", uid);
  if (limited) return limited;

  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { content, page } = parsed.data;

  const month = currentMonth();
  const bookOfMonth = await db.clubBookOfMonth.findUnique({
    where: { clubId_month: { clubId: params.id, month } },
    select: { id: true, bookId: true },
  });
  if (!bookOfMonth) {
    return NextResponse.json({ error: "NO_BOOK_OF_MONTH" }, { status: 404 });
  }

  const authorEntry = await db.shelfEntry.findUnique({
    where: { userId_bookId: { userId: uid, bookId: bookOfMonth.bookId } },
    select: { status: true, currentPage: true },
  });
  if (!authorEntry || authorEntry.status === "WANT_TO_READ") {
    return NextResponse.json({ error: "NO_PROGRESS" }, { status: 400 });
  }
  if (authorEntry.status === "READING" && page > (authorEntry.currentPage ?? 0)) {
    return NextResponse.json({ error: "PAGE_BEYOND_YOUR_PROGRESS" }, { status: 400 });
  }

  const comment = await db.clubDiscussionComment.create({
    data: { clubBookOfMonthId: bookOfMonth.id, authorId: uid, content, page },
    include: { author: { select: { username: true, name: true, avatar: true, avatarUrl: true } } },
  });

  return NextResponse.json(serializeComment(comment), { status: 201 });
}
