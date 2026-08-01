import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeBook } from "@/lib/books";
import { idsWithDonations } from "@/lib/donations-map";
import type { Prisma } from "@/generated/prisma/client";
import type { ShelfStatus } from "@/lib/types";

const STATUS_VALUES: ShelfStatus[] = ["WANT_TO_READ", "READING", "READ", "DNF"];
const DEFAULT_LIMIT = 60;
const MAX_LIMIT = 100;

/** Busca case-insensitive; acentos também são ignorados (mesma normalização do front). */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "");
}

function parseStatus(value: string | null): ShelfStatus | null {
  return value && (STATUS_VALUES as string[]).includes(value) ? (value as ShelfStatus) : null;
}

/** Livros da estante do usuário com filtros compostos (status/gênero/tag/busca).
 *
 * Dois modos, escolhidos pela presença de `limit`/`cursor` na query:
 *
 * - **Legado** (nenhum dos dois presente): resposta idêntica à de sempre —
 *   `{ items, genres, tags }` com a estante inteira já filtrada. Mantido
 *   byte-a-byte pros consumidores que ainda esperam a lista completa
 *   (profile/edit, lists/[id], useRecommendations, e2e/books-api.spec.ts).
 * - **Paginado** (opt-in, usado pela tela /shelf): cursor-based, com
 *   facetas de status e contagem total pro filtro atual — ver Proposta 2
 *   do audit de UX. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const paginated = url.searchParams.has("limit") || url.searchParams.has("cursor");

  return paginated ? getPaginated(uid, url) : getLegacy(uid, url);
}

async function getLegacy(uid: string, url: URL) {
  const status = url.searchParams.get("status");
  const genre = url.searchParams.get("genre");
  const tag = url.searchParams.get("tag");
  const q = normalize(url.searchParams.get("q")?.trim() ?? "");

  const [entries, tagRows, reviews] = await Promise.all([
    db.shelfEntry.findMany({ where: { userId: uid }, include: { book: true } }),
    db.bookTag.findMany({ where: { userId: uid } }),
    db.review.findMany({ where: { userId: uid }, select: { bookId: true, rating: true } }),
  ]);

  const tagsByBook = new Map<string, string[]>();
  for (const row of tagRows) {
    tagsByBook.set(row.bookId, [...(tagsByBook.get(row.bookId) ?? []), row.tag]);
  }
  const ratingByBook = new Map(reviews.map((r) => [r.bookId, r.rating]));

  const genres = Array.from(new Set(entries.map((e) => e.book.genre))).sort();
  const tags = Array.from(new Set(tagRows.map((t) => t.tag))).sort();
  const withDonation = await idsWithDonations(entries.map((e) => e.bookId));

  const items = entries
    .map((e) => ({
      book: { ...serializeBook(e.book), hasDonation: withDonation.has(e.bookId) },
      entry: {
        status: e.status,
        currentPage: e.currentPage,
        lastPage: e.lastPage,
        startedAt: e.startedAt,
        finishedAt: e.finishedAt,
        abandonedAt: e.abandonedAt,
      },
      tags: (tagsByBook.get(e.bookId) ?? []).sort(),
      rating: ratingByBook.get(e.bookId) ?? null,
    }))
    .filter(({ book, entry, tags: bookTags }) => {
      if (q && !normalize(book.title).includes(q) && !normalize(book.authors).includes(q)) return false;
      if (status && entry.status !== status) return false;
      if (genre && book.genre !== genre) return false;
      if (tag && !bookTags.includes(tag)) return false;
      return true;
    });

  return NextResponse.json({ items, genres, tags });
}

/** Estante paginada — contrato descrito na Proposta 2:
 * `{ items, nextCursor, total, facets, genres, tags }`. `genres`/`tags`
 * viajam junto (via queries distinct, baratas — não escalam com o tamanho
 * da estante) porque a tela /shelf ainda usa os dois pra montar os chips
 * de filtro; nenhum outro consumidor lê o modo paginado. */
