import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/ratelimit";

/** Registra interesse ("Quero este") na doação. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const limited = await checkRateLimit("write", session.user.id);
  if (limited) return limited;

  const donation = await db.donation.findUnique({ where: { id: params.id } });
  if (!donation) return NextResponse.json({ error: "Doação não encontrada" }, { status: 404 });
  if (donation.status !== "DISPONIVEL")
    return NextResponse.json({ error: "Doação indisponível" }, { status: 409 });
  if (donation.donorId === session.user.id)
    return NextResponse.json({ error: "Você não pode pedir sua própria doação" }, { status: 400 });

  try {
    await db.donationRequest.create({
      data: { donationId: params.id, requesterId: session.user.id },
    });
  } catch {
    return NextResponse.json({ error: "Você já pediu este livro" }, { status: 409 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

/** Fila de interessados — só o doador enxerga. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const donation = await db.donation.findUnique({ where: { id: params.id } });
  if (!donation || donation.donorId !== session?.user?.id)
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const requests = await db.donationRequest.findMany({
    where: { donationId: params.id, status: { in: ["PENDENTE", "ESCOLHIDO"] } },
    include: {
      requester: { select: { id: true, username: true, name: true, avatar: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ requests });
}
