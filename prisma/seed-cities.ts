/**
 * Popula a tabela City com os municípios do IBGE (spec autocomplete de
 * cidades). Roda uma vez manualmente (`npx tsx prisma/seed-cities.ts`),
 * idempotente por ibgeCode — não faz parte do build/CI (ver guard
 * scripts/assert-no-seed.ts: dado de referência, não dado de app/demo).
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const IBGE_URL = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios";

type Municipio = {
  id: number;
  nome: string;
  microrregiao: { mesorregiao: { UF: { sigla: string } } } | null;
  "regiao-imediata": { "regiao-intermediaria": { UF: { sigla: string } } };
};

/** Alguns municípios (raro — 1 caso em ~5.570 hoje) vêm com microrregiao
 * nula na API do IBGE; regiao-imediata.regiao-intermediaria.UF cobre o
 * mesmo dado por um caminho diferente da árvore territorial. */
function ufOf(m: Municipio): string {
  return m.microrregiao?.mesorregiao.UF.sigla ?? m["regiao-imediata"]["regiao-intermediaria"].UF.sigla;
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter });

  try {
    console.log("Buscando municípios do IBGE...");
    const res = await fetch(IBGE_URL);
    if (!res.ok) throw new Error(`IBGE respondeu ${res.status}`);
    const municipios: Municipio[] = await res.json();
    console.log(`${municipios.length} municípios recebidos, gravando...`);

    let count = 0;
    for (const m of municipios) {
      const state = ufOf(m);
      await db.city.upsert({
        where: { ibgeCode: String(m.id) },
        update: { name: m.nome, state },
        create: { ibgeCode: String(m.id), name: m.nome, state },
      });
      count++;
    }
    console.log(`✅ ${count} municípios gravados.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
