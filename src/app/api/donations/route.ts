import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreateBook } from "@/lib/books";
import { checkRateLimit } from "@/lib/ratelimit";
import { createDonationSchema } from "@/lib/validators/donation";

/** Minhas doações (qualquer status) — usado num painel "minhas doações". */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const donations = await db.donation.findMany({
    where: { donorId: session.user.id },
    include: { book: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    donations: donations.map((d) => ({
      id: d.id,
      bookId: d.bookId,
      bookTitle: d.book.title,
      photoUrl: d.photoUrl,
      city: d.city,
      state: d.state,
      status: d.status,
      createdAt: d.createdAt,
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
    return NextResponse.json({ error: "Não foi possível validar o livro" }, { status: 502 });
  }
  if (!book) return NextResponse.json({ error: "Livro não encontrado" }, { status: 404 });

  const donation = await db.donation.create({
    data: { ...data, bookId, donorId: session.user.id },
  });

  return NextResponse.json({ id: donation.id }, { status: 201 });
}
