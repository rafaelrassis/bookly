import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeBook } from "@/lib/books";

const PAGE_SIZE = 20;

/** Busca por título/autor no catálogo semeado (ILIKE). Google Books fica
 * como enriquecimento futuro — ver docs/specs/spec-3a. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const cursor = url.searchParams.get("cursor") ?? undefined;

  if (!q) return NextResponse.json({ items: [], nextCursor: null });

  const books = await db.book.findMany({
    where: { OR: [{ title: { contains: q, mode: "insensitive" } }, { authors: { contains: q, mode: "insensitive" } }] },
    orderBy: [{ title: "asc" }, { id: "asc" }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = books.length > PAGE_SIZE;
  const items = books.slice(0, PAGE_SIZE);

  return NextResponse.json({
    items: items.map(serializeBook),
    nextCursor: hasMore ? items[items.length - 1].id : null,
  });
}
