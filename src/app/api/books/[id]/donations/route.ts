import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeDonation } from "@/lib/donations";

/** Doações disponíveis de um livro, com filtro opcional de UF/cidade
 * ("Todo o Brasil" no client = sem `uf`). */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  const { searchParams } = new URL(req.url);
  const uf = searchParams.get("uf")?.toUpperCase();
  const city = searchParams.get("cidade");

  const donations = await db.donation.findMany({
    where: {
      bookId: params.id,
      status: { in: ["DISPONIVEL", "RESERVADO"] },
      ...(uf ? { state: uf } : {}),
      ...(city ? { city: { equals: city, mode: "insensitive" } } : {}),
    },
    include: { requests: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    donations: donations.map((d) => serializeDonation(d, viewerId)),
  });
}
