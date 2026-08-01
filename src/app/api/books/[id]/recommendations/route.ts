import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCoOccurrenceRecommendations } from "@/lib/recommendations";

/** "Quem leu isso também leu" — funciona sem login também (só não filtra a
 * estante própria, porque não tem estante nesse contexto). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const bookId = params.id;

  const book = await db.book.findUnique({ where: { id: bookId }, select: { id: true } });
  if (!book) return NextResponse.json({ error: "não encontrado" }, { status: 404 });

  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  let myShelfBookIds: string[] = [];
  if (viewerId) {
    const entries = await db.shelfEntry.findMany({ where: { userId: viewerId }, select: { bookId: true } });
    myShelfBookIds = entries.map((e) => e.bookId);
  }

  const recommendations = await getCoOccurrenceRecommendations(bookId, myShelfBookIds);
  return NextResponse.json({ recommendations });
}
