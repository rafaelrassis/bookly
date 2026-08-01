import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Doações em que o usuário logado é o interessado ESCOLHIDO — "Recebidos" no perfil.
 * O `where` por requesterId garante que só vêm itens do próprio usuário; o contato do
 * doador (só ele tem direito de ver) é omitido depois que a doação já foi entregue. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const requests = await db.donationRequest.findMany({
    where: { requesterId: session.user.id, status: "ESCOLHIDO" },
    include: {
      donation: {
        include: {
          book: true,
          donor: { select: { id: true, username: true, name: true, avatar: true, avatarUrl: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const shaped = requests.map((r) => ({
    requestId: r.id,
    donationId: r.donation.id,
    bookId: r.donation.bookId,
    bookTitle: r.donation.book.title,
    authors: r.donation.book.authors,
    photoUrl: r.donation.photoUrl,
    city: r.donation.city,
    state: r.donation.state,
    status: r.donation.status,
    createdAt: r.createdAt,
    donatedAt: r.donation.donatedAt,
    receiverConfirmedAt: r.donation.receiverConfirmedAt,
    reservedAt: r.donation.reservedAt,
    contact:
      r.donation.status === "RESERVADO"
        ? { whatsapp: r.donation.whatsapp, instagram: r.donation.instagram }
        : null,
    donor: r.donation.donor,
  }));

  return NextResponse.json({
    emAndamento: shaped.filter((d) => d.status === "RESERVADO"),
    recebidos: shaped.filter((d) => d.status === "DOADO"),
  });
}
