import { NextResponse } from "next/server";
import { BR_CITIES } from "@/data/br-cities";
import { UF_LIST } from "@/lib/uf";

/** Autocomplete de cidades (spec autocomplete de cidades/IBGE) — busca por
 * prefixo em BR_CITIES (lista estática gerada do IBGE, ver src/data/br-cities.ts),
 * sem tabela no banco nem chamada a API externa. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().toLocaleLowerCase("pt-BR") ?? "";
  const stateParam = searchParams.get("state")?.trim().toUpperCase() ?? "";
  const state = (UF_LIST as readonly string[]).includes(stateParam) ? stateParam : undefined;

  if (!q) return NextResponse.json({ cities: [] });

  const cities = BR_CITIES.filter(
    (c) => c.name.toLocaleLowerCase("pt-BR").startsWith(q) && (!state || c.state === state)
  ).slice(0, 10);

  return NextResponse.json({ cities });
}
