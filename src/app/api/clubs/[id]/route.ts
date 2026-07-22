import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeBook } from "@/lib/books";
import { generateClubCode, shelfPercent } from "@/lib/clubs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;

  const club = await db.club.findUnique({
    where: { id: params.id },
    include: {
      book: true,
      members: { include: { user: { select: { username: true, name: true, avatar: true } } } },
    },
  });
  if (!club) return NextResponse.json({ error: "não encontrado" }, { status: 404 });

  const membership = club.members.find((m) => m.userId === uid);
  const isCreator = club.creatorId === uid;
  if (club.visibility === "private" && !membership) {
    return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  }

  const entries = await db.shelfEntry.findMany({
    where: { bookId: club.bookId, userId: { in: club.members.map((m) => m.userId) } },
    select: { userId: true, status: true, currentPage: true },
  });
  const byUser = new Map(entries.map((e) => [e.userId, e]));

  const members = club.members.map((m) => ({
    userId: m.userId,
    user: `@${m.user.username}`,
    name: m.user.name,
    avatar: m.user.avatar,
    role: m.role,
    percent: shelfPercent(byUser.get(m.userId), club.book.pages),
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
    bookId: club.bookId,
    book: serializeBook(club.book),
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
  bookId: z.string().optional(),
  visibility: z.enum(["public", "private"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const club = await db.club.findUnique({ where: { id: params.id } });
  if (!club) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  if (club.creatorId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  if (data.bookId) {
    const book = await db.book.findUnique({ where: { id: data.bookId }, select: { id: true } });
    if (!book) return NextResponse.json({ error: "livro inexistente" }, { status: 400 });
  }

  const nextVisibility = data.visibility ?? club.visibility;
  let code = club.code;
  if (nextVisibility === "private" && !code) code = generateClubCode();
  if (nextVisibility === "public") code = null;

  const updated = await db.$transaction(async (tx) => {
    const result = await tx.club.update({
      where: { id: club.id },
      data: { ...data, code },
      select: { id: true, name: true, desc: true, visibility: true, bookId: true, code: true },
    });
    // livro trocado: derivado de progresso muda de sentido, zera pra não perder a próxima mensagem de sistema.
    if (data.bookId && data.bookId !== club.bookId) {
      await tx.clubMember.updateMany({ where: { clubId: club.id }, data: { progress: null } });
    }
    return result;
  });

  return NextResponse.json(updated);
}

/** Arquiva/deleta o clube (só criador). Cascateia membros e mensagens. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const club = await db.club.findUnique({ where: { id: params.id }, select: { creatorId: true } });
  if (!club) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  if (club.creatorId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await db.club.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
