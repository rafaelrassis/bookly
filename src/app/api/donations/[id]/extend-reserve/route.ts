import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/ratelimit";
import { notify } from "@/lib/notifications";

/** Doador estende o prazo de uma reserva atrasada — reseta `reservedAt` pra
 * agora, reaproveitando o cron de expiração (ver donation-expiry.ts). */
export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const limited = await checkRateLimit("write", session.user.id);
  if (limited) return limited;

  const donation = await db.donation.findUnique({
    where: { id: params.id },
    include: {
      requests: { where: { status: "ESCOLHIDO" }, select: { requesterId: true }, take: 1 },
    },
  });
  if (!donation || donation.donorId !== session.user.id)
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  if (donation.status !== "RESERVADO")
    return NextResponse.json({ error: "Só reservas podem ser estendidas" }, { status: 409 });

  try {
    await db.donation.update({
      where: { id: params.id },
      data: { reservedAt: new Date(), reserveWarnedAt: null },
    });

    const chosen = donation.requests[0];
    if (chosen)
      await notify({
        userId: chosen.requesterId,
        type: "DONATION_RESERVE_EXTENDED",
        actorId: session.user.id,
        donationId: params.id,
      });

    return NextResponse.json({ ok: true });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
