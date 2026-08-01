import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { GROUPABLE_NOTIFICATION_TYPES } from "@/lib/notification-grouping";
import type { NotificationType } from "@/generated/prisma/client";

const schema = z.object({ type: z.string(), donationId: z.string() });

/** Marca de uma vez todas as notificações não lidas de um grupo (mesmo tipo +
 * mesma doação) como lidas — usado ao tocar num item agrupado na lista. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido" }, { status: 400 });

  const { type, donationId } = parsed.data;
  if (!GROUPABLE_NOTIFICATION_TYPES.includes(type as NotificationType))
    return NextResponse.json({ error: "Tipo não agrupável" }, { status: 400 });

  await db.notification.updateMany({
    where: { userId: session.user.id, type: type as NotificationType, donationId, read: false },
    data: { read: true },
  });
  return NextResponse.json({ ok: true });
}
