import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/ratelimit";
import { notify } from "@/lib/notifications";

/** Interessado ESCOLHIDO confirma ter recebido o livro. Se o doador ainda não
 * marcou como doado (status RESERVADO), a confirmação também finaliza a
 * doação — evita o livro ficar preso quando o doador entrega e esquece de
 * marcar. */
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
  if (!donation) return NextResponse.json({ error: "Doação não encontrada" }, { status: 404 });

  const chosen = donation.requests[0];
  if (!chosen || chosen.requesterId !== session.user.id)
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  if (donation.receiverConfirmedAt)
    return NextResponse.json({ error: "Já confirmado" }, { status: 409 });

  const finalize = donation.status === "RESERVADO";

  try {
    await db.donation.update({
      where: { id: params.id },
      data: {
        receiverConfirmedAt: new Date(),
        ...(finalize
          ? { status: "DOADO", donatedAt: new Date(), reservedAt: null, reserveWarnedAt: null }
          : {}),
      },
    });

    await notify({
      userId: donation.donorId,
      type: "DONATION_RECEIPT_CONFIRMED",
      actorId: session.user.id,
      donationId: params.id,
    });

    return NextResponse.json({ ok: true, finalized: finalize });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
