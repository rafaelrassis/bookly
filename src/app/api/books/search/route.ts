import { NextResponse } from "next/server";
import { searchGoogleBooks } from "@/lib/books/google";
import { idsWithDonations } from "@/lib/donations-map";

/** Busca em tempo real no Google Books — sem catálogo/mock de fallback.
 * Sem resultados não é erro (200 vazio); Google inacessível, sim (502). */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ books: [] });

  try {
    const books = await searchGoogleBooks(q);
    const withDonation = await idsWithDonations(books.map((b) => b.id));
    return NextResponse.json({
      books: books.map((b) => ({ ...b, hasDonation: withDonation.has(b.id) })),
    });
  } catch (err) {
    console.error("[books/search] Google Books falhou:", err);
    return NextResponse.json({ error: "search_failed" }, { status: 502 });
  }
}
