import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeBook } from "@/lib/books";

const LIMIT = 20;

// Consulta o banco a cada request — sem isso o Next tenta pré-renderizar
// esta rota (sem parâmetros dinâmicos) em build time.
export const dynamic = "force-dynamic";

/** Listas públicas de todos os usuários, para a busca sem query ("Listas da
 * comunidade"). Só listas com pelo menos um livro aparecem. */
export async function GET() {
  const lists = await db.list.findMany({
    where: { visibility: "public", books: { some: {} } },
    orderBy: { createdAt: "desc" },
    take: LIMIT,
    include: {
      user: { select: { username: true, name: true } },
      books: { orderBy: { order: "asc" }, include: { book: true } },
    },
  });

  return NextResponse.json({
    items: lists.map((l) => ({
      id: l.id,
      name: l.name,
      by: `@${l.user.username}`,
      bookIds: l.books.map((b) => b.bookId),
      books: l.books.map((b) => serializeBook(b.book)),
    })),
  });
}
