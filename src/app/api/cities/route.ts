import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { UF_LIST } from "@/lib/uf";

/** Autocomplete de cidades (spec autocomplete de cidades/IBGE) — busca por
 * prefixo na tabela City (seedada do IBGE), não bate em API externa. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const stateParam = searchParams.get("state")?.trim().toUpperCase() ?? "";
  const state = (UF_LIST as readonly string[]).includes(stateParam) ? stateParam : undefined;

  if (!q) return NextResponse.json({ cities: [] });

  const cities = await db.city.findMany({
    where: {
      name: { startsWith: q, mode: "insensitive" },
      state,
    },
    orderBy: { name: "asc" },
    take: 10,
  });

  return NextResponse.json({
    cities: cities.map((c) => ({ name: c.name, state: c.state })),
  });
}
