import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeDonation } from "@/lib/donations";
import { haversineKm } from "@/lib/geo";
import type { DonationStatus } from "@/generated/prisma/client";

const STATUS_FILTER: { in: DonationStatus[] } = { in: ["DISPONIVEL", "RESERVADO"] };

/** Doações disponíveis de um livro, com filtro opcional de UF/cidade
 * ("Todo o Brasil" no client = sem `uf`), ou por raio de proximidade
 * (`lat`/`lng`/`radiusKm`, geolocalização do navegador). Se `lat`/`lng`/
 * `radiusKm` vierem ausentes, comportamento por cidade/UF não muda. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  const { searchParams } = new URL(req.url);
  const uf = searchParams.get("uf")?.toUpperCase();
  const city = searchParams.get("cidade");
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");
  const radiusParam = searchParams.get("radiusKm");

  if (latParam != null && lngParam != null && radiusParam != null) {
    const lat = Number(latParam);
    const lng = Number(lngParam);
    const radiusKm = Number(radiusParam);
    const valid =
      Number.isFinite(lat) &&
      lat >= -90 &&
      lat <= 90 &&
      Number.isFinite(lng) &&
      lng >= -180 &&
      lng <= 180 &&
      Number.isInteger(radiusKm) &&
      radiusKm >= 1 &&
      radiusKm <= 500;
    if (!valid) {
      return NextResponse.json({ error: "Parâmetros de raio inválidos" }, { status: 400 });
    }

    // Sem PostGIS: bounding box grosseiro na query (graus aprox. por km),
    // distância exata via Haversine em memória — cap de 500km evita uma
    // bounding box gigante sem índice geoespacial.
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

    const candidates = await db.donation.findMany({
      where: {
        bookId: params.id,
        status: STATUS_FILTER,
        latitude: { gte: lat - latDelta, lte: lat + latDelta },
        longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
      },
      include: { requests: true },
      orderBy: { createdAt: "desc" },
    });

    const donations = candidates
      .map((d) => ({
        ...serializeDonation(d, viewerId),
        distanceKm: haversineKm(lat, lng, d.latitude!, d.longitude!),
      }))
      .filter((d) => d.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return NextResponse.json({ donations });
  }

  const donations = await db.donation.findMany({
    where: {
      bookId: params.id,
      status: STATUS_FILTER,
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
