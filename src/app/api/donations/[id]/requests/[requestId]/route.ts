import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/ratelimit";

const patchSchema = z.object({ action: z.enum(["escolher", "recusar"]) });

/** Doador escolhe (libera o contato) ou recusa um interessado da fila. */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; requestId: string } },
) {
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

  try {
    if (parsed.data.action === "recusar") {
      await db.donationRequest.update({
        where: { id: params.requestId },
        data: { status: "RECUSADO" },
      });
      return NextResponse.json({ ok: true });
    }

    if (donation.status !== "DISPONIVEL")
      return NextResponse.json({ error: "Doação já reservada" }, { status: 409 });

    await db.$transaction([
      db.donationRequest.update({
        where: { id: params.requestId },
        data: { status: "ESCOLHIDO" },
      }),
      db.donation.update({
        where: { id: params.id },
        data: { status: "RESERVADO" },
      }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
