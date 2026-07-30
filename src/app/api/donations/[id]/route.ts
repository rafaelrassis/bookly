import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/ratelimit";
import { notify } from "@/lib/notifications";

const patchSchema = z.object({ action: z.literal("doado") });

/** Marca a doação como concluída. */
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

  await db.donation.update({
    where: { id: params.id },
    data: { status: "DOADO", donatedAt: new Date() },
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
