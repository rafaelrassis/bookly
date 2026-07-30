import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseYear } from "@/lib/date-range";
import { getYearStats } from "@/lib/stats";

/** "Seu {ano} em livros" público, por username — usado pelo card de estante
 * compartilhável (/u/[username]/ano/[year]). Sem auth: a página e a imagem
 * OG precisam ser buscáveis por crawler de link preview (WhatsApp/Twitter),
 * que nunca tem sessão. */
export async function GET(
  _req: Request,
  { params }: { params: { username: string; year: string } }
) {
  const target = await db.user.findUnique({
    where: { username: params.username },
    select: { id: true },
  });
  if (!target) return NextResponse.json({ error: "não encontrado" }, { status: 404 });

  const year = parseYear(params.year);
  if (year === null) return NextResponse.json({ error: "ano inválido" }, { status: 400 });

  const stats = await getYearStats(target.id, year);
  return NextResponse.json(stats);
}
