import * as Sentry from "@sentry/nextjs";
import { db } from "@/lib/db";
import type { NotificationType } from "@/generated/prisma/client";

/** Cria uma notificação in-app. Best-effort: nunca deve derrubar a ação
 * principal — chamar sempre depois da mutação, fora de qualquer transação.
 * Falha vai pro Sentry e é engolida. */
export async function notify(params: {
  userId: string;
  type: NotificationType;
  actorId?: string | null;
  donationId?: string | null;
}): Promise<void> {
  if (params.actorId && params.actorId === params.userId) return;
  try {
    await db.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        actorId: params.actorId ?? null,
        donationId: params.donationId ?? null,
      },
    });
  } catch (err) {
    Sentry.captureException(err);
  }
}
