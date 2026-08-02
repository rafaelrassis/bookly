import { NextResponse } from "next/server";
import { searchGoogleBooks, searchGoogleByIsbn } from "@/lib/books/google";
import { cacheGoogleBooks } from "@/lib/books";
import { searchLocalBooks, rowToBook } from "@/lib/books/local";
import { looksLikeIsbn } from "@/lib/books/isbn";
import { idsWithDonations } from "@/lib/donations-map";
import type { Book } from "@/lib/types";

// Busca depende de query dinâmica — nunca deve ser cacheada (CDN/edge) nem
// ter resposta reaproveitada de uma build anterior.
export const dynamic = "force-dynamic";

const LOCAL_ENOUGH = 5;

/** Busca primeiro no catálogo local (Postgres + pg_trgm — título, autor e
 * ISBN); Google Books só complementa quando o local traz poucos resultados,
 * e os volumes novos são cacheados para o catálogo crescer sozinho.
 * Sem resultados não é erro (200 vazio); Google inacessível com local vazio, sim (502). */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ books: [], more: [] });

  const local = await searchLocalBooks(q).catch((err) => {
    console.error("[books/search] busca local falhou:", err);
    return [];
  });

  let books: Book[] = local.map(rowToBook);
  let more: Book[] = [];

  if (books.length < LOCAL_ENOUGH) {
    try {
      const seen = new Set(books.map((b) => b.id));
      const seenIsbn = new Set(books.map((b) => b.isbn).filter(Boolean));
      const isFresh = (b: Book) => !seen.has(b.id) && !(b.isbn && seenIsbn.has(b.isbn));

      if (looksLikeIsbn(q)) {
        const remote = await searchGoogleByIsbn(q);
        const fresh = remote.filter(isFresh);
        books = [...books, ...fresh];
        void cacheGoogleBooks(fresh);
      } else {
        const remote = await searchGoogleBooks(q);
        const freshBooks = remote.books.filter(isFresh);
        const freshMore = remote.more.filter(isFresh);
        books = [...books, ...freshBooks];
        more = freshMore;
        void cacheGoogleBooks([...freshBooks, ...freshMore]);
      }
    } catch (err) {
      console.error("[books/search] Google Books falhou:", err);
      // local já respondeu: só falha de verdade se não houver nada
      if (books.length === 0) return NextResponse.json({ error: "search_failed" }, { status: 502 });
    }
  }

  const withDonation = await idsWithDonations([...books, ...more].map((b) => b.id));
  const decorate = (b: Book) => ({ ...b, hasDonation: withDonation.has(b.id) });

  return NextResponse.json(
    { books: books.map(decorate), more: more.map(decorate) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
