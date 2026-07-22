import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function isMember(clubId: string, userId: string) {
  return !!(await db.clubMember.findUnique({ where: { clubId_userId: { clubId, userId } } }));
}

function serializeMessage(m: {
  id: string;
  text: string;
  system: boolean;
  createdAt: Date;
  user: { username: string; name: string; avatar: number };
  replyTo: { text: string; user: { username: string } } | null;
}) {
  return {
    id: m.id,
    user: `@${m.user.username}`,
    name: m.user.name,
    avatar: m.user.avatar,
    text: m.text,
    system: m.system,
    time: m.createdAt.toISOString(),
    replyTo: m.replyTo ? { user: `@${m.replyTo.user.username}`, text: m.replyTo.text } : null,
  };
}

/** Mensagens após o cursor `after` (id), ou as últimas `limit` sem cursor.
 * Ordem crescente por createdAt (desempate por id, pra estabilidade quando
 * duas mensagens caem no mesmo milissegundo). */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  if (!(await isMember(params.id, session.user.id))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const after = url.searchParams.get("after");
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));

  const messages = after
    ? await db.message.findMany({
        where: { clubId: params.id },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        cursor: { id: after },
        skip: 1,
        include: {
          user: { select: { username: true, name: true, avatar: true } },
          replyTo: { include: { user: { select: { username: true } } } },
        },
      })
    : await db.message.findMany({
        where: { clubId: params.id },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: -limit,
        include: {
          user: { select: { username: true, name: true, avatar: true } },
          replyTo: { include: { user: { select: { username: true } } } },
        },
      });

  return NextResponse.json({ items: messages.map(serializeMessage) });
}

const postSchema = z.object({
  text: z.string().min(1).max(500),
  replyToId: z.string().optional(),
});

/** Publica mensagem no mural. Só membros. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  if (!(await isMember(params.id, session.user.id))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { text, replyToId } = parsed.data;

  if (replyToId) {
    const target = await db.message.findUnique({ where: { id: replyToId }, select: { clubId: true } });
    if (!target || target.clubId !== params.id) {
      return NextResponse.json({ error: "replyTo inválido" }, { status: 400 });
    }
  }

  const message = await db.message.create({
    data: { clubId: params.id, userId: session.user.id, text, replyToId },
    include: {
      user: { select: { username: true, name: true, avatar: true } },
      replyTo: { include: { user: { select: { username: true } } } },
    },
  });

  return NextResponse.json(serializeMessage(message), { status: 201 });
}
