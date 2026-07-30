import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseYear } from "@/lib/date-range";
import { getYearStats } from "@/lib/stats";

/** "Seu {ano} em livros" do usuário logado. Lógica de cálculo em
 * getYearStats() (@/lib/stats), reaproveitada por
 * /api/users/[username]/stats/[year] (perfil público + card compartilhável). */
export async function GET(_req: Request, { params }: { params: { year: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const year = parseYear(params.year);
  if (year === null) return NextResponse.json({ error: "ano inválido" }, { status: 400 });

  const stats = await getYearStats(session.user.id, year);
  return NextResponse.json(stats);
}
