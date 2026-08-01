import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { groupNotifications } from "@/lib/notification-grouping";

export const dynamic = "force-dynamic";

/** Últimas notificações do usuário logado (agrupadas — ver
 * lib/notification-grouping) + contador de não lidas, pro sino e pra tela de
 * notificações. O contador conta notificações individuais, não grupos. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const [raw, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        actor: { select: { id: true, username: true, name: true, avatar: true, avatarUrl: true } },
        donation: { select: { id: true, bookId: true, book: { select: { title: true } } } },
      },
    }),
    db.notification.count({ where: { userId: session.user.id, read: false } }),
  ]);

  return NextResponse.json({ notifications: groupNotifications(raw), unread });
}
