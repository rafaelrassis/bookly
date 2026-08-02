import { db } from "@/lib/db";
import { looksLikeIsbn, normalizeIsbn, isbn10to13 } from "./isbn";
import type { Book } from "@/lib/types";

export type LocalBookRow = {
  id: string;
  title: string;
  authors: string;
  year: number;
  pages: number;
  genre: string;
  gradientFrom: string;
  gradientTo: string;
  synopsis: string;
  coverUrl: string | null;
  isbn: string | null;
  isbn10: string | null;
  avg: number;
  count: number;
  score: number;
};

const SIMILARITY_THRESHOLD = 0.25;

/** Busca exata por ISBN (aceita com ou sem hífen, ISBN-10 ou 13). */
async function searchByIsbn(q: string): Promise<LocalBookRow[]> {
  const n = normalizeIsbn(q);
  const alt = n.length === 10 ? isbn10to13(n) : null;
  return db.$queryRaw<LocalBookRow[]>`
    SELECT b.*, 1.0::float AS score
    FROM "Book" b
    WHERE b."isbn" = ${n} OR b."isbn10" = ${n}
       OR (${alt}::text IS NOT NULL AND b."isbn" = ${alt})
    LIMIT 5
  `;
}

/**
 * Busca fuzzy por título + autor. `%` usa o índice GIN trigram (tolera typo e
 * acento); o ILIKE cobre substring curta que o trigram descarta (ex.: "duna").
 * Ordena por similaridade e desempata por popularidade local.
 *
 * `SET LOCAL` só tem efeito garantido dentro da mesma transação/conexão da
 * query seguinte (com pgbouncer em transaction mode, cada statement solto
 * pode cair em conexões diferentes) — por isso as duas chamadas vão juntas
 * num `db.$transaction`.
 */
async function searchByText(term: string, limit: number): Promise<LocalBookRow[]> {
  return db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL pg_trgm.similarity_threshold = ${SIMILARITY_THRESHOLD}`);
    return tx.$queryRaw<LocalBookRow[]>`
      WITH needle AS (SELECT lower(f_unaccent(${term})) AS t)
      SELECT b.*, similarity(b."searchText", n.t) AS score
      FROM "Book" b, needle n
      WHERE b."searchText" % n.t
         OR b."searchText" LIKE '%' || n.t || '%'
      ORDER BY
        (b."searchText" LIKE '%' || n.t || '%') DESC,
        similarity(b."searchText", n.t) DESC,
        b."count" DESC
      LIMIT ${limit}
    `;
  });
}

export async function searchLocalBooks(q: string, limit = 20): Promise<LocalBookRow[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  if (looksLikeIsbn(term)) return searchByIsbn(term);
  return searchByText(term, limit);
}

export function rowToBook(row: LocalBookRow): Book {
  return {
    id: row.id,
    title: row.title,
    authors: row.authors,
    year: row.year,
    pages: row.pages,
    genre: row.genre,
    gradient: [row.gradientFrom, row.gradientTo],
    avg: row.avg,
    count: row.count,
    synopsis: row.synopsis,
    coverUrl: row.coverUrl ?? undefined,
    isbn: row.isbn ?? undefined,
    isbn10: row.isbn10 ?? undefined,
  };
}
