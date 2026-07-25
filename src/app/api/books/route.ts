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
  const sort = url.searchParams.get("sort");
  const ids = url.searchParams.get("ids");

  if (ids) {
    const idList = ids
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 50);
    const books = await db.book.findMany({ where: { id: { in: idList } } });
    const byId = new Map(books.map((b) => [b.id, b]));
    const items = idList.map((id) => byId.get(id)).filter((b): b is NonNullable<typeof b> => Boolean(b));
    return NextResponse.json({ items: items.map(serializeBook) });
  }

  if (!q) {
    if (sort === "trending" || sort === "top") {
      const limit = Math.min(Number(url.searchParams.get("limit")) || 5, PAGE_SIZE);
      const books = await db.book.findMany({
        orderBy:
          sort === "trending"
            ? [{ count: "desc" }, { avg: "desc" }]
            : [{ avg: "desc" }, { count: "desc" }],
        take: limit,
      });
      return NextResponse.json({ items: books.map(serializeBook), nextCursor: null });
    }
    // Sem query nem sort: lista o catálogo (ordem alfabética), para o
    // seletor de livros (BookPicker) e recomendações navegarem sem busca.
    const limit = Math.min(Number(url.searchParams.get("limit")) || PAGE_SIZE, 50);
    const books = await db.book.findMany({ orderBy: [{ title: "asc" }, { id: "asc" }], take: limit });
    return NextResponse.json({ items: books.map(serializeBook), nextCursor: null });
  }

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
