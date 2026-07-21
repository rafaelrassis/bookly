import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recomputeBookRating } from "@/lib/books";

const schema = z.object({
  rating: z.number().min(0).max(5).multipleOf(0.5),
  text: z.string().max(5000).optional(),
});

/** Rating e review são a mesma entidade: upsert cria/atualiza, nota <= 0
 * apaga. Avaliar marca como Lido automaticamente (se ainda não era). Datas
 * de leitura ficam no ShelfEntry e são copiadas pra Review quando existem. */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;
  const bookId = params.id;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { rating, text } = parsed.data;

  const book = await db.book.findUnique({ where: { id: bookId }, select: { id: true } });
  if (!book) return NextResponse.json({ error: "não encontrado" }, { status: 404 });

  const result = await db.$transaction(async (tx) => {
    if (rating <= 0) {
      await tx.review.deleteMany({ where: { userId: uid, bookId } });
      await recomputeBookRating(tx, bookId);
      const entry = await tx.shelfEntry.findUnique({
        where: { userId_bookId: { userId: uid, bookId } },
      });
      return { rating: null, myReview: null, entry };
    }

    const prevEntry = await tx.shelfEntry.findUnique({
      where: { userId_bookId: { userId: uid, bookId } },
    });
    const today = new Date();

    const entry =
      prevEntry?.status === "READ"
        ? prevEntry
        : await tx.shelfEntry.upsert({
            where: { userId_bookId: { userId: uid, bookId } },
            create: { userId: uid, bookId, status: "READ", startedAt: today, finishedAt: today },
            update: {
              status: "READ",
              currentPage: null,
              lastPage: null,
              startedAt: prevEntry?.startedAt ?? today,
              finishedAt: today,
            },
          });

    const review = await tx.review.upsert({
      where: { userId_bookId: { userId: uid, bookId } },
      create: {
        userId: uid,
        bookId,
        rating,
        text: text ?? "",
        startedAt: entry.startedAt,
        finishedAt: entry.finishedAt,
      },
      update: { rating, text: text ?? "", startedAt: entry.startedAt, finishedAt: entry.finishedAt },
    });

    await recomputeBookRating(tx, bookId);
    return { rating: review.rating, myReview: review.text, entry };
  });

  return NextResponse.json(result);
}
