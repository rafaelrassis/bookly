import { db } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { RESERVE_EXPIRY_DAYS, RESERVE_WARN_DAYS } from "@/lib/donation-config";

const DAY = 24 * 60 * 60 * 1000;

/** Reverte reservas paradas há mais de RESERVE_EXPIRY_DAYS pra DISPONIVEL e
 * avisa quem está a RESERVE_WARN_DAYS do prazo. Separado da rota do cron
 * pra ser testável em unidade com um `now` fixo, sem HTTP. */
export async function processReserveExpiry(now = new Date()) {
  const expiryCutoff = new Date(now.getTime() - RESERVE_EXPIRY_DAYS * DAY);
  const warnCutoff = new Date(now.getTime() - RESERVE_WARN_DAYS * DAY);

  const toExpire = await db.donation.findMany({
    where: { status: "RESERVADO", reservedAt: { lte: expiryCutoff } },
    select: {
      id: true,
      donorId: true,
      requests: {
        where: { status: "ESCOLHIDO" },
        select: { id: true, requesterId: true },
        take: 1,
      },
    },
  });

  for (const d of toExpire) {
    const chosen = d.requests[0];
    await db.$transaction([
      db.donation.update({
        where: { id: d.id },
        data: { status: "DISPONIVEL", reservedAt: null, reserveWarnedAt: null },
      }),
      ...(chosen
        ? [
            db.donationRequest.update({
              where: { id: chosen.id },
              data: { status: "PENDENTE" },
            }),
          ]
        : []),
    ]);

    await notify({ userId: d.donorId, type: "DONATION_RESERVE_EXPIRED", donationId: d.id });
    if (chosen)
      await notify({
        userId: chosen.requesterId,
        type: "DONATION_RESERVE_EXPIRED",
        donationId: d.id,
      });
  }

  const toWarn = await db.donation.findMany({
    where: {
      status: "RESERVADO",
      reservedAt: { lte: warnCutoff, gt: expiryCutoff },
      reserveWarnedAt: null,
    },
    select: {
      id: true,
      donorId: true,
      requests: { where: { status: "ESCOLHIDO" }, select: { requesterId: true }, take: 1 },
    },
  });

  for (const d of toWarn) {
    await db.donation.update({
      where: { id: d.id },
      data: { reserveWarnedAt: now },
    });
    await notify({ userId: d.donorId, type: "DONATION_RESERVE_EXPIRING", donationId: d.id });
    const chosen = d.requests[0];
    if (chosen)
      await notify({
        userId: chosen.requesterId,
        type: "DONATION_RESERVE_EXPIRING",
        donationId: d.id,
      });
  }

  return { expired: toExpire.length, warned: toWarn.length };
}
