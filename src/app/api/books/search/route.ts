import { NextResponse } from "next/server";
import { searchGoogleBooks } from "@/lib/books/google";

/** Busca em tempo real no Google Books — sem catálogo/mock de fallback.
 * Sem resultados não é erro (200 vazio); Google inacessível, sim (502). */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ books: [] });

  try {
    return NextResponse.json({ books: await searchGoogleBooks(q) });
  } catch (err) {
    console.error("[books/search] Google Books falhou:", err);
    return NextResponse.json({ error: "search_failed" }, { status: 502 });
  }
}
