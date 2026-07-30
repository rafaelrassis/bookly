import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreateBook } from "@/lib/books";
import { recordFeedEvent } from "@/lib/feed-event";
import { geocodeCityState } from "@/lib/geocode";
import { checkRateLimit } from "@/lib/ratelimit";
import { createDonationSchema } from "@/lib/validators/donation";

/** Minhas doações (qualquer status) — usado num painel "minhas doações". */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const donations = await db.donation.findMany({
    where: { donorId: session.user.id },
    include: { book: true, requests: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    donations: donations.map((d) => ({
      id: d.id,
      bookId: d.bookId,
      bookTitle: d.book.title,
      authors: d.book.authors,
      photoUrl: d.photoUrl,
      city: d.city,
      state: d.state,
      status: d.status,
      pendingRequests: d.requests.filter((r) => r.status === "PENDENTE").length,
      createdAt: d.createdAt,
      donatedAt: d.donatedAt,
      receiverConfirmedAt: d.receiverConfirmedAt,
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const limited = await checkRateLimit("write", session.user.id);
  if (limited) return limited;

  const json = await req.json().catch(() => null);
  const parsed = createDonationSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const { bookId, ...data } = parsed.data;

  let book;
  try {
    book = await getOrCreateBook(bookId);
  } catch (err) {
    console.error("[donations] Google Books falhou:", err);
    Sentry.captureException(err);
    return NextResponse.json({ error: "Não foi possível validar o livro" }, { status: 502 });
  }
  if (!book) return NextResponse.json({ error: "Livro não encontrado" }, { status: 404 });

  // Geocoding é best-effort: falha (typo, cidade não encontrada, Nominatim
  // fora do ar) não bloqueia a criação, só deixa a doação de fora da busca
  // por raio (continua aparecendo nos filtros por cidade/UF exata).
  const coords = await geocodeCityState(data.city, data.state);

  try {
    const donation = await db.donation.create({
      data: {
        ...data,
        bookId,
        donorId: session.user.id,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      },
    });
    await recordFeedEvent(db, {
      userId: session.user.id,
      type: "DONATION_CREATED",
      bookId,
      donationId: donation.id,
    });
    return NextResponse.json({ id: donation.id }, { status: 201 });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