async function getPaginated(uid: string, url: URL) {
  const status = parseStatus(url.searchParams.get("status"));
  const genre = url.searchParams.get("genre");
  const tag = url.searchParams.get("tag");
  const ratingParam = url.searchParams.get("rating");
  const rating = ratingParam !== null ? Number(ratingParam) : null;
  const sort = url.searchParams.get("sort") === "recent" ? "recent" : "title";
  const q = url.searchParams.get("q")?.trim() ?? "";
  const cursor = url.searchParams.get("cursor") || undefined;
  const limitParam = Number(url.searchParams.get("limit"));
  const limit =
    Number.isFinite(limitParam) && limitParam > 0 ? Math.min(Math.floor(limitParam), MAX_LIMIT) : DEFAULT_LIMIT;

  const bookFilter: Prisma.BookWhereInput = {};
  if (genre) bookFilter.genre = genre;
  if (tag) bookFilter.tags = { some: { userId: uid, tag } };
  if (rating !== null && Number.isFinite(rating)) {
    bookFilter.reviews = { some: { userId: uid, rating: { gte: rating } } };
  }
  if (q) {
    bookFilter.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { authors: { contains: q, mode: "insensitive" } },
    ];
  }
  const hasBookFilter = Object.keys(bookFilter).length > 0;

  // Filtros compostos SEM status — base pras facetas (cada faceta mostra
  // "quantos entrariam com este filtro", não o resultado já espremido por
  // um status escolhido) e pro total de gêneros/tags disponíveis.
  const baseWhere: Prisma.ShelfEntryWhereInput = { userId: uid, ...(hasBookFilter ? { book: bookFilter } : {}) };
  const where: Prisma.ShelfEntryWhereInput = status ? { ...baseWhere, status } : baseWhere;

  const orderBy: Prisma.ShelfEntryOrderByWithRelationInput[] =
    sort === "recent" ? [{ updatedAt: "desc" }, { id: "desc" }] : [{ book: { title: "asc" } }, { id: "asc" }];

  const [entries, total, facetRows, genreRows, tagRows] = await Promise.all([
    db.shelfEntry.findMany({
      where,
      orderBy,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { book: true },
    }),
    db.shelfEntry.count({ where }),
    db.shelfEntry.groupBy({ by: ["status"], where: baseWhere, _count: true }),
    db.book.findMany({ where: { shelfEntries: { some: { userId: uid } } }, select: { genre: true }, distinct: ["genre"] }),
    db.bookTag.findMany({ where: { userId: uid }, select: { tag: true }, distinct: ["tag"] }),
  ]);

  const hasMore = entries.length > limit;
  const page = entries.slice(0, limit);
  const bookIds = page.map((e) => e.bookId);

  const [tagsForPage, reviewsForPage, withDonation] = await Promise.all([
    db.bookTag.findMany({ where: { userId: uid, bookId: { in: bookIds } } }),
    db.review.findMany({ where: { userId: uid, bookId: { in: bookIds } }, select: { bookId: true, rating: true } }),
    idsWithDonations(bookIds),
  ]);
  const tagsByBook = new Map<string, string[]>();
  for (const row of tagsForPage) {
    tagsByBook.set(row.bookId, [...(tagsByBook.get(row.bookId) ?? []), row.tag]);
  }
  const ratingByBook = new Map(reviewsForPage.map((r) => [r.bookId, r.rating]));

  const items = page.map((e) => ({
    book: { ...serializeBook(e.book), hasDonation: withDonation.has(e.bookId) },
    entry: {
      status: e.status,
      currentPage: e.currentPage,
      lastPage: e.lastPage,
      startedAt: e.startedAt,
      finishedAt: e.finishedAt,
      abandonedAt: e.abandonedAt,
    },
    tags: (tagsByBook.get(e.bookId) ?? []).sort(),
    rating: ratingByBook.get(e.bookId) ?? null,
  }));

  const facets = { WANT_TO_READ: 0, READING: 0, READ: 0, DNF: 0 } satisfies Record<ShelfStatus, number>;
  for (const row of facetRows) facets[row.status] = row._count;

  return NextResponse.json({
    items,
    nextCursor: hasMore ? page[page.length - 1].id : null,
    total,
    facets,
    genres: genreRows.map((r) => r.genre).sort(),
    tags: tagRows.map((r) => r.tag).sort(),
  });
}
