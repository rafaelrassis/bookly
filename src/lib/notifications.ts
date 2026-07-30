import { db } from "@/lib/db";
import type { NotificationType } from "@/generated/prisma/client";

/** Grava uma notificação server-side. Hoje só usada pelo cron de expiração
 * de reserva (src/lib/donation-expiry.ts), que roda sem sessão de usuário —
 * o feed de like/comment/follow continua no client store (src/lib/store). */
export async function notify(params: { userId: string; type: NotificationType; donationId?: string }) {
  await db.notification.create({
    data: { userId: params.userId, type: params.type, donationId: params.donationId ?? null },
  });
}
