import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/ratelimit";
import { notify } from "@/lib/notifications";
import { buildDonationTimeline } from "@/lib/donation-state";

const patchSchema = z.object({ action: z.enum(["doado", "cancelar-reserva"]) });

const ACTOR_SELECT = { id: true, username: true, name: true, avatar: true, avatarUrl: true } as const;

/** Tudo que a tela de negociação (/donations/[id]) precisa numa chamada só —
 * ver ApiDonationDetail (lib/types). Visível pro doador, pelo interessado
 * ESCOLHIDO, ou por qualquer interessado com pedido PENDENTE (só o próprio
 * status do pedido, nunca o contato — mesma regra de serializeDonation). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  const donation = await db.donation.findUnique({
    where: { id: params.id },
    include: {
      book: { select: { id: true, title: true, authors: true } },
      donor: { select: ACTOR_SELECT },
      requests: {
        where: { status: { in: ["PENDENTE", "ESCOLHIDO"] } },
        include: { requester: { select: ACTOR_SELECT } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!donation) return NextResponse.json({ error: "Doação não encontrada" }, { status: 404 });

  if (!viewerId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const isDonor = donation.donorId === viewerId;
  const myRequest = donation.requests.find((r) => r.requesterId === viewerId) ?? null;
  const isReceiver = myRequest?.status === "ESCOLHIDO";

  if (!isDonor && !myRequest) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const myRole = isDonor ? "donor" : isReceiver ? "receiver" : "requester";
  const chosen = donation.requests.find((r) => r.status === "ESCOLHIDO") ?? null;
  const canSeeContact = isDonor || isReceiver;

  const notifications = await db.notification.findMany({
    where: { donationId: donation.id },
    orderBy: { createdAt: "asc" },
    include: { actor: { select: ACTOR_SELECT } },
  });

  return NextResponse.json({
    id: donation.id,
    bookId: donation.bookId,
    book: donation.book,
    photoUrl: donation.photoUrl,
    city: donation.city,
    state: donation.state,
    status: donation.status,
    createdAt: donation.createdAt,
    donatedAt: donation.donatedAt,
    receiverConfirmedAt: donation.receiverConfirmedAt,
    reservedAt: donation.reservedAt,
    donor: donation.donor,
    myRole,
    myRequest: myRequest && { id: myRequest.id, status: myRequest.status },
    contact: canSeeContact ? { whatsapp: donation.whatsapp, instagram: donation.instagram } : null,
    counterpart: isDonor ? (chosen?.requester ?? null) : donation.donor,
    requests: isDonor
      ? donation.requests
          .filter((r) => r.status === "PENDENTE")
          .map((r) => ({ id: r.id, status: r.status, createdAt: r.createdAt, requester: r.requester }))
      : undefined,
    timeline: buildDonationTimeline({
      donationCreatedAt: donation.createdAt,
      donor: donation.donor,
      notifications: notifications.map((n) => ({ type: n.type, actor: n.actor, createdAt: n.createdAt })),
    }),
  });
}

/** Marca a doação como concluída, ou cancela uma reserva em andamento
 * (volta pra DISPONIVEL, sem apagar a doação nem a fila de interessados —
 * ver `cancelar-reserva` abaixo). */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const limited = await checkRateLimit("write", session.user.id);
  if (limited) return limited;

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Ação inválida" }, { status: 400 });

  const donation = await db.donation.findUnique({ where: { id: params.id } });
  if (!donation || donation.donorId !== session.user.id)
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  if (parsed.data.action === "cancelar-reserva") {
    if (donation.status !== "RESERVADO") {
      return NextResponse.json({ error: "Só reservas podem ser canceladas" }, { status: 409 });
    }

    // Mesma transição do cron de expiração (donation-expiry.ts): volta pra
    // DISPONIVEL e devolve o escolhido pra fila (PENDENTE) em vez de
    // recusá-lo — o doador pode reconsiderá-lo depois, e outros pedidos
    // pendentes continuam intactos.
    const chosen = await db.donationRequest.findFirst({
      where: { donationId: params.id, status: "ESCOLHIDO" },
      select: { id: true, requesterId: true },
    });

    await db.$transaction([
      db.donation.update({
        where: { id: params.id },
        data: { status: "DISPONIVEL", reservedAt: null, reserveWarnedAt: null },
      }),
      ...(chosen
        ? [db.donationRequest.update({ where: { id: chosen.id }, data: { status: "PENDENTE" } })]
        : []),
    ]);

    if (chosen) {
      await notify({
        userId: chosen.requesterId,
        type: "DONATION_RESERVE_EXPIRED",
        actorId: session.user.id,
        donationId: params.id,
      });
    }

    return NextResponse.json({ ok: true });
  }

  await db.donation.update({
    where: { id: params.id },
    data: { status: "DOADO", donatedAt: new Date(), reservedAt: null, reserveWarnedAt: null },
  });

  const chosen = await db.donationRequest.findFirst({
    where: { donationId: params.id, status: "ESCOLHIDO" },
    select: { requesterId: true },
  });
  if (chosen) {
    await notify({
      userId: chosen.requesterId,
      type: "DONATION_COMPLETED",
      actorId: session.user.id,
      donationId: params.id,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const limited = await checkRateLimit("write", session.user.id);
  if (limited) return limited;

  const donation = await db.donation.findUnique({ where: { id: params.id } });
  if (!donation || donation.donorId !== session.user.id)
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  await db.donation.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
