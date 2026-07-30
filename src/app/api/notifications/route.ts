import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Últimas notificações do usuário logado + contador de não lidas, pro sino
 * e pra tela de notificações. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const [notifications, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        actor: { select: { id: true, username: true, name: true, avatar: true, avatarUrl: true } },
        donation: { select: { id: true, bookId: true, book: { select: { title: true } } } },
      },
    }),
    db.notification.count({ where: { userId: session.user.id, read: false } }),
  ]);

  return NextResponse.json({ notifications, unread });
}
